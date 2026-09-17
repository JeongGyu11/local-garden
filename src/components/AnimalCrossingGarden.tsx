import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  GestureResponderEvent,
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
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AvatarId, HarvestedCrop, PetId, Plant, Seed } from '../types';
import { getAvatarDefinition } from '../data/avatarData';
import { getPetDefinition } from '../data/petData';
import { PetCharacter } from './PetCharacter';
import { PlayerCharacter } from './PlayerCharacter';
import { SeedVisual } from './SeedVisual';

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
  waterCooldownReductionMs: number;
  sunCooldownReductionMs: number;
  growthBoostCount: number;
  welcomeGiftClaimed: boolean;
  showCropLossCompensation: boolean;
  claimingCropLossCompensation: boolean;
  showSeolBeomjunSeedCompensation: boolean;
  claimingSeolBeomjunSeedCompensation: boolean;
  readNoticeIds: string[];
  onWater: (plantId: string) => void;
  onSun: (plantId: string) => void;
  onHarvest: (plant: Plant) => void;
  onPlantSeed: (seed: Seed, plotIndex: number) => void;
  onGoExplore: () => void;
  onGoEncyclopedia: () => void;
  onSellHarvestedCrop: (crop: HarvestedCrop) => void;
  onBuySeed: (seed: Seed, price: number) => void;
  onBuyCareCooldownUpgrade: (type: 'water' | 'sun') => void | Promise<void>;
  onBuyGrowthBoost: () => void | Promise<void>;
  onUseGrowthBoost: (plantId: string) => void | Promise<void>;
  onClaimWelcomeGift: () => void | Promise<void>;
  onClaimCropLossCompensation: () => void | Promise<void>;
  onClaimSeolBeomjunSeedCompensation: () => void | Promise<void>;
  onMarkNoticeRead: (noticeId: string) => void | Promise<void>;
  onChangeCharacter: () => void;
  onChangePet: () => void;
  onChangeFarmName: (farmName: string) => Promise<void>;
  onControlSettingsChange: (settings: {
    dpadScale: number;
    menuButtonScale: number;
    waterCooldownReductionMs: number;
    sunCooldownReductionMs: number;
  }) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
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
  {
    seed: {
      id: 'shop_local',
      name: '로컬 씨앗',
      region: '전국',
      emoji: '🌾',
      description: '향토의 정기가 깃든 튼튼하고 신선한 기본 로컬 씨앗',
      visual: {
        theme: 'local',
        primaryColor: '#6E9F44',
        secondaryColor: '#F2D36B',
        accentColor: '#FFF8D9',
        pattern: 'leaf',
      },
    },
    price: 200,
  },
  {
    seed: {
      id: 'shop_garden',
      name: '가든 씨앗',
      region: '전국',
      emoji: '🌻',
      description: '정원을 화사하고 풍성하게 가꿔주는 기본 가든 씨앗',
      visual: {
        theme: 'festival',
        primaryColor: '#D946EF',
        secondaryColor: '#38BDF8',
        accentColor: '#FDE047',
        pattern: 'sparkle',
      },
    },
    price: 200,
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const MIN_DPAD_SCALE = 0.7;
const MAX_DPAD_SCALE = 1.4;
const MIN_MENU_BUTTON_SCALE = 0.7;
const MAX_MENU_BUTTON_SCALE = 1.4;
const CHANGE_SERVICE_PRICE = 500;
const CARE_UPGRADE_PRICE = 200;
const GROWTH_BOOST_PRICE = 1000;
const CARE_BASE_COOLDOWN_MS = 20 * 60 * 1000;
const CARE_UPGRADE_REDUCTION_MS = 10 * 1000;
const FARM_BGM = require('../../assets/audio/farm-bgm.mp3');
const UI_TAP_SFX = require('../../assets/audio/ui-tap.mp3');
const GROWTH_BOOST_NOTICE_ID = 'growth-boost-release-2026-09';
const WELCOME_NOTICE_ID = 'welcome-guide-v1';

const createPlotLabelFromSeed = (seed: Seed) => {
  const seedBase = seed.name.replace(/\s*씨앗$/, '').trim();
  return `${seedBase || '특산'} 밭`;
};

const formatCooldownTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
};

const formatCompactCooldownTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getCareRemainingMs = (
  lastUsedAt: string | undefined,
  cooldownMs: number,
  nowMs: number
) => {
  if (!lastUsedAt) return 0;
  const lastUsedMs = new Date(lastUsedAt).getTime();
  if (Number.isNaN(lastUsedMs)) return 0;
  return Math.max(0, cooldownMs - (nowMs - lastUsedMs));
};

const getPlantPlotIndex = (plant: Plant, fallbackIndex: number) => {
  if (typeof plant.plotIndex === 'number') {
    return plant.plotIndex;
  }

  const match = plant.id.match(/^p_plot_(\d+)_/);
  if (match) {
    return Number(match[1]);
  }

  return fallbackIndex;
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
  waterCooldownReductionMs,
  sunCooldownReductionMs,
  growthBoostCount,
  welcomeGiftClaimed,
  showCropLossCompensation,
  claimingCropLossCompensation,
  showSeolBeomjunSeedCompensation,
  claimingSeolBeomjunSeedCompensation,
  readNoticeIds,
  onWater,
  onSun,
  onHarvest,
  onPlantSeed,
  onGoExplore,
  onGoEncyclopedia,
  onSellHarvestedCrop,
  onBuySeed,
  onBuyCareCooldownUpgrade,
  onBuyGrowthBoost,
  onUseGrowthBoost,
  onClaimWelcomeGift,
  onClaimCropLossCompensation,
  onClaimSeolBeomjunSeedCompensation,
  onMarkNoticeRead,
  onChangeCharacter,
  onChangePet,
  onChangeFarmName,
  onControlSettingsChange,
  onLogout,
  onDeleteAccount,
}) => {
  const { height } = useWindowDimensions();
  const bgmPlayer = useAudioPlayer(FARM_BGM);
  const tapPlayer = useAudioPlayer(UI_TAP_SFX);
  const audioMountedRef = useRef(true);
  const [charPos, setCharPos] = useState<MapPoint>({ x: 50, y: 78 });
  const [petPos, setPetPos] = useState<MapPoint>({ x: 45.5, y: 80 });
  const previousCharPosRef = useRef<MapPoint>({ x: 50, y: 78 });
  const [direction, setDirection] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [isWalking, setIsWalking] = useState(false);
  const [bagVisible, setBagVisible] = useState(false);
  const [shopVisible, setShopVisible] = useState(false);
  const [cabinInteriorVisible, setCabinInteriorVisible] = useState(false);
  const [noticeBoardVisible, setNoticeBoardVisible] = useState(false);
  const [interiorEffect, setInteriorEffect] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [dpadScale, setDpadScale] = useState(initialDpadScale);
  const [dpadSliderWidth, setDpadSliderWidth] = useState(0);
  const [menuButtonScale, setMenuButtonScale] = useState(initialMenuButtonScale);
  const [nowMs, setNowMs] = useState(Date.now());
  const mailboxGlow = useRef(new Animated.Value(0.25)).current;
  const hasUnreadNotice =
    showSeolBeomjunSeedCompensation ||
    showCropLossCompensation ||
    !welcomeGiftClaimed ||
    !readNoticeIds.includes(GROWTH_BOOST_NOTICE_ID) ||
    !readNoticeIds.includes(WELCOME_NOTICE_ID);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasUnreadNotice) {
      mailboxGlow.stopAnimation();
      mailboxGlow.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(mailboxGlow, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(mailboxGlow, {
          toValue: 0.25,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [hasUnreadNotice, mailboxGlow]);
  const [menuButtonSliderWidth, setMenuButtonSliderWidth] = useState(0);
  const dpadScaleRef = useRef(initialDpadScale);
  const menuButtonScaleRef = useRef(initialMenuButtonScale);
  const [farmNameDraft, setFarmNameDraft] = useState(farmName);
  const [savingFarmName, setSavingFarmName] = useState(false);
  const [plotLabels, setPlotLabels] = useState<Record<number, string>>({});
  const [floatingEffect, setFloatingEffect] = useState<{ text: string; x: number; y: number } | null>(null);

  const mapMinHeight = Math.max(540, height - 150);
  const placedPlots = PLOTS;
  const nearbyPlotIndex = placedPlots.findIndex((plot) => distance(plot, charPos) < 11);
  const nearbyPlot = nearbyPlotIndex >= 0 ? placedPlots[nearbyPlotIndex] : null;
  const currentPlantInPlot =
    nearbyPlotIndex >= 0
      ? plants.find((plant, index) => getPlantPlotIndex(plant, index) === nearbyPlotIndex) ??
        null
      : null;
  const isNearShop = distance(SHOP, charPos) < 10;
  const isNearLibrary =
    (charPos.x <= 34 && charPos.y <= 38) ||
    distance({ x: 20, y: 26 }, charPos) < 16;
  const isNearCabin =
    charPos.x > 34 && charPos.x < 64 && charPos.y <= 38;
  const isNearWarehouse =
    (charPos.x >= 64 && charPos.y <= 38) ||
    distance({ x: 74, y: 26 }, charPos) < 16;
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
  const waterCooldownMs = Math.max(0, CARE_BASE_COOLDOWN_MS - waterCooldownReductionMs);
  const sunCooldownMs = Math.max(0, CARE_BASE_COOLDOWN_MS - sunCooldownReductionMs);

  useEffect(() => {
    audioMountedRef.current = true;
    return () => {
      audioMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const playBackgroundMusic = async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
          shouldPlayInBackground: false,
        });

        if (!mounted) {
          return;
        }

        bgmPlayer.loop = true;
        bgmPlayer.volume = 0.28;
        bgmPlayer.play();
      } catch (error) {
        console.warn('Farm background music error:', error);
      }
    };

    playBackgroundMusic();

    return () => {
      mounted = false;
    };
  }, [bgmPlayer]);

  const playTapSound = () => {
    if (!audioMountedRef.current) {
      return;
    }

    try {
      tapPlayer.volume = 0.5;
      void tapPlayer
        .seekTo(0)
        .then(() => {
          if (!audioMountedRef.current) {
            return;
          }
          try {
            tapPlayer.play();
          } catch (error) {
            console.warn('UI tap sound play error:', error);
          }
        })
        .catch((error) => {
          console.warn('UI tap sound seek error:', error);
        });
    } catch (error) {
      console.warn('UI tap sound error:', error);
    }
  };

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
        waterCooldownReductionMs,
        sunCooldownReductionMs,
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
    if (nextName !== farmName && money < CHANGE_SERVICE_PRICE) {
      Alert.alert('골드가 부족해요', `농장 이름 변경에는 ${CHANGE_SERVICE_PRICE}G가 필요합니다.`);
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

  const deleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      await onDeleteAccount();
      setSettingsVisible(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '회원 탈퇴 중 문제가 발생했습니다.';
      Alert.alert('회원 탈퇴 실패', message);
      setDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    const message = '계정과 농장 데이터가 모두 영구 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠어요?';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        void deleteAccount();
      }
      return;
    }
    Alert.alert('회원 탈퇴', message, [
      { text: '취소', style: 'cancel' },
      { text: '회원 탈퇴', style: 'destructive', onPress: () => void deleteAccount() },
    ]);
  };

  const handlePaidCharacterChange = () => {
    if (money < CHANGE_SERVICE_PRICE) {
      Alert.alert('골드가 부족해요', `캐릭터 변경에는 ${CHANGE_SERVICE_PRICE}G가 필요합니다.`);
      return;
    }
    setShopVisible(false);
    onChangeCharacter();
  };

  const handlePaidPetChange = () => {
    if (money < CHANGE_SERVICE_PRICE) {
      Alert.alert('골드가 부족해요', `동행 친구 변경에는 ${CHANGE_SERVICE_PRICE}G가 필요합니다.`);
      return;
    }
    setShopVisible(false);
    onChangePet();
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

  const triggerInteriorEffect = (text: string) => {
    setInteriorEffect(text);
    setTimeout(() => setInteriorEffect(null), 2500);
  };

  const handleControlPress = (event: GestureResponderEvent, action: () => void) => {
    event.stopPropagation();
    playTapSound();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.focus();
    }
    action();
  };

  const handlePlainPress = (action: () => void | Promise<void>) => {
    playTapSound();
    void action();
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

      const waterRemainingMs = getCareRemainingMs(
        currentPlantInPlot.lastWateredAt,
        waterCooldownMs,
        nowMs
      );
      const sunRemainingMs = getCareRemainingMs(
        currentPlantInPlot.lastSunnedAt,
        sunCooldownMs,
        nowMs
      );

      return (
        <>
          <Pressable
            style={[styles.squareActionButton, styles.waterButton]}
            onPress={(event) =>
              handleControlPress(event, () => {
                if (waterRemainingMs > 0) {
                  triggerEffect(
                    `물 ${formatCooldownTime(waterRemainingMs)}`,
                    charPos.x,
                    charPos.y - 7
                  );
                  void onWater(currentPlantInPlot.id);
                  return;
                }
                void onWater(currentPlantInPlot.id);
                triggerEffect('수분 +50%', charPos.x, charPos.y - 7);
              })
            }
          >
            <Ionicons name="water" size={18} color="#EAF7FF" />
            <Text style={styles.actionButtonText}>
              {waterRemainingMs > 0 ? formatCompactCooldownTime(waterRemainingMs) : '물'}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.squareActionButton, styles.sunButton]}
            onPress={(event) =>
              handleControlPress(event, () => {
                if (sunRemainingMs > 0) {
                  triggerEffect(
                    `햇빛 ${formatCooldownTime(sunRemainingMs)}`,
                    charPos.x,
                    charPos.y - 7
                  );
                  void onSun(currentPlantInPlot.id);
                  return;
                }
                void onSun(currentPlantInPlot.id);
                triggerEffect('햇빛 +50%', charPos.x, charPos.y - 7);
              })
            }
          >
            <Ionicons name="sunny" size={18} color="#FFF7D6" />
            <Text style={styles.actionButtonText}>
              {sunRemainingMs > 0 ? formatCompactCooldownTime(sunRemainingMs) : '햇빛'}
            </Text>
          </Pressable>
          {growthBoostCount > 0 && (
            <Pressable
              style={[styles.squareActionButton, styles.growthBoostButton]}
              onPress={(event) =>
                handleControlPress(event, () => {
                  void onUseGrowthBoost(currentPlantInPlot.id);
                  triggerEffect('🌱 무럭무럭!', charPos.x, charPos.y - 7);
                })
              }
            >
              <MaterialCommunityIcons name="sprout" size={18} color="#FFF7D6" />
              <Text style={styles.actionButtonText}>무럭무럭</Text>
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>{growthBoostCount}</Text>
              </View>
            </Pressable>
          )}
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

    if (isNearLibrary) {
      return (
        <Pressable
          style={[
            styles.primaryActionButton,
            styles.libraryActionButton,
            { minWidth: menuButtonWidth, height: menuActionHeight },
          ]}
          onPress={(event) =>
            handleControlPress(event, () => {
              triggerEffect('📚 도서관 입장', charPos.x, charPos.y - 7);
              onGoEncyclopedia();
            })
          }
        >
          <Ionicons name="book" size={menuButtonIconSize} color="#FFF7D6" />
          <Text style={[styles.actionButtonText, menuButtonTextStyle]}>도서관</Text>
        </Pressable>
      );
    }

    if (isNearCabin) {
      return (
        <Pressable
          style={[
            styles.primaryActionButton,
            styles.cabinActionButton,
            { minWidth: menuButtonWidth, height: menuActionHeight },
          ]}
          onPress={(event) =>
            handleControlPress(event, () => {
              triggerEffect('🏡 오두막 입장', charPos.x, charPos.y - 7);
              setCabinInteriorVisible(true);
            })
          }
        >
          <Ionicons name="home" size={menuButtonIconSize} color="#FFF7D6" />
          <Text style={[styles.actionButtonText, menuButtonTextStyle]}>오두막</Text>
        </Pressable>
      );
    }

    if (isNearWarehouse) {
      return (
        <Pressable
          style={[
            styles.primaryActionButton,
            styles.warehouseActionButton,
            { minWidth: menuButtonWidth, height: menuActionHeight },
          ]}
          onPress={(event) =>
            handleControlPress(event, () => {
              triggerEffect('📦 창고 열기', charPos.x, charPos.y - 7);
              setBagVisible(true);
            })
          }
        >
          <Ionicons name="archive" size={menuButtonIconSize} color="#FFF7D6" />
          <Text style={[styles.actionButtonText, menuButtonTextStyle]}>창고</Text>
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>
              {seeds.length + harvestedCrops.length + growthBoostCount}
            </Text>
          </View>
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
        {type === 'seed' || item.visual ? (
          <SeedVisual visual={item.visual} emoji={item.emoji} size={44} />
        ) : (
          <Text style={styles.bagItemEmoji}>{item.emoji}</Text>
        )}
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
        {crop.visual ? (
          <SeedVisual visual={crop.visual} emoji={crop.emoji} size={44} />
        ) : (
          <Text style={styles.bagItemEmoji}>{crop.emoji}</Text>
        )}
      </View>
      <View style={styles.bagItemCopy}>
        <Text style={styles.bagItemName} numberOfLines={1}>
          {crop.name}
        </Text>
        <Text style={styles.bagItemMeta}>{crop.region} 특산 수확물</Text>
      </View>
      <Pressable
        style={styles.sellButton}
        onPress={() => handlePlainPress(() => onSellHarvestedCrop(crop))}
      >
        <Text style={styles.sellButtonText}>350G 판매</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.mapCanvas, { minHeight: mapMinHeight }]}
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

        {/* === 우측: 마을 창고 (Village Warehouse) === */}
        <View style={styles.warehouseContainer} pointerEvents="none">
          <View style={[styles.buildingSignPlate, isNearWarehouse && styles.buildingSignPlateActive]}>
            <Ionicons name="archive" size={10} color="#FFE57F" />
            <Text style={styles.buildingSignText}>창고</Text>
          </View>
          <View style={styles.warehouseRoof}>
            <View style={styles.warehouseRoofRidge} />
          </View>
          <View style={styles.warehouseBody}>
            <View style={styles.warehouseVentRow}>
              <View style={styles.warehouseVentBar} />
              <View style={styles.warehouseVentBar} />
              <View style={styles.warehouseVentBar} />
            </View>
            <View style={styles.warehouseDoor}>
              <View style={styles.warehouseDoorStrap} />
              <View style={[styles.warehouseDoorStrap, { marginTop: 10 }]} />
              <View style={styles.warehouseLock} />
            </View>
          </View>
          <View style={styles.warehouseBase} />
        </View>

        {/* === 좌측: 마을 도서관 (Village Library / Codex) === */}
        <View style={styles.libraryContainer} pointerEvents="none">
          <View style={[styles.buildingSignPlate, isNearLibrary && styles.buildingSignPlateActive]}>
            <Ionicons name="book" size={10} color="#FFE57F" />
            <Text style={styles.buildingSignText}>도서관</Text>
          </View>
          <View style={styles.libraryRoof}>
            <View style={styles.libraryRoofRidge} />
            <View style={styles.libraryCupola}>
              <View style={styles.libraryCupolaSpire} />
            </View>
          </View>
          <View style={styles.libraryBody}>
            <View style={styles.libraryArchWindow}>
              <View style={styles.libraryArchGlass} />
            </View>
            <View style={styles.libraryGroundRow}>
              <View style={styles.libraryBookWindow}>
                <View style={styles.bookshelfBar} />
                <View style={[styles.bookshelfBar, { marginTop: 3 }]} />
              </View>
              <View style={styles.libraryDoor}>
                <View style={styles.doorKnocker} />
              </View>
              <View style={styles.libraryBookWindow}>
                <View style={styles.bookshelfBar} />
                <View style={[styles.bookshelfBar, { marginTop: 3 }]} />
              </View>
            </View>
          </View>
          <View style={styles.libraryBase} />
        </View>

        {/* === 중앙 전면: 스타듀밸리 농가 오두막 본채 (Main Farmhouse Cabin) === */}
        <View style={styles.farmHouseContainer} pointerEvents="none">
          <View style={[styles.buildingSignPlate, isNearCabin && styles.buildingSignPlateActive]}>
            <Ionicons name="home" size={10} color="#FFE57F" />
            <Text style={styles.buildingSignText}>오두막</Text>
          </View>
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            hasUnreadNotice ? '읽지 않은 공지가 있는 공지사항 우체통 열기' : '공지사항 우체통 열기'
          }
          style={({ pressed }) => [styles.mailbox, pressed && styles.mailboxPressed]}
          onPress={(event) =>
            handleControlPress(event, () => setNoticeBoardVisible(true))
          }
        >
          {hasUnreadNotice && (
            <Animated.View
              pointerEvents="none"
              style={[styles.mailboxGlow, { opacity: mailboxGlow }]}
            />
          )}
          <View style={styles.mailboxFlag} />
          <View style={styles.mailboxBox}>
            <Ionicons name="mail" size={16} color="#FFF7D6" />
          </View>
          <View style={styles.mailboxPost} />
          <View style={styles.mailboxFoot} />
          <Text style={styles.mailboxLabel}>공지</Text>
        </Pressable>


        {placedPlots.map((plot, index) => {
          const crop =
            plants.find((plant, plantIndex) => getPlantPlotIndex(plant, plantIndex) === index) ??
            null;
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
              ]}
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
          ]}
        >
          <View style={styles.petShadow} />
          <View style={direction === 'left' && styles.petFacingLeft}>
            <PetCharacter petId={petId} size={43} />
          </View>
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
              onPress={(event) =>
                handleControlPress(event, () => {
                  setFarmNameDraft(farmName);
                  setShopVisible(true);
                })
              }
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
            <View style={styles.actionDock}>{renderActionButton()}</View>
          </View>
        </View>
      </Pressable>

      <Modal
        visible={noticeBoardVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeBoardVisible(false)}
      >
        <View style={styles.bagBackdrop}>
          <View style={styles.noticeBoardModal}>
            <View style={styles.noticeBoardHeader}>
              <View>
                <Text style={styles.bagEyebrow}>로컬 가든 소식</Text>
                <Text style={styles.bagTitle}>공지사항</Text>
              </View>
              <Pressable
                style={styles.bagCloseButton}
                onPress={() => handlePlainPress(() => setNoticeBoardVisible(false))}
              >
                <Ionicons name="close" size={20} color="#FFF7D6" />
              </Pressable>
            </View>
            <ScrollView style={styles.noticeBoardContent} showsVerticalScrollIndicator={false}>
              {showSeolBeomjunSeedCompensation && (
                <View style={styles.giftInboxCard}>
                  <View style={styles.giftInboxIcon}>
                    <Ionicons name="gift" size={27} color="#FFF7D6" />
                  </View>
                  <View style={styles.giftInboxCopy}>
                    <Text style={styles.giftInboxEyebrow}>설범준 정원사님 전용 복구 보상</Text>
                    <Text style={styles.giftInboxTitle}>로컬 씨앗 × 4 · 가든 씨앗 × 4</Text>
                    <Text style={styles.giftInboxDescription}>
                      업데이트 과정에서 발생한 작물 저장 오류에 대한 복구 보상입니다. 계정당 한 번만 받을 수 있습니다.
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.giftClaimButton,
                      claimingSeolBeomjunSeedCompensation && styles.giftClaimButtonDisabled,
                    ]}
                    disabled={claimingSeolBeomjunSeedCompensation}
                    onPress={() => handlePlainPress(onClaimSeolBeomjunSeedCompensation)}
                  >
                    <Text style={styles.giftClaimButtonText}>
                      {claimingSeolBeomjunSeedCompensation ? '지급 중' : '확인·받기'}
                    </Text>
                  </Pressable>
                </View>
              )}
              {showCropLossCompensation && (
                <View style={styles.giftInboxCard}>
                  <View style={styles.giftInboxIcon}>
                    <Ionicons name="gift" size={27} color="#FFF7D6" />
                  </View>
                  <View style={styles.giftInboxCopy}>
                    <Text style={styles.giftInboxEyebrow}>버그 패치 완료 보상</Text>
                    <Text style={styles.giftInboxTitle}>무럭무럭 자라라 × 5</Text>
                    <Text style={styles.giftInboxDescription}>
                      심어둔 작물이 사라질 수 있던 저장 버그를 수정했습니다. 불편을 드린 기존 이용자분께 보상을 드립니다.
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.giftClaimButton,
                      claimingCropLossCompensation && styles.giftClaimButtonDisabled,
                    ]}
                    disabled={claimingCropLossCompensation}
                    onPress={() => handlePlainPress(onClaimCropLossCompensation)}
                  >
                    <Text style={styles.giftClaimButtonText}>
                      {claimingCropLossCompensation ? '지급 중' : '확인·받기'}
                    </Text>
                  </Pressable>
                </View>
              )}
              {!welcomeGiftClaimed && (
                <View style={styles.giftInboxCard}>
                  <View style={styles.giftInboxIcon}>
                    <Ionicons name="gift" size={27} color="#FFF7D6" />
                  </View>
                  <View style={styles.giftInboxCopy}>
                    <Text style={styles.giftInboxEyebrow}>신규 유저 선물함</Text>
                    <Text style={styles.giftInboxTitle}>무럭무럭 자라라 × 5</Text>
                    <Text style={styles.giftInboxDescription}>
                      작물을 바로 수확 가능하게 만드는 성장 아이템입니다.
                    </Text>
                  </View>
                  <Pressable
                    style={styles.giftClaimButton}
                    onPress={() => handlePlainPress(onClaimWelcomeGift)}
                  >
                    <Text style={styles.giftClaimButtonText}>받기</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.noticeItem}>
                <Text style={styles.noticeDate}>새로운 소식</Text>
                <Text style={styles.noticeTitle}>🌱 무럭무럭 자라라 출시</Text>
                <Text style={styles.noticeBody}>
                  상점에서 1000G에 구매할 수 있습니다. 작물 하나에 사용하면 바로 수확 가능한 상태가 됩니다.
                </Text>
                {!readNoticeIds.includes(GROWTH_BOOST_NOTICE_ID) && (
                  <Pressable
                    style={styles.noticeReadButton}
                    onPress={() => handlePlainPress(() => onMarkNoticeRead(GROWTH_BOOST_NOTICE_ID))}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color="#FFF7D6" />
                    <Text style={styles.noticeReadButtonText}>읽음 확인</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.noticeItem}>
                <Text style={styles.noticeDate}>게임 이용 안내</Text>
                <Text style={styles.noticeTitle}>🏡 로컬 가든에 오신 것을 환영합니다</Text>
                <Text style={styles.noticeBody}>
                  관광지를 탐험해 씨앗을 모으고, 나만의 농장에서 지역 작물을 키워보세요.
                </Text>
                {!readNoticeIds.includes(WELCOME_NOTICE_ID) && (
                  <Pressable
                    style={styles.noticeReadButton}
                    onPress={() => handlePlainPress(() => onMarkNoticeRead(WELCOME_NOTICE_ID))}
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color="#FFF7D6" />
                    <Text style={styles.noticeReadButtonText}>읽음 확인</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              <Text style={styles.settingsSectionTitle}>메뉴 버튼 크기</Text>
              <Text style={styles.settingsDescription}>
                설정·탐험·도서관·창고 버튼의 크기를 한 번에 조절하세요.
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
                onPress={() => handlePlainPress(handleLogout)}
                disabled={loggingOut}
              >
                <Ionicons name="log-out-outline" size={19} color="#8B2F2F" />
                <Text style={styles.logoutButtonText}>
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteAccountButton,
                  pressed && styles.logoutButtonPressed,
                  deletingAccount && styles.logoutButtonDisabled,
                ]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
              >
                <Ionicons name="person-remove-outline" size={19} color="#B42318" />
                <Text style={styles.deleteAccountButtonText}>
                  {deletingAccount ? '탈퇴 처리 중...' : '회원 탈퇴'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cabinInteriorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCabinInteriorVisible(false)}
      >
        <View style={styles.cabinModalBackdrop}>
          <View style={styles.cabinModalCard}>
            {/* 상단 타이틀 바 */}
            <View style={styles.cabinModalHeader}>
              <View style={styles.cabinTitleGroup}>
                <View style={styles.cabinHeaderIconBadge}>
                  <Ionicons name="home" size={18} color="#FFE57F" />
                </View>
                <View>
                  <Text style={styles.cabinTitleText}>{farmName} 오두막</Text>
                  <Text style={styles.cabinSubtitleText}>따스한 장작불과 온기가 가득한 나의 집 🏡</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.cabinCloseBtn}
                onPress={() => handlePlainPress(() => setCabinInteriorVisible(false))}
              >
                <Ionicons name="close" size={20} color="#FFF7D6" />
              </TouchableOpacity>
            </View>

            {/* 실내 효과 알림 배너 */}
            {interiorEffect ? (
              <View style={styles.interiorEffectBanner}>
                <Ionicons name="sparkles" size={16} color="#F59E0B" />
                <Text style={styles.interiorEffectText}>{interiorEffect}</Text>
              </View>
            ) : null}

            {/* 오두막 실내 룸 그래픽 */}
            <View style={styles.roomContainer}>
              {/* 벽면 (Warm Timber Wallpaper & Wainscoting) */}
              <View style={styles.roomWall}>
                <View style={styles.wallPlankLines}>
                  <View style={styles.plankLine} />
                  <View style={styles.plankLine} />
                  <View style={styles.plankLine} />
                </View>

                {/* 벽면 장식: 창문, 괘종시계, 풍경 액자 */}
                <View style={styles.wallDecorRow}>
                  {/* 햇살 들어오는 격자 창문 */}
                  <View style={styles.roomWindow}>
                    <View style={styles.curtainLeft} />
                    <View style={styles.windowGlassPane}>
                      <View style={styles.sunBeamEffect} />
                    </View>
                    <View style={styles.curtainRight} />
                  </View>

                  {/* 앤틱 괘종시계 */}
                  <View style={styles.wallClock}>
                    <Ionicons name="time-outline" size={14} color="#FDE047" />
                  </View>

                  {/* 여행 풍경 액자 */}
                  <View style={styles.wallFrame}>
                    <Ionicons name="image" size={14} color="#60A5FA" />
                  </View>
                </View>

                {/* 벽면 몰딩 베이스보드 */}
                <View style={styles.wallBaseboard} />
              </View>

              {/* 바닥 (Cozy Hardwood Parquet Floor) */}
              <View style={styles.roomFloor}>
                <View style={styles.floorPlankRow}>
                  <View style={styles.floorPlank} />
                  <View style={styles.floorPlank} />
                  <View style={styles.floorPlank} />
                  <View style={styles.floorPlank} />
                </View>

                {/* 좌측: 벽난로 & 장작 */}
                <View style={styles.fireplaceArea}>
                  <View style={styles.brickChimney}>
                    <View style={styles.mantleShelf}>
                      <View style={styles.mantleCandle} />
                      <View style={styles.mantlePhoto} />
                    </View>
                    <View style={styles.hearthFirebox}>
                      <View style={styles.flameGlow} />
                      <Text style={styles.fireEmoji}>🔥</Text>
                    </View>
                    <View style={styles.hearthStoneBase} />
                  </View>
                  <View style={styles.woodPileSmall}>
                    <View style={styles.firewoodLog} />
                    <View style={styles.firewoodLog} />
                  </View>
                </View>

                {/* 중앙: 원형 양탄자 & 캐릭터 & 펫 */}
                <View style={styles.centralRugArea}>
                  <View style={styles.cozyRug}>
                    <View style={styles.cozyRugInner}>
                      <View style={styles.cozyRugCore} />
                    </View>
                  </View>
                  <View style={styles.indoorCharactersRow}>
                    <View style={styles.indoorPetSpot}>
                      <PetCharacter petId={petId} size={42} />
                      <View style={styles.petSleepBubble}>
                        <Text style={styles.sleepZText}>zZ</Text>
                      </View>
                    </View>
                    <View style={styles.indoorPlayerSpot}>
                      <PlayerCharacter
                        avatarId={avatarId}
                        size={52}
                        direction="down"
                        isWalking={false}
                      />
                    </View>
                  </View>
                </View>

                {/* 우측: 포근한 침대 & 책장 */}
                <View style={styles.bedroomArea}>
                  {/* 포근한 침대 */}
                  <View style={styles.cozyBed}>
                    <View style={styles.bedHeadboard} />
                    <View style={styles.bedMattress}>
                      <View style={styles.bedPillow} />
                      <View style={styles.bedBlanket}>
                        <View style={styles.blanketStitch} />
                        <View style={styles.blanketStitch} />
                      </View>
                    </View>
                  </View>

                  {/* 원목 서가 책장 */}
                  <View style={styles.indoorBookshelf}>
                    <View style={styles.shelfRow}>
                      <View style={[styles.bookSpine, { backgroundColor: '#DC2626' }]} />
                      <View style={[styles.bookSpine, { backgroundColor: '#2563EB' }]} />
                      <View style={[styles.bookSpine, { backgroundColor: '#16A34A' }]} />
                      <View style={[styles.bookSpine, { backgroundColor: '#D97706' }]} />
                    </View>
                    <View style={styles.shelfDivider} />
                    <View style={styles.shelfRow}>
                      <View style={[styles.bookSpine, { backgroundColor: '#9333EA' }]} />
                      <View style={[styles.bookSpine, { backgroundColor: '#0891B2' }]} />
                      <View style={[styles.bookSpine, { backgroundColor: '#EA580C' }]} />
                    </View>
                  </View>
                </View>

                {/* 티 테이블 & 화분 (앞마당 쪽) */}
                <View style={styles.teaTableSpot}>
                  <View style={styles.teaTableSurface}>
                    <Ionicons name="cafe" size={14} color="#D97706" />
                  </View>
                </View>
                <View style={styles.indoorPlantSpot}>
                  <Ionicons name="leaf" size={18} color="#22C55E" />
                </View>
              </View>
            </View>

            {/* 실내 인터랙션 액션 버튼 바 */}
            <View style={styles.cabinActionButtonsRow}>
              <TouchableOpacity
                style={styles.cabinActionChip}
                onPress={() => handlePlainPress(() => triggerInteriorEffect('침대에서 푹 쉬었습니다. 피로가 말끔히 풀렸습니다! ✨'))}
              >
                <Ionicons name="bed" size={16} color="#FFE57F" />
                <Text style={styles.cabinActionChipText}>침대에서 휴식</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cabinActionChip}
                onPress={() => handlePlainPress(() => triggerInteriorEffect('향긋한 허브티를 마셨습니다. 마음이 차분해집니다 🍵'))}
              >
                <Ionicons name="cafe" size={16} color="#FDBA74" />
                <Text style={styles.cabinActionChipText}>따뜻한 차 마시기</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cabinActionChip}
                onPress={() => handlePlainPress(() => triggerInteriorEffect('타닥타닥 장작 타는 소리에 온몸이 따스해집니다 🔥'))}
              >
                <Ionicons name="flame" size={16} color="#F87171" />
                <Text style={styles.cabinActionChipText}>벽난로 불 쬐기</Text>
              </TouchableOpacity>
            </View>

            {/* 밖으로 나가기 버튼 */}
            <TouchableOpacity
              style={styles.cabinExitButton}
              onPress={() => handlePlainPress(() => setCabinInteriorVisible(false))}
            >
              <Ionicons name="log-out-outline" size={18} color="#FFF7D6" />
              <Text style={styles.cabinExitButtonText}>농장으로 나가기</Text>
            </TouchableOpacity>
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
                <Text style={styles.bagEyebrow}>{farmName} 농장 보관함</Text>
                <Text style={styles.bagTitle}>창고</Text>
              </View>
              <Pressable style={styles.bagCloseButton} onPress={() => handlePlainPress(() => setBagVisible(false))}>
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

              <View style={[styles.bagSectionHeader, styles.seedSectionHeader]}>
                <Text style={styles.bagSectionTitle}>성장 아이템</Text>
                <Text style={styles.bagSectionCount}>{growthBoostCount}개</Text>
              </View>
              <View style={styles.bagItem}>
                <View style={[styles.bagItemIcon, styles.growthBoostIcon]}>
                  <Text style={styles.bagItemEmoji}>🌱</Text>
                </View>
                <View style={styles.bagItemCopy}>
                  <Text style={styles.bagItemName}>무럭무럭 자라라</Text>
                  <Text style={styles.bagItemMeta}>작물 하나를 즉시 수확 가능 상태로 만듭니다.</Text>
                </View>
              </View>
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
              <Pressable style={styles.bagCloseButton} onPress={() => handlePlainPress(() => setShopVisible(false))}>
                <Ionicons name="close" size={20} color="#FFF7D6" />
              </Pressable>
            </View>

            <ScrollView style={styles.bagContent} showsVerticalScrollIndicator={false}>
              <View style={styles.bagSectionHeader}>
                <Text style={styles.bagSectionTitle}>농장 관리 서비스</Text>
                <Text style={styles.bagSectionCount}>각 {CHANGE_SERVICE_PRICE}G</Text>
              </View>
              <View style={styles.shopServiceCard}>
                <View style={styles.shopServiceTitleRow}>
                  <Ionicons name="home" size={18} color="#7C3F1D" />
                  <Text style={styles.shopServiceTitle}>농장 이름 변경</Text>
                </View>
                <View style={styles.farmNameRow}>
                  <TextInput
                    style={styles.farmNameInput}
                    value={farmNameDraft}
                    onChangeText={setFarmNameDraft}
                    maxLength={20}
                    placeholder="농장 이름"
                    placeholderTextColor="#8A7956"
                    returnKeyType="done"
                  />
                  <Pressable
                    style={[
                      styles.farmNameSaveButton,
                      (savingFarmName ||
                        (farmNameDraft.trim() !== farmName && money < CHANGE_SERVICE_PRICE)) &&
                        styles.logoutButtonDisabled,
                    ]}
                    onPress={() => handlePlainPress(handleSaveFarmName)}
                    disabled={
                      savingFarmName ||
                      (farmNameDraft.trim() !== farmName && money < CHANGE_SERVICE_PRICE)
                    }
                  >
                    <Text style={styles.farmNameSaveButtonText}>
                      {savingFarmName ? '저장 중' : `${CHANGE_SERVICE_PRICE}G 저장`}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.shopServiceRow}>
                <View style={styles.currentAvatarCard}>
                  <View style={[styles.currentAvatarIcon, { backgroundColor: avatarDefinition.color }]}>
                    <Text style={styles.currentAvatarEmoji}>{avatarDefinition.emoji}</Text>
                    <Text style={styles.currentAvatarStyleEmoji}>{avatarDefinition.styleEmoji}</Text>
                  </View>
                  <View style={styles.currentAvatarCopy}>
                    <Text style={styles.currentAvatarName}>캐릭터 변경</Text>
                    <Text style={styles.currentAvatarDescription} numberOfLines={2}>{avatarDefinition.name}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.changeAvatarButton,
                      money < CHANGE_SERVICE_PRICE && styles.unavailableButton,
                    ]}
                    onPress={() => handlePlainPress(handlePaidCharacterChange)}
                    disabled={money < CHANGE_SERVICE_PRICE}
                  >
                    <Text style={styles.changeAvatarButtonText}>{CHANGE_SERVICE_PRICE}G</Text>
                  </Pressable>
                </View>

                <View style={styles.currentAvatarCard}>
                  <View style={styles.currentPetIcon}>
                    <PetCharacter petId={petId} size={42} />
                  </View>
                  <View style={styles.currentAvatarCopy}>
                    <Text style={styles.currentAvatarName}>동행 친구 변경</Text>
                    <Text style={styles.currentAvatarDescription} numberOfLines={2}>{petDefinition.name}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.changeAvatarButton,
                      money < CHANGE_SERVICE_PRICE && styles.unavailableButton,
                    ]}
                    onPress={() => handlePlainPress(handlePaidPetChange)}
                    disabled={money < CHANGE_SERVICE_PRICE}
                  >
                    <Text style={styles.changeAvatarButtonText}>{CHANGE_SERVICE_PRICE}G</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.bagSectionHeader, styles.shopSectionSpacing]}>
                <Text style={styles.bagSectionTitle}>농장 능력 강화</Text>
                <Text style={styles.bagSectionCount}>각 {CARE_UPGRADE_PRICE}G</Text>
              </View>
              <View style={styles.shopServiceRow}>
                <View style={styles.currentAvatarCard}>
                  <View style={[styles.currentAvatarIcon, styles.waterUpgradeIcon]}>
                    <Ionicons name="water" size={26} color="#EAF7FF" />
                  </View>
                  <View style={styles.currentAvatarCopy}>
                    <Text style={styles.currentAvatarName}>물 10초 단축</Text>
                    <Text style={styles.currentAvatarDescription} numberOfLines={2}>
                      현재 물 대기 {formatCooldownTime(waterCooldownMs)}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.changeAvatarButton,
                      money < CARE_UPGRADE_PRICE && styles.unavailableButton,
                    ]}
                    onPress={() => handlePlainPress(() => onBuyCareCooldownUpgrade('water'))}
                    disabled={money < CARE_UPGRADE_PRICE}
                  >
                    <Text style={styles.changeAvatarButtonText}>{CARE_UPGRADE_PRICE}G</Text>
                  </Pressable>
                </View>

                <View style={styles.currentAvatarCard}>
                  <View style={[styles.currentAvatarIcon, styles.sunUpgradeIcon]}>
                    <Ionicons name="sunny" size={27} color="#FFF7D6" />
                  </View>
                  <View style={styles.currentAvatarCopy}>
                    <Text style={styles.currentAvatarName}>햇빛 10초 단축</Text>
                    <Text style={styles.currentAvatarDescription} numberOfLines={2}>
                      현재 햇빛 대기 {formatCooldownTime(sunCooldownMs)}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.changeAvatarButton,
                      money < CARE_UPGRADE_PRICE && styles.unavailableButton,
                    ]}
                    onPress={() => handlePlainPress(() => onBuyCareCooldownUpgrade('sun'))}
                    disabled={money < CARE_UPGRADE_PRICE}
                  >
                    <Text style={styles.changeAvatarButtonText}>{CARE_UPGRADE_PRICE}G</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.bagSectionHeader, styles.shopSectionSpacing]}>
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
                <Text style={styles.bagSectionTitle}>성장 아이템</Text>
                <Text style={styles.bagSectionCount}>1회용</Text>
              </View>
              <View style={styles.shopCropItem}>
                <View style={[styles.bagItemIcon, styles.growthBoostIcon]}>
                  <Text style={styles.bagItemEmoji}>🌱</Text>
                </View>
                <View style={styles.bagItemCopy}>
                  <Text style={styles.bagItemName}>무럭무럭 자라라</Text>
                  <Text style={styles.bagItemMeta}>물과 햇빛 없이 작물 하나를 바로 수확 가능하게 합니다.</Text>
                </View>
                <Pressable
                  style={[styles.buyButton, money < GROWTH_BOOST_PRICE && styles.unavailableButton]}
                  onPress={() => handlePlainPress(onBuyGrowthBoost)}
                  disabled={money < GROWTH_BOOST_PRICE}
                >
                  <Text style={styles.buyButtonText}>{GROWTH_BOOST_PRICE}G 구매</Text>
                </Pressable>
              </View>

              <View style={[styles.bagSectionHeader, styles.shopSectionSpacing]}>
                <Text style={styles.bagSectionTitle}>씨앗 구매</Text>
                <Text style={styles.bagSectionCount}>가방으로 바로 지급</Text>
              </View>
              {SHOP_SEEDS.map(({ seed, price }) => (
                <View key={seed.id} style={styles.shopCropItem}>
                  <View style={styles.bagItemIcon}>
                    <SeedVisual visual={seed.visual} emoji={seed.emoji} size={44} />
                  </View>
                  <View style={styles.bagItemCopy}>
                    <Text style={styles.bagItemName}>{seed.name}</Text>
                    <Text style={styles.bagItemMeta}>{seed.description}</Text>
                  </View>
                  <Pressable
                    style={[styles.buyButton, money < price && styles.unavailableButton]}
                    onPress={() => handlePlainPress(() => onBuySeed(seed, price))}
                  >
                    <Text style={styles.buyButtonText}>{price}G 구매</Text>
                  </Pressable>
                </View>
              ))}
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

  /* === 공통: 건물 명판 & 진입 발판 === */
  buildingSignPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 26, 16, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#A17D46',
    marginBottom: 4,
    zIndex: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  buildingSignPlateActive: {
    borderColor: '#FACC15',
    backgroundColor: 'rgba(23, 37, 84, 0.92)',
    transform: [{ scale: 1.06 }],
  },
  buildingSignText: {
    color: '#FFF7D6',
    fontSize: 10,
    fontWeight: '900',
  },

  /* === 좌측: 마을 도서관 (Village Library / Codex) === */
  libraryContainer: {
    position: 'absolute',
    left: '6%',
    top: 18,
    width: 100,
    height: 130,
    alignItems: 'center',
    zIndex: 10,
  },
  libraryRoof: {
    width: 98,
    height: 42,
    backgroundColor: '#26384A',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderColor: '#17232E',
    alignItems: 'center',
  },
  libraryRoofRidge: {
    width: 84,
    height: 4,
    backgroundColor: '#3E5874',
    marginTop: 6,
    borderRadius: 2,
  },
  libraryCupola: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 9,
    backgroundColor: '#17232E',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    alignItems: 'center',
  },
  libraryCupolaSpire: {
    width: 2,
    height: 5,
    backgroundColor: '#FDE047',
  },
  libraryBody: {
    width: 90,
    height: 64,
    backgroundColor: '#324558',
    borderWidth: 2,
    borderColor: '#17232E',
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  libraryArchWindow: {
    width: 20,
    height: 14,
    backgroundColor: '#17232E',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  libraryArchGlass: {
    width: 14,
    height: 9,
    backgroundColor: '#FDE047',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    opacity: 0.9,
  },
  libraryGroundRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 4,
  },
  libraryBookWindow: {
    width: 22,
    height: 28,
    backgroundColor: '#17232E',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#4A6278',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookshelfBar: {
    width: 14,
    height: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
  },
  libraryDoor: {
    width: 26,
    height: 36,
    backgroundColor: '#5C3826',
    borderWidth: 2,
    borderColor: '#382013',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryBase: {
    width: 96,
    height: 6,
    backgroundColor: '#4B5563',
    borderRadius: 2,
  },

  /* === 중앙: 스타듀밸리 농가 오두막 (Farmhouse Cabin) === */
  farmHouseContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -85,
    top: 22,
    width: 170,
    height: 140,
    alignItems: 'center',
    zIndex: 14,
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
    left: '50%',
    marginLeft: 88,
    top: 116,
    width: 48,
    height: 68,
    alignItems: 'center',
    zIndex: 22,
  },
  mailboxGlow: {
    position: 'absolute',
    left: -7,
    top: -9,
    width: 62,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF176',
    shadowColor: '#FFF176',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 8,
  },
  mailboxPressed: {
    transform: [{ scale: 0.94 }],
  },
  mailboxFlag: {
    position: 'absolute',
    right: 2,
    top: 1,
    width: 4,
    height: 27,
    backgroundColor: '#7F1D1D',
    borderRadius: 2,
    zIndex: 3,
  },
  mailboxBox: {
    width: 42,
    height: 30,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: '#B45309',
    borderWidth: 2,
    borderColor: '#5B2B0B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mailboxPost: {
    width: 7,
    height: 27,
    backgroundColor: '#6B3A16',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#3F210B',
  },
  mailboxFoot: {
    width: 28,
    height: 5,
    borderRadius: 2,
    backgroundColor: '#4A2B14',
  },
  mailboxLabel: {
    marginTop: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: '#24492E',
    color: '#FFF7D6',
    fontSize: 8,
    fontWeight: '900',
  },
  woodPile: {
    position: 'absolute',
    left: 2,
    bottom: -4,
    zIndex: 15,
  },

  /* === 우측: 마을 창고 (Village Warehouse / Storage) === */
  warehouseContainer: {
    position: 'absolute',
    right: '6%',
    top: 18,
    width: 112,
    height: 135,
    alignItems: 'center',
    zIndex: 10,
  },
  warehouseRoof: {
    width: 106,
    height: 44,
    backgroundColor: '#6C2E0C',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 2,
    borderColor: '#3D1703',
    alignItems: 'center',
  },
  warehouseRoofRidge: {
    width: 90,
    height: 4,
    backgroundColor: '#8E4014',
    marginTop: 6,
    borderRadius: 2,
  },
  warehouseBody: {
    width: 98,
    height: 66,
    backgroundColor: '#7C3F1D',
    borderWidth: 2,
    borderColor: '#3D1703',
    borderTopWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 6,
    paddingBottom: 4,
  },
  warehouseVentRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 5,
    marginRight: 4,
  },
  warehouseVentBar: {
    width: 12,
    height: 4,
    backgroundColor: '#2E1505',
    borderRadius: 1,
  },
  warehouseDoor: {
    width: 48,
    height: 40,
    backgroundColor: '#54260D',
    borderWidth: 2,
    borderColor: '#291103',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 3,
    marginRight: 2,
  },
  warehouseDoorStrap: {
    width: 40,
    height: 3,
    backgroundColor: '#1E1714',
    borderRadius: 1,
  },
  warehouseLock: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FACC15',
    borderWidth: 1,
    borderColor: '#78350F',
  },
  warehouseBase: {
    width: 104,
    height: 6,
    backgroundColor: '#4B5563',
    borderRadius: 2,
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
  libraryActionButton: {
    backgroundColor: '#1E3A8A',
    borderColor: '#93C5FD',
  },
  warehouseActionButton: {
    backgroundColor: '#78350F',
    borderColor: '#FCD34D',
  },
  cabinActionButton: {
    backgroundColor: '#9A3412',
    borderColor: '#FDBA74',
  },
  actionBadge: {
    marginLeft: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FFF7D6',
  },
  actionBadgeText: {
    color: '#3B1E08',
    fontSize: 10,
    fontWeight: '900',
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
  growthBoostButton: {
    backgroundColor: '#3F7D3A',
    borderColor: '#B7E08A',
  },
  growthBoostIcon: {
    backgroundColor: '#DDF4B8',
    borderColor: '#7AA64A',
    borderWidth: 1,
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
  noticeBoardModal: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '72%',
    backgroundColor: '#FFF7D6',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#7C4E22',
    overflow: 'hidden',
  },
  noticeBoardHeader: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#7C4E22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noticeBoardContent: {
    padding: 16,
  },
  giftInboxCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D99A28',
    backgroundColor: '#FFF3C4',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  giftInboxIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftInboxCopy: {
    flex: 1,
  },
  giftInboxEyebrow: {
    color: '#9A5B13',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 2,
  },
  giftInboxTitle: {
    color: '#3F4C2B',
    fontSize: 14,
    fontWeight: '900',
  },
  giftInboxDescription: {
    color: '#6A624D',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    fontWeight: '600',
  },
  giftClaimButton: {
    minWidth: 58,
    height: 36,
    borderRadius: 7,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  giftClaimButtonText: {
    color: '#FFF7D6',
    fontSize: 11,
    fontWeight: '900',
  },
  giftClaimButtonDisabled: {
    opacity: 0.6,
  },
  noticeItem: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8C89A',
    backgroundColor: '#FFFDF2',
  },
  noticeDate: {
    color: '#8A6A3D',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  noticeTitle: {
    color: '#2D4A32',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 7,
  },
  noticeBody: {
    color: '#5E604E',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  noticeReadButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 7,
    backgroundColor: '#2D6A4F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  noticeReadButtonText: {
    color: '#FFF7D6',
    fontSize: 11,
    fontWeight: '900',
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
  waterUpgradeIcon: {
    backgroundColor: '#2563EB',
  },
  sunUpgradeIcon: {
    backgroundColor: '#D97706',
  },
  currentAvatarEmoji: { fontSize: 31 },
  currentAvatarStyleEmoji: { position: 'absolute', right: -4, bottom: -3, fontSize: 18 },
  currentAvatarCopy: { flex: 1 },
  currentAvatarName: { color: '#2B3F24', fontSize: 14, fontWeight: '900' },
  currentAvatarDescription: { color: '#6B5A36', fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 2 },
  changeAvatarButton: { backgroundColor: '#42592A', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, marginLeft: 8 },
  changeAvatarButtonText: { color: '#FFF7D6', fontSize: 12, fontWeight: '900' },
  shopServiceCard: {
    backgroundColor: '#F2E0A8',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D5B66E',
    padding: 11,
    marginBottom: 8,
  },
  shopServiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 9,
  },
  shopServiceTitle: {
    color: '#2B3F24',
    fontSize: 14,
    fontWeight: '900',
  },
  shopServiceRow: {
    gap: 8,
  },
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
  deleteAccountButton: {
    minHeight: 48,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E6A09A',
    backgroundColor: '#FFF1F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteAccountButtonText: {
    color: '#B42318',
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

  /* === 아늑한 오두막 실내 (Cozy Cabin Interior) === */
  cabinModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 8, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cabinModalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#3E2718',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#7C4A21',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  cabinModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2D1B10',
    borderBottomWidth: 2,
    borderColor: '#543018',
  },
  cabinTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cabinHeaderIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7C4A21',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFE57F',
  },
  cabinTitleText: {
    color: '#FFF7D6',
    fontSize: 16,
    fontWeight: '900',
  },
  cabinSubtitleText: {
    color: '#E5C07B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  cabinCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A2A14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,247,214,0.3)',
  },
  interiorEffectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#F59E0B',
  },
  interiorEffectText: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: '800',
  },
  roomContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#6B4021',
    overflow: 'hidden',
    borderBottomWidth: 2,
    borderColor: '#4A2810',
  },
  roomWall: {
    height: 100,
    backgroundColor: '#9A6335',
    borderBottomWidth: 4,
    borderColor: '#543118',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  wallPlankLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-around',
  },
  plankLine: {
    height: 1,
    backgroundColor: 'rgba(84, 49, 24, 0.4)',
  },
  wallDecorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  roomWindow: {
    width: 44,
    height: 48,
    backgroundColor: '#3E2412',
    borderWidth: 2,
    borderColor: '#291509',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  curtainLeft: {
    width: 9,
    height: '100%',
    backgroundColor: '#B91C1C',
    borderRightWidth: 1,
    borderColor: '#7F1D1D',
  },
  curtainRight: {
    width: 9,
    height: '100%',
    backgroundColor: '#B91C1C',
    borderLeftWidth: 1,
    borderColor: '#7F1D1D',
  },
  windowGlassPane: {
    flex: 1,
    height: '100%',
    backgroundColor: '#7DD3FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunBeamEffect: {
    width: 2,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  wallClock: {
    width: 24,
    height: 36,
    backgroundColor: '#451A03',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#78350F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallFrame: {
    width: 32,
    height: 26,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#CA8A04',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wallBaseboard: {
    height: 4,
    backgroundColor: '#4A2810',
  },
  roomFloor: {
    flex: 1,
    backgroundColor: '#7A431D',
    position: 'relative',
  },
  floorPlankRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
  },
  floorPlank: {
    height: 1,
    backgroundColor: 'rgba(54, 27, 8, 0.45)',
  },
  fireplaceArea: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    alignItems: 'center',
  },
  brickChimney: {
    width: 52,
    height: 70,
    backgroundColor: '#7F1D1D',
    borderWidth: 2,
    borderColor: '#450A0A',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mantleShelf: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 6,
    backgroundColor: '#5A2E14',
    borderRadius: 2,
  },
  mantleCandle: {
    position: 'absolute',
    left: 6,
    top: -8,
    width: 6,
    height: 8,
    backgroundColor: '#FEF08A',
    borderRadius: 1,
  },
  mantlePhoto: {
    position: 'absolute',
    right: 8,
    top: -10,
    width: 10,
    height: 10,
    backgroundColor: '#B45309',
    borderRadius: 2,
  },
  hearthFirebox: {
    width: 32,
    height: 32,
    backgroundColor: '#1C1917',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
  },
  fireEmoji: {
    fontSize: 16,
  },
  hearthStoneBase: {
    width: 54,
    height: 6,
    backgroundColor: '#57534E',
    borderRadius: 2,
  },
  woodPileSmall: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 3,
  },
  firewoodLog: {
    width: 14,
    height: 5,
    backgroundColor: '#451A03',
    borderRadius: 2,
  },
  centralRugArea: {
    position: 'absolute',
    left: '50%',
    marginLeft: -55,
    bottom: 14,
    width: 110,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cozyRug: {
    position: 'absolute',
    width: 104,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#9A3412',
    borderWidth: 3,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cozyRugInner: {
    width: 80,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#C2410C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cozyRugCore: {
    width: 54,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FDE68A',
  },
  indoorCharactersRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 10,
  },
  indoorPetSpot: {
    alignItems: 'center',
  },
  petSleepBubble: {
    position: 'absolute',
    top: -8,
    right: -6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  sleepZText: {
    color: '#93C5FD',
    fontSize: 8,
    fontWeight: '900',
  },
  indoorPlayerSpot: {
    alignItems: 'center',
  },
  bedroomArea: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    alignItems: 'flex-end',
  },
  cozyBed: {
    width: 54,
    height: 64,
    backgroundColor: '#451A03',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#260E02',
    padding: 2,
  },
  bedHeadboard: {
    width: '100%',
    height: 8,
    backgroundColor: '#5A2E14',
    borderRadius: 2,
    marginBottom: 2,
  },
  bedMattress: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bedPillow: {
    width: 24,
    height: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bedBlanket: {
    flex: 1,
    backgroundColor: '#991B1B',
    marginTop: 4,
    padding: 2,
    justifyContent: 'space-around',
  },
  blanketStitch: {
    height: 1,
    backgroundColor: '#FCA5A5',
    opacity: 0.5,
  },
  indoorBookshelf: {
    width: 46,
    height: 38,
    backgroundColor: '#3E200C',
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#261306',
    padding: 2,
    marginTop: 4,
    justifyContent: 'space-around',
  },
  shelfRow: {
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 2,
    alignItems: 'flex-end',
  },
  shelfDivider: {
    height: 2,
    backgroundColor: '#5A2E14',
  },
  bookSpine: {
    width: 5,
    height: 10,
    borderRadius: 1,
  },
  teaTableSpot: {
    position: 'absolute',
    left: 80,
    bottom: 8,
    zIndex: 11,
  },
  teaTableSurface: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#543018',
    borderWidth: 2,
    borderColor: '#783E1B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indoorPlantSpot: {
    position: 'absolute',
    right: 80,
    bottom: 8,
    zIndex: 11,
  },
  cabinActionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 14,
    backgroundColor: '#2D1B10',
  },
  cabinActionChip: {
    flex: 1,
    minWidth: 100,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4A2A14',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#8B5A2B',
  },
  cabinActionChipText: {
    color: '#FFF7D6',
    fontSize: 12,
    fontWeight: '800',
  },
  cabinExitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#24492E',
    height: 46,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#488055',
  },
  cabinExitButtonText: {
    color: '#FFF7D6',
    fontSize: 14,
    fontWeight: '900',
  },
});
