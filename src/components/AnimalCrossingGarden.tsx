import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  GestureResponderEvent,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AvatarId, HarvestedCrop, PetId, Plant, Seed } from '../types';
import { getAvatarDefinition } from '../data/avatarData';
import { getPetDefinition } from '../data/petData';
import { PetCharacter } from './PetCharacter';
import { PlayerCharacter } from './PlayerCharacter';

interface AnimalCrossingGardenProps {
  plants: Plant[];
  seeds: Seed[];
  harvestedCrops: HarvestedCrop[];
  farmerName: string;
  farmName: string;
  money: number;
  ownedBuildings: string[];
  avatarId: AvatarId;
  petId: PetId;
  initialDpadScale: number;
  initialMenuButtonScale: number;
  onWater: (plantId: string) => void;
  onSun: (plantId: string) => void;
  onHarvest: (plant: Plant) => void;
  onPlantSeed: (seed: Seed, plotIndex: number) => void;
  onGoExplore: () => void;
  onGoEncyclopedia: () => void;
  onSellHarvestedCrop: (crop: HarvestedCrop) => void;
  onBuySeed: (seed: Seed, price: number) => void;
  onBuyBuilding: (buildingId: string, buildingName: string, price: number) => void;
  onChangeCharacter: () => void;
  onChangePet: () => void;
  onChangeFarmName: (farmName: string) => Promise<void>;
  onControlSettingsChange: (settings: {
    dpadScale: number;
    menuButtonScale: number;
  }) => Promise<void>;
  onLogout: () => Promise<void>;
}

interface MapPoint {
  x: number;
  y: number;
}

interface Plot extends MapPoint {
  id: number;
  label: string;
}

const PLOTS: Plot[] = [
  { id: 0, x: 24, y: 48, label: '1번 밭' },
  { id: 1, x: 76, y: 48, label: '2번 밭' },
  { id: 2, x: 24, y: 72, label: '3번 밭' },
  { id: 3, x: 76, y: 72, label: '4번 밭' },
];

const SHOP = { x: 82, y: 31, emoji: '🏪', label: '상점' };
const SHOP_SEEDS: Array<{ seed: Seed; price: number }> = [
  { seed: { id: 'shop_carrot', name: '당근 씨앗', region: '전국', emoji: '🥕', description: '상점에서 구매한 튼튼한 당근 씨앗' }, price: 150 },
  { seed: { id: 'shop_tomato', name: '토마토 씨앗', region: '전국', emoji: '🍅', description: '상점에서 구매한 새콤달콤 토마토 씨앗' }, price: 200 },
  { seed: { id: 'shop_corn', name: '옥수수 씨앗', region: '강원', emoji: '🌽', description: '상점에서 구매한 고소한 옥수수 씨앗' }, price: 250 },
];
const SHOP_BUILDINGS = [
  { id: 'storage_shed', name: '씨앗 창고', emoji: '🏚️', description: '씨앗을 보관하는 아담한 창고', price: 600 },
  { id: 'greenhouse', name: '작은 온실', emoji: '🏡', description: '작물을 따뜻하게 키우는 유리 온실', price: 900 },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);
type MovingTarget = { type: 'plot'; id: number } | { type: 'shop' } | null;
type DraggableTarget = NonNullable<MovingTarget>;
type DragStart = {
  target: DraggableTarget;
  pageX: number;
  pageY: number;
  position: MapPoint;
} | null;
const MIN_DPAD_SCALE = 0.7;
const MAX_DPAD_SCALE = 1.4;
const MIN_MENU_BUTTON_SCALE = 0.7;
const MAX_MENU_BUTTON_SCALE = 1.4;

const createPlotLabelFromSeed = (seed: Seed) => {
  const seedBase = seed.name.replace(/\s*씨앗$/, '').trim();
  return `${seedBase || '특산'} 밭`;
};

export const AnimalCrossingGarden: React.FC<AnimalCrossingGardenProps> = ({
  plants,
  seeds,
  harvestedCrops,
  farmerName,
  farmName,
  money,
  ownedBuildings,
  avatarId,
  petId,
  initialDpadScale,
  initialMenuButtonScale,
  onWater,
  onSun,
  onHarvest,
  onPlantSeed,
  onGoExplore,
  onGoEncyclopedia,
  onSellHarvestedCrop,
  onBuySeed,
  onBuyBuilding,
  onChangeCharacter,
  onChangePet,
  onChangeFarmName,
  onControlSettingsChange,
  onLogout,
}) => {
  const { height } = useWindowDimensions();
  const [charPos, setCharPos] = useState<MapPoint>({ x: 50, y: 78 });
  const [petPos, setPetPos] = useState<MapPoint>({ x: 45.5, y: 80 });
  const previousCharPosRef = useRef<MapPoint>({ x: 50, y: 78 });
  const [direction, setDirection] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [isWalking, setIsWalking] = useState(false);
  const [bagVisible, setBagVisible] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dpadScale, setDpadScale] = useState(initialDpadScale);
  const [dpadSliderWidth, setDpadSliderWidth] = useState(0);
  const [menuButtonScale, setMenuButtonScale] = useState(initialMenuButtonScale);
  const [menuButtonSliderWidth, setMenuButtonSliderWidth] = useState(0);
  const dpadScaleRef = useRef(initialDpadScale);
  const menuButtonScaleRef = useRef(initialMenuButtonScale);
  const [farmNameDraft, setFarmNameDraft] = useState(farmName);
  const [savingFarmName, setSavingFarmName] = useState(false);
  const [movingTarget, setMovingTarget] = useState<MovingTarget>(null);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [plotPositions, setPlotPositions] = useState<Record<number, MapPoint>>(
    () =>
      PLOTS.reduce<Record<number, MapPoint>>((acc, plot) => {
        acc[plot.id] = { x: plot.x, y: plot.y };
        return acc;
      }, {})
  );
  const [plotLabels, setPlotLabels] = useState<Record<number, string>>({});
  const [shopPosition, setShopPosition] = useState<MapPoint>({
    x: SHOP.x,
    y: SHOP.y,
  });
  const dragStartRef = useRef<DragStart>(null);
  const [floatingEffect, setFloatingEffect] = useState<{ text: string; x: number; y: number } | null>(null);

  const mapMinHeight = Math.max(540, height - 150);
  const placedPlots = PLOTS.map((plot) => ({
    ...plot,
    ...(plotPositions[plot.id] ?? { x: plot.x, y: plot.y }),
  }));
  const nearbyPlotIndex = placedPlots.findIndex((plot) => distance(plot, charPos) < 11);
  const nearbyPlot = nearbyPlotIndex >= 0 ? placedPlots[nearbyPlotIndex] : null;
  const currentPlantInPlot = nearbyPlotIndex >= 0 ? plants[nearbyPlotIndex] : null;
  const isNearShop = distance(shopPosition, charPos) < 10;
  const dpadButtonSize = Math.round(39 * dpadScale);
  const dpadCenterSize = Math.round(38 * dpadScale);
  const dpadIconSize = Math.round(20 * dpadScale);
  const dpadScalePercent = Math.round(dpadScale * 100);
  const dpadSliderPercent =
    ((dpadScale - MIN_DPAD_SCALE) / (MAX_DPAD_SCALE - MIN_DPAD_SCALE)) * 100;
  const menuButtonWidth = Math.round(102 * menuButtonScale);
  const menuButtonHeight = Math.round(50 * menuButtonScale);
  const menuActionHeight = Math.round(56 * menuButtonScale);
  const menuButtonIconSize = Math.round(19 * menuButtonScale);
  const menuButtonFontSize = Math.round(12 * menuButtonScale);
  const menuButtonScalePercent = Math.round(menuButtonScale * 100);
  const menuButtonSliderPercent =
    ((menuButtonScale - MIN_MENU_BUTTON_SCALE) /
      (MAX_MENU_BUTTON_SCALE - MIN_MENU_BUTTON_SCALE)) *
    100;
  const menuButtonStyle = {
    minWidth: menuButtonWidth,
    height: menuButtonHeight,
    gap: Math.max(4, Math.round(6 * menuButtonScale)),
  };
  const menuButtonTextStyle = { fontSize: menuButtonFontSize };
  const isFemaleAvatar = avatarId.startsWith('female_');
  const avatarTravelStyle = avatarId.split('_')[1] as 'nature' | 'culture' | 'activity';
  const avatarTheme = {
    nature: { shirt: '#F2E3A4', overall: '#3E7750', icon: 'leaf' as const },
    culture: { shirt: '#F4D0A1', overall: '#A86632', icon: 'book' as const },
    activity: { shirt: '#D7E7ED', overall: '#39739D', icon: 'compass' as const },
  }[avatarTravelStyle];
  const avatarDefinition = getAvatarDefinition(avatarId);
  const petDefinition = getPetDefinition(petId);

  useEffect(() => {
    const followTarget = previousCharPosRef.current;
    previousCharPosRef.current = charPos;
    const timer = setTimeout(() => setPetPos(followTarget), 170);
    return () => clearTimeout(timer);
  }, [charPos]);

  useEffect(() => {
    setDpadScale(initialDpadScale);
    dpadScaleRef.current = initialDpadScale;
  }, [initialDpadScale]);

  useEffect(() => {
    setMenuButtonScale(initialMenuButtonScale);
    menuButtonScaleRef.current = initialMenuButtonScale;
  }, [initialMenuButtonScale]);

  useEffect(() => setFarmNameDraft(farmName), [farmName]);

  const updateDpadScaleFromSlider = (event: GestureResponderEvent) => {
    if (dpadSliderWidth <= 0) {
      return;
    }
    const ratio = clamp(event.nativeEvent.locationX / dpadSliderWidth, 0, 1);
    const nextScale = MIN_DPAD_SCALE + ratio * (MAX_DPAD_SCALE - MIN_DPAD_SCALE);
    const roundedScale = Math.round(nextScale * 100) / 100;
    dpadScaleRef.current = roundedScale;
    setDpadScale(roundedScale);
  };

  const updateMenuButtonScaleFromSlider = (event: GestureResponderEvent) => {
    if (menuButtonSliderWidth <= 0) {
      return;
    }
    const ratio = clamp(event.nativeEvent.locationX / menuButtonSliderWidth, 0, 1);
    const nextScale =
      MIN_MENU_BUTTON_SCALE + ratio * (MAX_MENU_BUTTON_SCALE - MIN_MENU_BUTTON_SCALE);
    const roundedScale = Math.round(nextScale * 100) / 100;
    menuButtonScaleRef.current = roundedScale;
    setMenuButtonScale(roundedScale);
  };

  const saveControlSettings = async () => {
    try {
      await onControlSettingsChange({
        dpadScale: dpadScaleRef.current,
        menuButtonScale: menuButtonScaleRef.current,
      });
    } catch (error) {
      console.warn('Control settings save error:', error);
      Alert.alert('설정 저장 실패', '인터넷 연결을 확인하고 다시 시도해주세요.');
    }
  };

  const handleSaveFarmName = async () => {
    if (savingFarmName) return;
    const nextName = farmNameDraft.trim();
    if (!nextName) {
      Alert.alert('농장 이름', '농장 이름을 입력해주세요.');
      return;
    }
    setSavingFarmName(true);
    try {
      await onChangeFarmName(nextName);
    } catch (error) {
      const message = error instanceof Error ? error.message : '농장 이름을 저장하지 못했습니다.';
      Alert.alert('농장 이름 저장 실패', message);
    } finally {
      setSavingFarmName(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
      setSettingsVisible(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그아웃 중 문제가 발생했습니다.';
      Alert.alert('로그아웃 실패', message);
    } finally {
      setLoggingOut(false);
    }
  };

  const moveCharacter = (dx: number, dy: number, dir: 'down' | 'up' | 'left' | 'right') => {
    setDirection(dir);
    setIsWalking(true);
    setTimeout(() => setIsWalking(false), 130);

    setCharPos((prev) => ({
      x: clamp(prev.x + dx, 12, 88),
      y: clamp(prev.y + dy, 17, 86),
    }));
  };

  const handleMapLayout = (event: LayoutChangeEvent) => {
    const { width, height: nextHeight } = event.nativeEvent.layout;
    setMapSize({ width, height: nextHeight });
  };

  const getPositionFromDrag = (event: GestureResponderEvent, dragStart: DragStart) => {
    if (!dragStart || mapSize.width <= 0 || mapSize.height <= 0) {
      return null;
    }

    const deltaX = ((event.nativeEvent.pageX - dragStart.pageX) / mapSize.width) * 100;
    const deltaY = ((event.nativeEvent.pageY - dragStart.pageY) / mapSize.height) * 100;
    return {
      x: clamp(dragStart.position.x + deltaX, 10, 90),
      y: clamp(dragStart.position.y + deltaY, 13, 88),
    };
  };

  const startDraggingTarget = (
    event: GestureResponderEvent,
    target: DraggableTarget,
    position: MapPoint,
    label: string
  ) => {
    event.stopPropagation();
    dragStartRef.current = {
      target,
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
      position,
    };
    setMovingTarget(target);
    triggerEffect(`${label} 이동 중`, position.x, position.y - 7);
  };

  const finishDraggingTarget = (event: GestureResponderEvent) => {
    const dragStart = dragStartRef.current;
    if (!dragStart) {
      return;
    }

    event.stopPropagation();
    const nextPosition = getPositionFromDrag(event, dragStart);
    dragStartRef.current = null;
    setMovingTarget(null);
    if (!nextPosition) {
      return;
    }

    const target = dragStart.target;
    if (target.type === 'shop') {
      setShopPosition(nextPosition);
      triggerEffect('상점 이동 완료', nextPosition.x, nextPosition.y - 7);
    } else {
      setPlotPositions((prev) => ({
        ...prev,
        [target.id]: nextPosition,
      }));
      triggerEffect('밭 이동 완료', nextPosition.x, nextPosition.y - 7);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 4.5;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        moveCharacter(0, -step, 'up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        moveCharacter(0, step, 'down');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveCharacter(-step, 0, 'left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveCharacter(step, 0, 'right');
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);


  const triggerEffect = (text: string, x = charPos.x, y = charPos.y) => {
    setFloatingEffect({ text, x, y });
    setTimeout(() => setFloatingEffect(null), 1050);
  };

  const handleControlPress = (event: GestureResponderEvent, action: () => void) => {
    event.stopPropagation();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.focus();
    }
    action();
  };

  const handlePlantSeed = () => {
    if (!nearbyPlot) {
      return;
    }
    if (seeds.length === 0) {
      Alert.alert('씨앗 부족', '로컬 탐험에서 관광지를 방문해 새 씨앗을 얻어오세요.');
      return;
    }

    onPlantSeed(seeds[0], nearbyPlot.id);
    setPlotLabels((prev) => ({
      ...prev,
      [nearbyPlot.id]: createPlotLabelFromSeed(seeds[0]),
    }));
    triggerEffect('씨앗 심기 완료', nearbyPlot.x, nearbyPlot.y - 8);
  };

  const renderCropEmoji = (crop: Plant) => {
    if (crop.growthStage === 0) return '🌱';
    if (crop.growthStage === 1) return '🌿';
    if (crop.growthStage === 2) return '🌷';
    return crop.emoji;
  };

  const renderActionButton = () => {
    if (nearbyPlot && currentPlantInPlot) {
      if (currentPlantInPlot.growthStage >= 4) {
        return (
          <Pressable
            style={styles.primaryActionButton}
            onPress={(event) => handleControlPress(event, () => onHarvest(currentPlantInPlot))}
          >
            <MaterialCommunityIcons name="basket" size={18} color="#FFF7D6" />
            <Text style={styles.actionButtonText}>수확</Text>
          </Pressable>
        );
      }

      return (
        <>
          <Pressable
            style={[styles.squareActionButton, styles.waterButton]}
            onPress={(event) =>
              handleControlPress(event, () => {
                onWater(currentPlantInPlot.id);
                triggerEffect('수분 +25%', charPos.x, charPos.y - 7);
              })
            }
          >
            <Ionicons name="water" size={18} color="#EAF7FF" />
            <Text style={styles.actionButtonText}>물</Text>
          </Pressable>
          <Pressable
            style={[styles.squareActionButton, styles.sunButton]}
            onPress={(event) =>
              handleControlPress(event, () => {
                onSun(currentPlantInPlot.id);
                triggerEffect('햇빛 +25%', charPos.x, charPos.y - 7);
              })
            }
          >
            <Ionicons name="sunny" size={18} color="#FFF7D6" />
            <Text style={styles.actionButtonText}>햇빛</Text>
          </Pressable>
        </>
      );
    }

    if (nearbyPlot) {
      return (
        <Pressable
          style={[
            styles.primaryActionButton,
            { minWidth: menuButtonWidth, height: menuActionHeight },
          ]}
          onPress={(event) => handleControlPress(event, handlePlantSeed)}
        >
          <Ionicons name="leaf" size={menuButtonIconSize} color="#FFF7D6" />
          <Text style={[styles.actionButtonText, menuButtonTextStyle]}>심기</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={[
          styles.primaryActionButton,
          { minWidth: menuButtonWidth, height: menuActionHeight },
        ]}
        onPress={(event) => handleControlPress(event, onGoExplore)}
      >
        <Ionicons name="compass" size={menuButtonIconSize} color="#FFF7D6" />
        <Text style={[styles.actionButtonText, menuButtonTextStyle]}>탐험</Text>
      </Pressable>
    );
  };

  const renderBagItem = (item: Seed | HarvestedCrop, type: 'seed' | 'crop') => (
    <View key={`${type}-${item.id}`} style={styles.bagItem}>
      <View style={styles.bagItemIcon}>
        <Text style={styles.bagItemEmoji}>{item.emoji}</Text>
      </View>
      <View style={styles.bagItemCopy}>
        <Text style={styles.bagItemName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.bagItemMeta}>
          {item.region} · {type === 'seed' ? '씨앗' : '수확물'}
        </Text>
      </View>
    </View>
  );

  const renderShopCrop = (crop: HarvestedCrop) => (
    <View key={`shop-${crop.id}`} style={styles.shopCropItem}>
      <View style={styles.bagItemIcon}>
        <Text style={styles.bagItemEmoji}>{crop.emoji}</Text>
      </View>
      <View style={styles.bagItemCopy}>
        <Text style={styles.bagItemName} numberOfLines={1}>
          {crop.name}
        </Text>
        <Text style={styles.bagItemMeta}>{crop.region} 특산 수확물</Text>
      </View>
      <Pressable
        style={styles.sellButton}
        onPress={() => onSellHarvestedCrop(crop)}
      >
        <Text style={styles.sellButtonText}>120G 판매</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.mapCanvas, { minHeight: mapMinHeight }]}
        onLayout={handleMapLayout}
      >
        {/* === 상단 및 측면 울창한 숲 캐노피 (Dense Forest Wall & Borders) === */}
        <View style={styles.topForestCanopy} pointerEvents="none">
          <View style={[styles.treeCrown, { backgroundColor: '#21421A', width: 70, height: 70, left: -10, top: -15 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#2D5924', width: 85, height: 85, left: 35, top: -25 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#386D2D', width: 75, height: 75, left: 100, top: -20 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#264D1F', width: 90, height: 90, left: 155, top: -30 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#336329', width: 80, height: 80, left: 225, top: -22 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#2A5422', width: 85, height: 85, left: 290, top: -26 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#3B7330', width: 78, height: 78, left: 355, top: -20 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#22451C', width: 85, height: 85, left: 415, top: -25 }]} />
        </View>

        {/* 좌/우 측면 숲 라인 (Side Dense Forest Borders) */}
        <View style={styles.leftTreeBorder} pointerEvents="none">
          <View style={[styles.treeCrown, { backgroundColor: '#2B5723', width: 68, height: 68, top: 0, left: -25 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#3A702F', width: 74, height: 74, top: 50, left: -30 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#244B1D', width: 70, height: 70, top: 110, left: -26 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#326328', width: 76, height: 76, top: 170, left: -30 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#275020', width: 72, height: 72, top: 230, left: -25 }]} />
        </View>

        <View style={styles.rightTreeBorder} pointerEvents="none">
          <View style={[styles.treeCrown, { backgroundColor: '#2A5522', width: 68, height: 68, top: 0, right: -25 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#3B7330', width: 74, height: 74, top: 50, right: -30 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#23481C', width: 70, height: 70, top: 110, right: -26 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#316127', width: 76, height: 76, top: 170, right: -30 }]} />
          <View style={[styles.treeCrown, { backgroundColor: '#264E1F', width: 72, height: 72, top: 230, right: -25 }]} />
        </View>

        {/* === 상단 건물 마당 흙바닥 (Upper Dirt Courtyard) === */}
        <View style={styles.dirtCourtyard} pointerEvents="none" />

        {/* === 스타듀밸리 조약돌/흙길 산책로 (Cobblestone Paths) === */}
        <View style={styles.horizontalPath} pointerEvents="none">
          <View style={styles.pathBorderTop} />
          <View style={styles.pathBorderBottom} />
          <View style={styles.pathStonesRow}>
            <View style={styles.cobbleDot} />
            <View style={[styles.cobbleDot, styles.cobbleDotAlt]} />
            <View style={styles.cobbleDot} />
            <View style={[styles.cobbleDot, styles.cobbleDotAlt]} />
            <View style={styles.cobbleDot} />
            <View style={[styles.cobbleDot, styles.cobbleDotAlt]} />
          </View>
        </View>
        <View style={styles.verticalPath} pointerEvents="none">
          <View style={styles.pathBorderLeft} />
          <View style={styles.pathBorderRight} />
          <View style={styles.verticalStonesCol}>
            <View style={styles.cobbleDot} />
            <View style={[styles.cobbleDot, styles.cobbleDotAlt]} />
            <View style={styles.cobbleDot} />
            <View style={[styles.cobbleDot, styles.cobbleDotAlt]} />
            <View style={styles.cobbleDot} />
          </View>
        </View>

        {/* === 목책 울타리 라인 (Rustic Farm Fences) === */}
        <View style={styles.fenceSectionLeft} pointerEvents="none">
          <View style={styles.fencePost} />
          <View style={styles.fenceRails} />
          <View style={styles.fencePost} />
          <View style={styles.fenceRails} />
          <View style={styles.fencePost} />
        </View>
        <View style={styles.fenceSectionRight} pointerEvents="none">
          <View style={styles.fencePost} />
          <View style={styles.fenceRails} />
          <View style={styles.fencePost} />
          <View style={styles.fenceRails} />
          <View style={styles.fencePost} />
        </View>

        {/* === 좌측: 빨간 목재 헛간 / 축사 (Wood Barn) === */}
        <View style={styles.barnContainer} pointerEvents="none">
          <View style={styles.barnRoof}>
            <View style={styles.barnRoofRidge} />
          </View>
          <View style={styles.barnBody}>
            {/* 건초 다락 창문 */}
            <View style={styles.hayLoftWindow}>
              <View style={styles.hayStraw} />
            </View>
            {/* 헛간 미닫이문 */}
            <View style={styles.barnDoor}>
              <View style={styles.barnDoorPlank} />
            </View>
          </View>
          <View style={styles.barnBase} />
        </View>

        {/* === 중앙: 스타듀밸리 농가 오두막 (Main Farmhouse Cabin) === */}
        <View style={styles.farmHouseContainer} pointerEvents="none">
          {/* 굴뚝 & 모락모락 연기 */}
          <View style={styles.chimney}>
            <View style={styles.smokePuff1} />
            <View style={styles.smokePuff2} />
          </View>

          {/* 지붕 (Red Terracotta Shingle Roof) */}
          <View style={styles.houseRoof}>
            <View style={styles.roofTileRow}>
              <View style={styles.roofTile} />
              <View style={styles.roofTile} />
              <View style={styles.roofTile} />
              <View style={styles.roofTile} />
              <View style={styles.roofTile} />
            </View>
            <View style={styles.atticWindow}>
              <View style={styles.atticGlass} />
            </View>
          </View>
          <View style={styles.roofEaves} />

          {/* 오두막 원목 벽체 (Timber Walls) */}
          <View style={styles.houseBody}>
            {/* 좌측 창문 */}
            <View style={styles.houseWindow}>
              <View style={styles.windowShutterLeft} />
              <View style={styles.windowGlass} />
              <View style={styles.windowShutterRight} />
            </View>

            {/* 원목 현관문 */}
            <View style={styles.houseDoor}>
              <View style={styles.doorKnocker} />
            </View>

            {/* 우측 창문 */}
            <View style={styles.houseWindow}>
              <View style={styles.windowShutterLeft} />
              <View style={styles.windowGlass} />
              <View style={styles.windowShutterRight} />
            </View>
          </View>

          {/* 현관 데크 테라스 & 계단 */}
          <View style={styles.housePorch}>
            <View style={styles.porchStep1} />
            <View style={styles.porchStep2} />
          </View>
        </View>

        {/* === 우측: 유리 온실 & 가공 창고 (Stone Greenhouse & Workshop) === */}
        <View style={styles.greenhouseContainer} pointerEvents="none">
          <View style={styles.greenhouseRoof}>
            <View style={styles.glassPaneRow}>
              <View style={styles.glassPane} />
              <View style={styles.glassPane} />
              <View style={styles.glassPane} />
            </View>
          </View>
          <View style={styles.greenhouseBody}>
            <View style={styles.greenhouseWindow} />
            <View style={styles.greenhouseDoor} />
          </View>
          <View style={styles.greenhouseBase} />
        </View>


        {placedPlots.map((plot, index) => {
          const crop = plants[index];
          const isTargeted = nearbyPlotIndex === index;
          const isHarvestReady = Boolean(crop && crop.growthStage >= 4);
          const plotLabel = crop
            ? `${crop.name} 밭`
            : plotLabels[plot.id] ?? plot.label;

          return (
            <Pressable
              key={plot.id}
              style={[
                styles.plotBox,
                { left: `${plot.x}%`, top: `${plot.y}%` },
                isTargeted && styles.plotBoxTargeted,
                movingTarget?.type === 'plot' && movingTarget.id === plot.id && styles.movingTarget,
              ]}
              onLongPress={(event) =>
                startDraggingTarget(event, { type: 'plot', id: plot.id }, plot, plotLabel)
              }
              onPressOut={finishDraggingTarget}
              onPress={(event) => {
                event.stopPropagation();
              }}
            >
              <View style={styles.dirtPatch}>
                <View style={styles.soilRow} />
                <View style={[styles.soilRow, styles.soilRowMiddle]} />
                <View style={[styles.soilRow, styles.soilRowBottom]} />
                {crop ? (
                  <View style={styles.cropDisplay}>
                    <Text style={[styles.cropEmoji, isHarvestReady && styles.cropReady]}>{renderCropEmoji(crop)}</Text>
                    <Text style={styles.cropName} numberOfLines={1}>
                      {crop.name}
                    </Text>
                    <View style={styles.meterTrack}>
                      <View style={[styles.waterMeter, { width: `${crop.waterProgress}%` }]} />
                    </View>
                    <View style={styles.meterTrack}>
                      <View style={[styles.sunMeter, { width: `${crop.sunProgress}%` }]} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyPlot}>
                    <Ionicons name="add" size={18} color="#F5D39A" />
                    <Text style={styles.emptyPlotText}>빈 밭</Text>
                  </View>
                )}
              </View>
              <View style={styles.plotLabelPill}>
                <Text style={styles.plotLabelText}>{plotLabel}</Text>
              </View>
            </Pressable>
          );
        })}

        <View
          style={[
            styles.characterSprite,
            { left: `${charPos.x}%`, top: `${charPos.y}%` },
          ]}
        >
          <PlayerCharacter
            avatarId={avatarId}
            size={52}
            direction={direction}
            isWalking={isWalking}
          />
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.petSprite,
            { left: `${petPos.x}%`, top: `${petPos.y}%` },
            isWalking && styles.petWalking,
            direction === 'left' && styles.petFacingLeft,
          ]}
        >
          <View style={styles.petShadow} />
          <PetCharacter petId={petId} size={43} />
          <View style={styles.petNameTag}><Text style={styles.petNameTagText}>{petDefinition.name}</Text></View>
        </View>

        {floatingEffect && (
          <View style={[styles.floatingTag, { left: `${floatingEffect.x}%`, top: `${floatingEffect.y}%` }]}>
            <Text style={styles.floatingTagText}>{floatingEffect.text}</Text>
          </View>
        )}

        <View style={styles.topHud} pointerEvents="box-none">
          <View style={styles.topLeftCluster}>
            <View style={styles.locationPill}>
              <Ionicons name="leaf" size={15} color="#F3F7D5" />
              <Text style={styles.locationText}>{farmName}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.headerShopButton}
              onPress={(event) => handleControlPress(event, () => setShopVisible(true))}
            >
              <Ionicons name="storefront" size={16} color="#FFF7D6" />
              <Text style={styles.headerShopButtonText}>상점</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statCluster}>
            <Text style={styles.statText}>{money}G</Text>
            <Text style={styles.statText}>씨앗 {seeds.length}</Text>
            <Text style={styles.statText}>작물 {plants.length}</Text>
          </View>
        </View>

        <View style={styles.bottomHud} pointerEvents="box-none">
          <View
            style={[
              styles.dpad,
              { width: 122 * dpadScale, height: 122 * dpadScale },
            ]}
          >
            <Pressable
              style={[
                styles.dpadBtn,
                styles.dpadUp,
                { width: dpadButtonSize, height: dpadButtonSize },
              ]}
              onPress={(event) => handleControlPress(event, () => moveCharacter(0, -4.5, 'up'))}
            >
              <Ionicons name="chevron-up" size={dpadIconSize} color="#FFF7D6" />
            </Pressable>
            <View style={styles.dpadMid}>
              <Pressable
                style={[styles.dpadBtn, { width: dpadButtonSize, height: dpadButtonSize }]}
                onPress={(event) => handleControlPress(event, () => moveCharacter(-4.5, 0, 'left'))}
              >
                <Ionicons name="chevron-back" size={dpadIconSize} color="#FFF7D6" />
              </Pressable>
              <View
                style={[
                  styles.dpadCenter,
                  { width: dpadCenterSize, height: dpadCenterSize },
                ]}
              >
                <Text style={[styles.dpadCenterText, { fontSize: 8 * dpadScale }]}>MOVE</Text>
              </View>
              <Pressable
                style={[styles.dpadBtn, { width: dpadButtonSize, height: dpadButtonSize }]}
                onPress={(event) => handleControlPress(event, () => moveCharacter(4.5, 0, 'right'))}
              >
                <Ionicons name="chevron-forward" size={dpadIconSize} color="#FFF7D6" />
              </Pressable>
            </View>
            <Pressable
              style={[
                styles.dpadBtn,
                styles.dpadDown,
                { width: dpadButtonSize, height: dpadButtonSize },
              ]}
              onPress={(event) => handleControlPress(event, () => moveCharacter(0, 4.5, 'down'))}
            >
              <Ionicons name="chevron-down" size={dpadIconSize} color="#FFF7D6" />
            </Pressable>
          </View>

          <View style={styles.rightDock}>
            <Pressable
              style={[styles.settingsButton, menuButtonStyle]}
              onPress={(event) => handleControlPress(event, () => {
                setFarmNameDraft(farmName);
                setSettingsVisible(true);
              })}
            >
              <Ionicons name="settings" size={menuButtonIconSize} color="#FFF7D6" />
              <Text style={[styles.bagButtonText, menuButtonTextStyle]}>설정</Text>
            </Pressable>
            <Pressable
              style={[styles.bookButton, menuButtonStyle]}
              onPress={(event) => handleControlPress(event, onGoEncyclopedia)}
            >
              <Ionicons name="book" size={menuButtonIconSize} color="#FFF7D6" />
              <Text style={[styles.bagButtonText, menuButtonTextStyle]}>도감</Text>
            </Pressable>
            <Pressable
              style={[styles.bagButton, menuButtonStyle]}
              onPress={(event) => handleControlPress(event, () => setBagVisible(true))}
            >
              <Ionicons name="bag-handle" size={menuButtonIconSize} color="#FFF7D6" />
              <Text style={[styles.bagButtonText, menuButtonTextStyle]}>가방</Text>
              <View style={styles.bagCountBadge}>
                <Text style={styles.bagCountText}>{seeds.length + harvestedCrops.length}</Text>
              </View>
            </Pressable>
            <View style={styles.actionDock}>{renderActionButton()}</View>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.bagBackdrop}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsHeader}>
              <View>
                <Text style={styles.bagEyebrow}>플레이 환경</Text>
                <Text style={styles.bagTitle}>설정</Text>
              </View>
              <Pressable style={styles.bagCloseButton} onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={20} color="#FFF7D6" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.settingsSectionTitle}>농장 이름</Text>
              <Text style={styles.settingsDescription}>
                입력한 이름이 농장 화면에 그대로 표시됩니다.
              </Text>
              <View style={styles.farmNameRow}>
                <TextInput
                  style={styles.farmNameInput}
                  value={farmNameDraft}
                  onChangeText={setFarmNameDraft}
                  maxLength={20}
                  placeholder="농장 이름"
                  placeholderTextColor="#8A7956"
                  returnKeyType="done"
                  onSubmitEditing={handleSaveFarmName}
                />
                <Pressable
                  style={[styles.farmNameSaveButton, savingFarmName && styles.logoutButtonDisabled]}
                  onPress={handleSaveFarmName}
                  disabled={savingFarmName}
                >
                  <Text style={styles.farmNameSaveButtonText}>
                    {savingFarmName ? '저장 중' : '저장'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.settingsDivider} />
              <Text style={styles.settingsSectionTitle}>내 캐릭터</Text>
              <View style={styles.currentAvatarCard}>
                <View style={[styles.currentAvatarIcon, { backgroundColor: avatarDefinition.color }]}>
                  <Text style={styles.currentAvatarEmoji}>{avatarDefinition.emoji}</Text>
                  <Text style={styles.currentAvatarStyleEmoji}>{avatarDefinition.styleEmoji}</Text>
                </View>
                <View style={styles.currentAvatarCopy}>
                  <Text style={styles.currentAvatarName}>{avatarDefinition.name}</Text>
                  <Text style={styles.currentAvatarDescription} numberOfLines={2}>{avatarDefinition.description}</Text>
                </View>
                <Pressable
                  style={styles.changeAvatarButton}
                  onPress={() => {
                    setSettingsVisible(false);
                    onChangeCharacter();
                  }}
                >
                  <Text style={styles.changeAvatarButtonText}>변경</Text>
                </Pressable>
              </View>
              <View style={styles.settingsDivider} />
              <Text style={styles.settingsSectionTitle}>동행 친구</Text>
              <View style={styles.currentAvatarCard}>
                <View style={styles.currentPetIcon}>
                  <PetCharacter petId={petId} size={42} />
                </View>
                <View style={styles.currentAvatarCopy}>
                  <Text style={styles.currentAvatarName}>{petDefinition.name}</Text>
                  <Text style={styles.currentAvatarDescription} numberOfLines={2}>{petDefinition.description}</Text>
                </View>
                <Pressable
                  style={styles.changeAvatarButton}
                  onPress={() => {
                    setSettingsVisible(false);
                    onChangePet();
                  }}
                >
                  <Text style={styles.changeAvatarButtonText}>변경</Text>
                </Pressable>
              </View>
              <View style={styles.settingsDivider} />
              <Text style={styles.settingsSectionTitle}>메뉴 버튼 크기</Text>
              <Text style={styles.settingsDescription}>
                설정·도감·가방·탐험·심기 버튼의 크기를 한 번에 조절하세요.
              </Text>
              <View style={styles.sliderValueRow}>
                <Text style={styles.sliderEdgeLabel}>작게</Text>
                <Text style={styles.sliderValue}>{menuButtonScalePercent}%</Text>
                <Text style={styles.sliderEdgeLabel}>크게</Text>
              </View>
              <View
                style={styles.dpadSliderTouchArea}
                onLayout={(event) => setMenuButtonSliderWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={updateMenuButtonScaleFromSlider}
                onResponderMove={updateMenuButtonScaleFromSlider}
                onResponderRelease={saveControlSettings}
              >
                <View style={styles.dpadSliderTrack}>
                  <View
                    style={[styles.dpadSliderFill, { width: `${menuButtonSliderPercent}%` }]}
                  />
                </View>
                <View
                  style={[styles.dpadSliderThumb, { left: `${menuButtonSliderPercent}%` }]}
                >
                  <Ionicons name="resize" size={16} color="#FFF7D6" />
                </View>
              </View>
              <View style={styles.settingsDivider} />
              <Text style={styles.settingsSectionTitle}>이동키 크기</Text>
              <Text style={styles.settingsDescription}>
                손잡이를 좌우로 움직여 플레이하기 편한 크기로 조절하세요.
              </Text>
              <View style={styles.sliderValueRow}>
                <Text style={styles.sliderEdgeLabel}>작게</Text>
                <Text style={styles.sliderValue}>{dpadScalePercent}%</Text>
                <Text style={styles.sliderEdgeLabel}>크게</Text>
              </View>
              <View
                style={styles.dpadSliderTouchArea}
                onLayout={(event) => setDpadSliderWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={updateDpadScaleFromSlider}
                onResponderMove={updateDpadScaleFromSlider}
                onResponderRelease={saveControlSettings}
              >
                <View style={styles.dpadSliderTrack}>
                  <View style={[styles.dpadSliderFill, { width: `${dpadSliderPercent}%` }]} />
                </View>
                <View style={[styles.dpadSliderThumb, { left: `${dpadSliderPercent}%` }]}>
                  <Ionicons name="resize" size={16} color="#FFF7D6" />
                </View>
              </View>
              <View style={styles.settingsDivider} />
              <Pressable
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                  loggingOut && styles.logoutButtonDisabled,
                ]}
                onPress={handleLogout}
                disabled={loggingOut}
              >
                <Ionicons name="log-out-outline" size={19} color="#8B2F2F" />
                <Text style={styles.logoutButtonText}>
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={bagVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBagVisible(false)}
      >
        <View style={styles.bagBackdrop}>
          <View style={styles.bagModal}>
            <View style={styles.bagHeader}>
              <View>
                <Text style={styles.bagEyebrow}>{farmName}</Text>
                <Text style={styles.bagTitle}>가방</Text>
              </View>
              <Pressable style={styles.bagCloseButton} onPress={() => setBagVisible(false)}>
                <Ionicons name="close" size={20} color="#FFF7D6" />
              </Pressable>
            </View>

            <ScrollView style={styles.bagContent} showsVerticalScrollIndicator={false}>
              <View style={styles.bagSectionHeader}>
                <Text style={styles.bagSectionTitle}>수확물</Text>
                <Text style={styles.bagSectionCount}>{harvestedCrops.length}개</Text>
              </View>
              {harvestedCrops.length > 0 ? (
                harvestedCrops.map((crop) => renderBagItem(crop, 'crop'))
              ) : (
                <View style={styles.emptyBagBox}>
                  <Text style={styles.emptyBagText}>아직 수확한 작물이 없습니다.</Text>
                </View>
              )}

              <View style={[styles.bagSectionHeader, styles.seedSectionHeader]}>
                <Text style={styles.bagSectionTitle}>씨앗</Text>
                <Text style={styles.bagSectionCount}>{seeds.length}개</Text>
              </View>
              {seeds.length > 0 ? (
                seeds.map((seed) => renderBagItem(seed, 'seed'))
              ) : (
                <View style={styles.emptyBagBox}>
                  <Text style={styles.emptyBagText}>보유 중인 씨앗이 없습니다.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={shopVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShopVisible(false)}
      >
        <View style={styles.bagBackdrop}>
          <View style={styles.bagModal}>
            <View style={styles.shopHeader}>
              <View>
                <Text style={styles.bagEyebrow}>보유금 {money}G</Text>
                <Text style={styles.bagTitle}>상점</Text>
              </View>
              <Pressable style={styles.bagCloseButton} onPress={() => setShopVisible(false)}>
                <Ionicons name="close" size={20} color="#FFF7D6" />
              </Pressable>
            </View>

            <ScrollView style={styles.bagContent} showsVerticalScrollIndicator={false}>
              <View style={styles.bagSectionHeader}>
                <Text style={styles.bagSectionTitle}>판매 가능한 수확물</Text>
                <Text style={styles.bagSectionCount}>{harvestedCrops.length}개</Text>
              </View>
              {harvestedCrops.length > 0 ? (
                harvestedCrops.map(renderShopCrop)
              ) : (
                <View style={styles.emptyBagBox}>
                  <Text style={styles.emptyBagText}>판매할 수확물이 없습니다. 다 자란 작물을 수확해보세요.</Text>
                </View>
              )}

              <View style={[styles.bagSectionHeader, styles.shopSectionSpacing]}>
                <Text style={styles.bagSectionTitle}>씨앗 구매</Text>
                <Text style={styles.bagSectionCount}>가방으로 바로 지급</Text>
              </View>
              {SHOP_SEEDS.map(({ seed, price }) => (
                <View key={seed.id} style={styles.shopCropItem}>
                  <View style={styles.bagItemIcon}>
                    <Text style={styles.bagItemEmoji}>{seed.emoji}</Text>
                  </View>
                  <View style={styles.bagItemCopy}>
                    <Text style={styles.bagItemName}>{seed.name}</Text>
                    <Text style={styles.bagItemMeta}>{seed.description}</Text>
                  </View>
                  <Pressable
                    style={[styles.buyButton, money < price && styles.unavailableButton]}
                    onPress={() => onBuySeed(seed, price)}
                  >
                    <Text style={styles.buyButtonText}>{price}G 구매</Text>
                  </Pressable>
                </View>
              ))}

              <View style={[styles.bagSectionHeader, styles.shopSectionSpacing]}>
                <Text style={styles.bagSectionTitle}>건물 구매</Text>
                <Text style={styles.bagSectionCount}>계정당 1회 구매</Text>
              </View>
              {SHOP_BUILDINGS.map((building) => {
                const isOwned = ownedBuildings.includes(building.id);
                return (
                  <View key={building.id} style={styles.shopCropItem}>
                    <View style={styles.bagItemIcon}>
                      <Text style={styles.bagItemEmoji}>{building.emoji}</Text>
                    </View>
                    <View style={styles.bagItemCopy}>
                      <Text style={styles.bagItemName}>{building.name}</Text>
                      <Text style={styles.bagItemMeta}>{building.description}</Text>
                    </View>
                    <Pressable
                      style={[
                        styles.buyButton,
                        (isOwned || money < building.price) && styles.unavailableButton,
                      ]}
                      onPress={() =>
                        onBuyBuilding(building.id, building.name, building.price)
                      }
                    >
                      <Text style={styles.buyButtonText}>
                        {isOwned ? '보유 중' : `${building.price}G 구매`}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#273E25',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#5A8F3D',
  },
  /* === 스타듀밸리 조약돌/흙길 산책로 (Cobblestone Paths) === */
  horizontalPath: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '32%',
    height: 52,
    backgroundColor: '#CFA055',
    zIndex: 2,
    justifyContent: 'center',
  },
  pathBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#A07432',
  },
  pathBorderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#A07432',
  },
  pathStonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  verticalPath: {
    position: 'absolute',
    left: '42%',
    width: '16%',
    top: '20%',
    bottom: 0,
    backgroundColor: '#CFA055',
    zIndex: 2,
    alignItems: 'center',
  },
  pathBorderLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
    backgroundColor: '#A07432',
  },
  pathBorderRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 3,
    backgroundColor: '#A07432',
  },
  verticalStonesCol: {
    paddingVertical: 24,
    gap: 36,
    alignItems: 'center',
  },
  cobbleDot: {
    width: 8,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(138,97,36,0.4)',
  },
  cobbleDotAlt: {
    width: 12,
    height: 7,
    borderRadius: 3,
    backgroundColor: 'rgba(235,206,146,0.5)',
  },

  /* === 상단 및 측면 숲 캐노피 & 마당 (Forest Canopy & Courtyard) === */
  topForestCanopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -10,
    height: 65,
    zIndex: 1,
    overflow: 'hidden',
  },
  treeCrown: {
    position: 'absolute',
    borderRadius: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  leftTreeBorder: {
    position: 'absolute',
    left: 0,
    top: 130,
    width: 25,
    bottom: 50,
    zIndex: 3,
    overflow: 'hidden',
  },
  rightTreeBorder: {
    position: 'absolute',
    right: 0,
    top: 130,
    width: 25,
    bottom: 50,
    zIndex: 3,
    overflow: 'hidden',
  },
  dirtCourtyard: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 25,
    height: 135,
    backgroundColor: '#D1A358',
    borderRadius: 14,
    opacity: 0.5,
    zIndex: 2,
  },

  /* === 목책 울타리 라인 (Rustic Farm Fences) === */
  fenceSectionLeft: {
    position: 'absolute',
    left: 12,
    top: 160,
    width: '32%',
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 4,
  },
  fenceSectionRight: {
    position: 'absolute',
    right: 12,
    top: 160,
    width: '32%',
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 4,
  },
  fencePost: {
    width: 7,
    height: 16,
    backgroundColor: '#6A411B',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#3D220C',
  },
  fenceRails: {
    flex: 1,
    height: 4,
    backgroundColor: '#8B5625',
    marginHorizontal: 1,
    borderRadius: 1,
  },

  /* === 좌측: 목재 헛간 / 축사 (Wood Barn) === */
  barnContainer: {
    position: 'absolute',
    left: 10,
    top: 24,
    width: 96,
    height: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  barnRoof: {
    width: 94,
    height: 40,
    backgroundColor: '#8C3222',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderColor: '#4A160D',
    alignItems: 'center',
  },
  barnRoofRidge: {
    width: 80,
    height: 4,
    backgroundColor: '#B54734',
    marginTop: 6,
    borderRadius: 2,
  },
  barnBody: {
    width: 86,
    height: 60,
    backgroundColor: '#BA4E38',
    borderWidth: 2,
    borderColor: '#541F14',
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hayLoftWindow: {
    width: 24,
    height: 16,
    backgroundColor: '#541F14',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  hayStraw: {
    width: 18,
    height: 10,
    backgroundColor: '#FACC15',
    borderRadius: 2,
  },
  barnDoor: {
    width: 44,
    height: 32,
    backgroundColor: '#5A2A14',
    borderWidth: 2,
    borderColor: '#321406',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  barnDoorPlank: {
    width: 2,
    height: '100%',
    backgroundColor: '#321406',
  },
  barnBase: {
    width: 92,
    height: 6,
    backgroundColor: '#485058',
    borderRadius: 2,
  },
  barnSideProps: {
    position: 'absolute',
    left: -2,
    bottom: 0,
    flexDirection: 'row',
    gap: 2,
  },

  /* === 중앙: 스타듀밸리 농가 오두막 (Farmhouse Cabin) === */
  farmHouseContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -85,
    top: '3%',
    width: 170,
    height: 140,
    alignItems: 'center',
    zIndex: 10,
  },
  chimney: {
    position: 'absolute',
    right: 18,
    top: 2,
    width: 18,
    height: 30,
    backgroundColor: '#8C3826',
    borderWidth: 2,
    borderColor: '#4A1C12',
    zIndex: 11,
  },
  smokePuff1: {
    position: 'absolute',
    top: -10,
    left: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  smokePuff2: {
    position: 'absolute',
    top: -18,
    left: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  houseRoof: {
    width: 164,
    height: 54,
    backgroundColor: '#B53E2B',
    borderWidth: 3,
    borderColor: '#541B12',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  roofTileRow: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roofTile: {
    width: 24,
    height: 4,
    backgroundColor: '#8C2E1F',
    borderRadius: 2,
  },
  atticWindow: {
    width: 22,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#541B12',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  atticGlass: {
    width: 16,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#FFE57F',
  },
  roofEaves: {
    width: 172,
    height: 6,
    backgroundColor: '#6D2B1E',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    zIndex: 13,
  },
  houseBody: {
    width: 154,
    height: 52,
    backgroundColor: '#E5A55B',
    borderWidth: 3,
    borderColor: '#6C3A16',
    borderTopWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 4,
    zIndex: 11,
  },
  houseWindow: {
    width: 28,
    height: 26,
    backgroundColor: '#6C3A16',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  windowShutterLeft: {
    width: 3,
    height: '90%',
    backgroundColor: '#8B4513',
    marginRight: 1,
  },
  windowGlass: {
    width: 18,
    height: '90%',
    backgroundColor: '#FEF08A',
    borderRadius: 2,
  },
  windowShutterRight: {
    width: 3,
    height: '90%',
    backgroundColor: '#8B4513',
    marginLeft: 1,
  },
  houseDoor: {
    width: 28,
    height: 44,
    backgroundColor: '#7A3F1B',
    borderWidth: 2,
    borderColor: '#4A230D',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorKnocker: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FDE047',
  },
  housePorch: {
    width: 164,
    height: 16,
    backgroundColor: '#B46B2C',
    borderWidth: 2,
    borderColor: '#542E10',
    alignItems: 'center',
    zIndex: 12,
  },
  porchStep1: {
    width: 54,
    height: 5,
    backgroundColor: '#985820',
  },
  porchStep2: {
    width: 64,
    height: 5,
    backgroundColor: '#7A4315',
    marginTop: 2,
  },
  mailbox: {
    position: 'absolute',
    right: 2,
    bottom: -6,
    zIndex: 15,
  },
  woodPile: {
    position: 'absolute',
    left: 2,
    bottom: -4,
    zIndex: 15,
  },

  /* === 우측: 유리 온실 & 가공 창고 (Stone Greenhouse & Workshop) === */
  greenhouseContainer: {
    position: 'absolute',
    right: 10,
    top: 24,
    width: 96,
    height: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  greenhouseRoof: {
    width: 94,
    height: 40,
    backgroundColor: '#334155',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassPaneRow: {
    flexDirection: 'row',
    gap: 4,
  },
  glassPane: {
    width: 22,
    height: 22,
    backgroundColor: '#7DD3FC',
    borderRadius: 3,
    opacity: 0.8,
  },
  greenhouseBody: {
    width: 86,
    height: 60,
    backgroundColor: '#475569',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderTopWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  greenhouseWindow: {
    width: 32,
    height: 40,
    backgroundColor: '#0284C7',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenhousePlantEmoji: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenhouseDoor: {
    width: 28,
    height: 46,
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#0F172A',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  greenhouseBase: {
    width: 92,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 2,
  },
  greenhouseSideProps: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    flexDirection: 'row',
    gap: 2,
  },


  seedShop: {
    position: 'absolute',
    zIndex: 9,
    width: 82,
    minHeight: 74,
    marginLeft: -41,
    marginTop: -37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectEmoji: {
    fontSize: 36,
  },
  nameTag: {
    backgroundColor: '#24492E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: -1,
  },
  nameTagText: {
    color: '#FFF7D6',
    fontSize: 11,
    fontWeight: '900',
  },
  plotBox: {
    position: 'absolute',
    zIndex: 8,
    width: 116,
    height: 112,
    marginLeft: -58,
    marginTop: -56,
    alignItems: 'center',
  },
  plotBoxTargeted: {
    transform: [{ scale: 1.05 }],
  },
  movingTarget: {
    transform: [{ scale: 1.08 }],
    opacity: 0.82,
  },
  dirtPatch: {
    width: 102,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#4A2A14',
    borderWidth: 3,
    borderColor: '#78431C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  soilRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#351D0E',
  },
  soilRowMiddle: {
    top: 38,
  },
  soilRowBottom: {
    top: 58,
  },
  cropDisplay: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 9,
  },
  cropEmoji: {
    fontSize: 30,
    marginBottom: 1,
  },
  cropReady: {
    transform: [{ scale: 1.12 }],
  },
  cropName: {
    maxWidth: 80,
    fontSize: 10,
    color: '#FFF7D6',
    fontWeight: '900',
    marginBottom: 3,
  },
  meterTrack: {
    width: 58,
    height: 4,
    backgroundColor: 'rgba(255,247,214,0.3)',
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  waterMeter: {
    height: '100%',
    backgroundColor: '#5EB7E8',
    borderRadius: 2,
  },
  sunMeter: {
    height: '100%',
    backgroundColor: '#F2C14E',
    borderRadius: 2,
  },
  emptyPlot: {
    alignItems: 'center',
  },
  emptyPlotText: {
    color: '#F5D39A',
    fontSize: 11,
    fontWeight: '900',
  },
  plotLabelPill: {
    marginTop: 6,
    backgroundColor: '#24492E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  plotLabelText: {
    color: '#FFF7D6',
    fontSize: 10,
    fontWeight: '900',
  },
  characterSprite: {
    position: 'absolute',
    width: 64,
    height: 88,
    marginLeft: -32,
    marginTop: -76,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  characterWalking: {
    transform: [{ translateY: -4 }],
  },
  farmerCharacter: {
    width: 54,
    height: 82,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  characterFacingLeft: {
    transform: [{ scaleX: -1 }],
  },
  hatCrown: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#E7BD54',
    borderWidth: 2,
    borderColor: '#5B3A1F',
    zIndex: 8,
    overflow: 'hidden',
  },
  hatBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 1,
    height: 4,
    backgroundColor: '#3D7547',
  },
  hatBrim: {
    position: 'absolute',
    top: 12,
    width: 48,
    height: 8,
    borderRadius: 5,
    backgroundColor: '#F2CD69',
    borderWidth: 2,
    borderColor: '#5B3A1F',
    zIndex: 9,
  },
  characterHead: {
    position: 'absolute',
    top: 16,
    width: 34,
    height: 33,
    borderRadius: 13,
    backgroundColor: '#F4B57B',
    borderWidth: 2,
    borderColor: '#56371F',
    zIndex: 7,
  },
  characterHeadBack: {
    backgroundColor: '#704329',
  },
  longHairBack: {
    position: 'absolute',
    top: 17,
    width: 39,
    height: 40,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#704329',
    borderWidth: 2,
    borderColor: '#56371F',
    zIndex: 6,
  },
  hairLeft: {
    position: 'absolute',
    left: -2,
    top: 2,
    width: 7,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#704329',
  },
  hairRight: {
    position: 'absolute',
    right: -2,
    top: 2,
    width: 7,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#704329',
  },
  eyeLeft: {
    position: 'absolute',
    left: 8,
    top: 13,
    width: 3,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34251B',
  },
  eyeRight: {
    position: 'absolute',
    right: 8,
    top: 13,
    width: 3,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34251B',
  },
  cheekLeft: {
    position: 'absolute',
    left: 4,
    top: 20,
    width: 5,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#E88672',
  },
  cheekRight: {
    position: 'absolute',
    right: 4,
    top: 20,
    width: 5,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#E88672',
  },
  smile: {
    position: 'absolute',
    left: 13,
    top: 21,
    width: 6,
    height: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#5B3426',
    borderRadius: 5,
  },
  characterBodyRow: {
    position: 'absolute',
    top: 46,
    height: 25,
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 5,
  },
  characterTorso: {
    width: 28,
    height: 27,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#F2E3A4',
    borderWidth: 2,
    borderColor: '#4B3822',
    alignItems: 'center',
  },
  overallBib: {
    position: 'absolute',
    bottom: 0,
    width: 19,
    height: 17,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: '#3E7750',
    borderWidth: 1,
    borderColor: '#24492E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterArm: {
    width: 9,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F4B57B',
    borderWidth: 2,
    borderColor: '#56371F',
    marginTop: 2,
  },
  characterArmLeft: {
    transform: [{ rotate: '8deg' }],
    marginRight: -1,
  },
  characterArmRight: {
    transform: [{ rotate: '-8deg' }],
    marginLeft: -1,
  },
  characterLegs: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    gap: 3,
    zIndex: 4,
  },
  characterLeg: {
    width: 11,
    height: 15,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#385C43',
    borderWidth: 2,
    borderColor: '#253A2B',
  },
  playerShadow: {
    position: 'absolute',
    bottom: -1,
    width: 40,
    height: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(36, 29, 18, 0.28)',
  },
  floatingTag: {
    position: 'absolute',
    maxWidth: 180,
    marginLeft: -70,
    marginTop: -52,
    backgroundColor: '#FFF7D6',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#C29145',
    zIndex: 40,
  },
  floatingTagText: {
    color: '#5D3B19',
    fontSize: 12,
    fontWeight: '900',
  },
  topHud: {
    position: 'absolute',
    zIndex: 30,
    left: 14,
    right: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24492E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.18)',
  },
  locationText: {
    color: '#FFF7D6',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 6,
  },
  headerShopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#24492E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  headerShopButtonText: {
    color: '#FFF7D6',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 6,
  },
  statCluster: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,247,214,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 5,
  },
  statText: {
    color: '#31512F',
    fontSize: 12,
    fontWeight: '900',
  },
  questPanel: {
    position: 'absolute',
    zIndex: 30,
    left: 14,
    top: 60,
    maxWidth: 360,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,247,214,0.92)',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 9,
    borderWidth: 2,
    borderColor: 'rgba(97,69,36,0.16)',
  },
  questCopy: {
    flex: 1,
  },
  questTitle: {
    fontSize: 14,
    color: '#2B3F24',
    fontWeight: '900',
  },
  questSub: {
    marginTop: 1,
    fontSize: 11,
    color: '#5E6D45',
    fontWeight: '700',
  },
  bottomHud: {
    position: 'absolute',
    zIndex: 35,
    left: 14,
    right: 14,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dpad: {
    width: 122,
    height: 122,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadMid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadBtn: {
    width: 39,
    height: 39,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#263D32',
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    elevation: 3,
  },
  dpadUp: {
    marginBottom: 3,
  },
  dpadDown: {
    marginTop: 3,
  },
  dpadCenter: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B2E25',
  },
  dpadCenterText: {
    color: '#FFF7D6',
    fontSize: 8,
    fontWeight: '900',
  },
  actionDock: {
    minWidth: 116,
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  rightDock: {
    alignItems: 'flex-end',
    gap: 10,
  },
  bagButton: {
    minWidth: 102,
    height: 50,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#5A3D26',
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  bookButton: {
    minWidth: 102,
    height: 50,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#334A70',
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  petSprite: {
    position: 'absolute',
    width: 54,
    height: 58,
    marginLeft: -27,
    marginTop: -34,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 18,
  },
  petWalking: { transform: [{ translateY: -3 }] },
  petFacingLeft: { transform: [{ scaleX: -1 }] },
  petShadow: { position: 'absolute', bottom: 13, width: 34, height: 8, borderRadius: 17, backgroundColor: 'rgba(36,29,18,0.25)' },
  petNameTag: { marginTop: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: 'rgba(35,53,42,0.82)' },
  petNameTagText: { color: '#FFF7D6', fontSize: 8, fontWeight: '900' },
  currentPetIcon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  settingsButton: {
    minWidth: 102,
    height: 50,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#59652F',
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  bagButtonText: {
    color: '#FFF7D6',
    fontSize: 12,
    fontWeight: '900',
  },
  bagCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7D6',
    paddingHorizontal: 5,
  },
  bagCountText: {
    color: '#5A3D26',
    fontSize: 11,
    fontWeight: '900',
  },
  squareActionButton: {
    minWidth: 66,
    height: 52,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 4,
  },
  primaryActionButton: {
    minWidth: 102,
    height: 56,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#24492E',
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
    elevation: 4,
  },
  waterButton: {
    backgroundColor: '#2F6E94',
  },
  sunButton: {
    backgroundColor: '#B47B25',
  },
  actionButtonText: {
    color: '#FFF7D6',
    fontSize: 12,
    fontWeight: '900',
  },
  bagBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 31, 22, 0.55)',
    paddingHorizontal: 20,
  },
  bagModal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '78%',
    backgroundColor: '#FFF7D6',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#7A5328',
    overflow: 'hidden',
  },
  settingsModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF7D6',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#59652F',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  settingsHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#42592A',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsContent: {
    padding: 18,
  },
  settingsSectionTitle: {
    color: '#2B3F24',
    fontSize: 17,
    fontWeight: '900',
  },
  farmNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  farmNameInput: {
    flex: 1,
    height: 44,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#B99B58',
    backgroundColor: '#FFFDF2',
    paddingHorizontal: 12,
    color: '#2B3F24',
    fontSize: 14,
    fontWeight: '800',
  },
  farmNameSaveButton: {
    height: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: '#42592A',
    paddingHorizontal: 12,
  },
  farmNameSaveButtonText: {
    color: '#FFF7D6',
    fontSize: 13,
    fontWeight: '900',
  },
  currentAvatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 11,
    borderRadius: 8,
    backgroundColor: '#F2E0A8',
    borderWidth: 2,
    borderColor: '#D5B66E',
  },
  currentAvatarIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 3,
    borderColor: '#FFF7D6',
  },
  currentAvatarEmoji: { fontSize: 31 },
  currentAvatarStyleEmoji: { position: 'absolute', right: -4, bottom: -3, fontSize: 18 },
  currentAvatarCopy: { flex: 1 },
  currentAvatarName: { color: '#2B3F24', fontSize: 14, fontWeight: '900' },
  currentAvatarDescription: { color: '#6B5A36', fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 2 },
  changeAvatarButton: { backgroundColor: '#42592A', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 8 },
  changeAvatarButtonText: { color: '#FFF7D6', fontSize: 12, fontWeight: '900' },
  settingsDivider: { height: 2, backgroundColor: '#D9C99A', marginVertical: 16 },
  settingsDescription: {
    color: '#5E6D45',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 14,
  },
  sliderValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderEdgeLabel: {
    color: '#5E6D45',
    fontSize: 11,
    fontWeight: '800',
  },
  sliderValue: {
    color: '#42592A',
    fontSize: 16,
    fontWeight: '900',
  },
  dpadSliderTouchArea: {
    height: 54,
    justifyContent: 'center',
    marginTop: 2,
  },
  dpadSliderTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DDD0A8',
    overflow: 'hidden',
  },
  dpadSliderFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#6E873E',
  },
  dpadSliderThumb: {
    position: 'absolute',
    width: 34,
    height: 34,
    marginLeft: -17,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42592A',
    borderWidth: 3,
    borderColor: '#FFF7D6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C88D83',
    backgroundColor: '#FFF1E8',
  },
  logoutButtonPressed: {
    backgroundColor: '#F6D8CC',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#8B2F2F',
    fontSize: 14,
    fontWeight: '900',
  },
  bagHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#24492E',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shopHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#5A3D26',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bagEyebrow: {
    color: '#D8E8B6',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  bagTitle: {
    color: '#FFF7D6',
    fontSize: 22,
    fontWeight: '900',
  },
  bagCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B2E25',
  },
  bagContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bagSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  seedSectionHeader: {
    marginTop: 16,
  },
  bagSectionTitle: {
    color: '#2B3F24',
    fontSize: 15,
    fontWeight: '900',
  },
  bagSectionCount: {
    color: '#5E6D45',
    fontSize: 12,
    fontWeight: '800',
  },
  bagItem: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF2',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E1CB8E',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  shopCropItem: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF2',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E1CB8E',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  sellButton: {
    minWidth: 82,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A5A2B',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginLeft: 8,
  },
  sellButtonText: {
    color: '#FFF7D6',
    fontSize: 11,
    fontWeight: '900',
  },
  shopSectionSpacing: {
    marginTop: 20,
  },
  buyButton: {
    minWidth: 82,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D6840',
    borderRadius: 5,
    paddingHorizontal: 9,
    marginLeft: 8,
  },
  unavailableButton: {
    opacity: 0.45,
  },
  buyButtonText: {
    color: '#FFF7D6',
    fontSize: 11,
    fontWeight: '900',
  },
  bagItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2DE9F',
    marginRight: 10,
  },
  bagItemEmoji: {
    fontSize: 23,
  },
  bagItemCopy: {
    flex: 1,
  },
  bagItemName: {
    color: '#2B3F24',
    fontSize: 14,
    fontWeight: '900',
  },
  bagItemMeta: {
    color: '#6F7654',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyBagBox: {
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,253,242,0.65)',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E7D6A2',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  emptyBagText: {
    color: '#777153',
    fontSize: 12,
    fontWeight: '700',
  },
});
