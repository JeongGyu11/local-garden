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
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { HarvestedCrop, Plant, Seed } from '../types';

interface AnimalCrossingGardenProps {
  plants: Plant[];
  seeds: Seed[];
  harvestedCrops: HarvestedCrop[];
  farmerName: string;
  money: number;
  onWater: (plantId: string) => void;
  onSun: (plantId: string) => void;
  onHarvest: (plant: Plant) => void;
  onPlantSeed: (seed: Seed, plotIndex: number) => void;
  onGoExplore: () => void;
  onGoEncyclopedia: () => void;
  onSellHarvestedCrop: (crop: HarvestedCrop) => void;
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
  { id: 0, x: 38, y: 40, label: '1번 밭' },
  { id: 1, x: 62, y: 40, label: '2번 밭' },
  { id: 2, x: 38, y: 65, label: '3번 밭' },
  { id: 3, x: 62, y: 65, label: '4번 밭' },
];

const SHOP = { x: 82, y: 31, emoji: '🏪', label: '상점' };

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

const createPlotLabelFromSeed = (seed: Seed) => {
  const seedBase = seed.name.replace(/\s*씨앗$/, '').trim();
  return `${seedBase || '특산'} 밭`;
};

export const AnimalCrossingGarden: React.FC<AnimalCrossingGardenProps> = ({
  plants,
  seeds,
  harvestedCrops,
  farmerName,
  money,
  onWater,
  onSun,
  onHarvest,
  onPlantSeed,
  onGoExplore,
  onGoEncyclopedia,
  onSellHarvestedCrop,
}) => {
  const { height } = useWindowDimensions();
  const [charPos, setCharPos] = useState<MapPoint>({ x: 50, y: 78 });
  const [direction, setDirection] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [isWalking, setIsWalking] = useState(false);
  const [bagVisible, setBagVisible] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
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
  const farmName = `${farmerName.trim() || '나'}의 농장`;
  const placedPlots = PLOTS.map((plot) => ({
    ...plot,
    ...(plotPositions[plot.id] ?? { x: plot.x, y: plot.y }),
  }));
  const nearbyPlotIndex = placedPlots.findIndex((plot) => distance(plot, charPos) < 11);
  const nearbyPlot = nearbyPlotIndex >= 0 ? placedPlots[nearbyPlotIndex] : null;
  const currentPlantInPlot = nearbyPlotIndex >= 0 ? plants[nearbyPlotIndex] : null;
  const isNearShop = distance(shopPosition, charPos) < 10;

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

  const interaction = useMemo(() => {
    if (movingTarget) {
      return {
        title: movingTarget.type === 'shop' ? '상점 이동 중' : '밭 이동 중',
        subtitle: '누른 채 원하는 위치로 끌고 가서 손을 떼세요',
        icon: 'move' as const,
      };
    }

    if (nearbyPlot) {
      if (!currentPlantInPlot) {
        return {
          title: plotLabels[nearbyPlot.id] ?? nearbyPlot.label,
          subtitle: seeds.length > 0 ? `${seeds[0].name} 심기 가능` : '로컬 탐험에서 씨앗을 얻어오세요',
          icon: 'leaf' as const,
        };
      }

      if (currentPlantInPlot.growthStage >= 4) {
        return {
          title: `${currentPlantInPlot.name} 수확 가능`,
          subtitle: currentPlantInPlot.harvestReward,
          icon: 'sparkles' as const,
        };
      }

      return {
        title: currentPlantInPlot.name,
        subtitle: `수분 ${currentPlantInPlot.waterProgress}% · 햇빛 ${currentPlantInPlot.sunProgress}%`,
        icon: 'water' as const,
      };
    }

    if (isNearShop) {
      return {
        title: '상점',
        subtitle: '수확한 작물을 판매해 돈을 벌 수 있어요',
        icon: 'storefront' as const,
      };
    }

    return {
      title: farmName,
      subtitle: '화면 이동키로 움직이세요',
      icon: 'walk' as const,
    };
  }, [currentPlantInPlot, farmName, isNearShop, movingTarget, nearbyPlot, plotLabels, seeds]);

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
          style={styles.primaryActionButton}
          onPress={(event) => handleControlPress(event, handlePlantSeed)}
        >
          <Ionicons name="leaf" size={18} color="#FFF7D6" />
          <Text style={styles.actionButtonText}>심기</Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={styles.primaryActionButton}
        onPress={(event) => handleControlPress(event, onGoExplore)}
      >
        <Ionicons name="compass" size={18} color="#FFF7D6" />
        <Text style={styles.actionButtonText}>탐험</Text>
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
        <Pressable
          style={[
            styles.seedShop,
            { left: `${shopPosition.x}%`, top: `${shopPosition.y}%` },
            movingTarget?.type === 'shop' && styles.movingTarget,
          ]}
          onLongPress={(event) =>
            startDraggingTarget(event, { type: 'shop' }, shopPosition, '상점')
          }
          onPressOut={finishDraggingTarget}
          onPress={(event) =>
            handleControlPress(event, () => {
              if (!movingTarget) {
                setShopVisible(true);
              }
            })
          }
        >
          <Text style={styles.objectEmoji}>{SHOP.emoji}</Text>
          <View style={styles.nameTag}>
            <Text style={styles.nameTagText}>{SHOP.label}</Text>
          </View>
        </Pressable>

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
            isWalking && styles.characterWalking,
          ]}
        >
          <View style={styles.playerShadow} />
          <View style={styles.avatarBubble}>
            <Text style={styles.characterEmoji}>{direction === 'up' ? '🧑‍🌾' : '🧑‍🌾'}</Text>
          </View>
        </View>

        {floatingEffect && (
          <View style={[styles.floatingTag, { left: `${floatingEffect.x}%`, top: `${floatingEffect.y}%` }]}>
            <Text style={styles.floatingTagText}>{floatingEffect.text}</Text>
          </View>
        )}

        <View style={styles.topHud} pointerEvents="box-none">
          <View style={styles.locationPill}>
            <Ionicons name="leaf" size={15} color="#F3F7D5" />
            <Text style={styles.locationText}>{farmName}</Text>
          </View>
          <View style={styles.statCluster}>
            <Text style={styles.statText}>{money}G</Text>
            <Text style={styles.statText}>씨앗 {seeds.length}</Text>
            <Text style={styles.statText}>작물 {plants.length}</Text>
          </View>
        </View>

        <View style={styles.questPanel} pointerEvents="none">
          <Ionicons name={interaction.icon} size={17} color="#42592A" />
          <View style={styles.questCopy}>
            <Text style={styles.questTitle}>{interaction.title}</Text>
            <Text style={styles.questSub} numberOfLines={1}>
              {interaction.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.bottomHud} pointerEvents="box-none">
          <View style={styles.dpad}>
            <Pressable
              style={[styles.dpadBtn, styles.dpadUp]}
              onPress={(event) => handleControlPress(event, () => moveCharacter(0, -4.5, 'up'))}
            >
              <Ionicons name="chevron-up" size={20} color="#FFF7D6" />
            </Pressable>
            <View style={styles.dpadMid}>
              <Pressable
                style={styles.dpadBtn}
                onPress={(event) => handleControlPress(event, () => moveCharacter(-4.5, 0, 'left'))}
              >
                <Ionicons name="chevron-back" size={20} color="#FFF7D6" />
              </Pressable>
              <View style={styles.dpadCenter}>
                <Text style={styles.dpadCenterText}>MOVE</Text>
              </View>
              <Pressable
                style={styles.dpadBtn}
                onPress={(event) => handleControlPress(event, () => moveCharacter(4.5, 0, 'right'))}
              >
                <Ionicons name="chevron-forward" size={20} color="#FFF7D6" />
              </Pressable>
            </View>
            <Pressable
              style={[styles.dpadBtn, styles.dpadDown]}
              onPress={(event) => handleControlPress(event, () => moveCharacter(0, 4.5, 'down'))}
            >
              <Ionicons name="chevron-down" size={20} color="#FFF7D6" />
            </Pressable>
          </View>

          <View style={styles.rightDock}>
            <Pressable
              style={styles.bookButton}
              onPress={(event) => handleControlPress(event, onGoEncyclopedia)}
            >
              <Ionicons name="book" size={19} color="#FFF7D6" />
              <Text style={styles.bagButtonText}>도감</Text>
            </Pressable>
            <Pressable
              style={styles.bagButton}
              onPress={(event) => handleControlPress(event, () => setBagVisible(true))}
            >
              <Ionicons name="bag-handle" size={19} color="#FFF7D6" />
              <Text style={styles.bagButtonText}>가방</Text>
              <View style={styles.bagCountBadge}>
                <Text style={styles.bagCountText}>{seeds.length + harvestedCrops.length}</Text>
              </View>
            </Pressable>
            <View style={styles.actionDock}>{renderActionButton()}</View>
          </View>
        </View>
      </Pressable>

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
    backgroundColor: '#7BBF70',
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
    width: 96,
    height: 76,
    borderRadius: 5,
    backgroundColor: '#8E5A2B',
    borderWidth: 4,
    borderColor: '#68411F',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  soilRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 18,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(82,45,21,0.48)',
  },
  soilRowMiddle: {
    top: 36,
  },
  soilRowBottom: {
    top: 54,
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
    width: 58,
    height: 64,
    marginLeft: -29,
    marginTop: -52,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  characterWalking: {
    transform: [{ translateY: -4 }],
  },
  avatarBubble: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,247,214,0.38)',
    borderWidth: 3,
    borderColor: '#FFF7D6',
  },
  characterEmoji: {
    fontSize: 31,
  },
  playerShadow: {
    position: 'absolute',
    bottom: 2,
    width: 34,
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
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24492E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    gap: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,247,214,0.18)',
  },
  locationText: {
    color: '#FFF7D6',
    fontSize: 13,
    fontWeight: '900',
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
