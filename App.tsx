import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
  Text,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';

import {
  INITIAL_PLANTS,
  INITIAL_SEEDS,
} from './src/data/mockData';
import {
  AvatarId,
  EncyclopediaItem,
  HarvestedCrop,
  Plant,
  PlayerGender,
  PetId,
  Seed,
  TouristSpot,
  TravelStyle,
} from './src/types';
import { dbService } from './src/services/dbService';
import { fetchNearbyHiddenTouristSpots } from './src/services/tourApi';

import { GardenTab } from './src/components/GardenTab';
import { ExploreTab } from './src/components/ExploreTab';
import { EncyclopediaTab } from './src/components/EncyclopediaTab';
import { CheckInModal } from './src/components/CheckInModal';
import { AuthGate } from './src/components/AuthGate';
import { CharacterSurvey } from './src/components/CharacterSurvey';
import { PetSurvey } from './src/components/PetSurvey';
import { supabase } from './src/lib/supabase';
import { getDiscoveryRewardCount } from './src/data/discoveryRewards';

type TabType = 'garden' | 'explore' | 'encyclopedia';
type LocationPoint = { latitude: number; longitude: number };
type CheckInNotice = { title: string; message: string } | null;

const CHECK_IN_RADIUS_METERS = 500;
const CHECK_IN_COOLDOWN_MS = 15 * 60 * 1000;
const CARE_COOLDOWN_MS = 20 * 60 * 1000;
const HARVEST_SELL_PRICE = 350;
const CHANGE_SERVICE_PRICE = 500;
const CARE_UPGRADE_PRICE = 200;
const CARE_UPGRADE_REDUCTION_MS = 10 * 1000;
const GROWTH_BOOST_PRICE = 1000;
const DEFAULT_EXPLORE_RADIUS_METERS = 5000;
const CARE_PROGRESS_STEP = 50;
const WEB_PHONE_MAX_WIDTH = 430;
const LEGACY_DEFAULT_PLANT_IDS = new Set(['p1', 'p2']);
const LEGACY_DEFAULT_SEED_IDS = new Set(['s1']);

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

const normalizePlantPlot = (plant: Plant, fallbackIndex: number) => {
  const plotIndex = getPlantPlotIndex(plant, fallbackIndex);
  const hasStablePlotId = /^p_plot_\d+_/.test(plant.id);

  return {
    ...plant,
    id: hasStablePlotId ? plant.id : `p_plot_${plotIndex}_${plant.id}`,
    plotIndex,
  };
};

const getDistanceMeters = (from: LocationPoint, to: LocationPoint) => {
  const earthRadiusMeters = 6371000;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistanceForAlert = (meters: number) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

const formatCooldown = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}초`;
  }
  return `${minutes}분 ${String(seconds).padStart(2, '0')}초`;
};

const getGrowthStageFromCare = (waterProgress: number, sunProgress: number) => {
  const waterCareCount = Math.floor(waterProgress / CARE_PROGRESS_STEP);
  const sunCareCount = Math.floor(sunProgress / CARE_PROGRESS_STEP);
  return Math.min(4, waterCareCount + sunCareCount);
};

const getEffectiveCareCooldownMs = (reductionMs: number) =>
  Math.max(0, CARE_COOLDOWN_MS - reductionMs);

const getRemainingCooldownMs = (lastUsedAt: string | undefined, cooldownMs: number) => {
  if (!lastUsedAt) {
    return 0;
  }
  const lastTime = new Date(lastUsedAt).getTime();
  if (Number.isNaN(lastTime)) {
    return 0;
  }
  return Math.max(0, cooldownMs - (Date.now() - lastTime));
};

const createEncyclopediaId = (name: string, region: string) =>
  `harvest_${region}_${name}`
    .replace(/\s+/g, '_')
    .replace(/[^\w가-힣]/g, '');

const createHarvestCropName = (plant: Plant) => {
  const baseName = plant.name.replace(/\s*열매$/, '').trim();
  return `${baseName} 열매`;
};

const createHarvestStory = (plant: Plant) =>
  `${createHarvestCropName(plant)}를 수확했었다.`;

const createSpecialtyPoint = (plant: Plant) =>
  `${plant.species}에서 자란 수확 기록입니다.`;

function GameApp({ session }: { session: Session }) {
  const userId = session.user.id;
  const [activeTab, setActiveTab] = useState<TabType>('garden');
  const [loading, setLoading] = useState<boolean>(true);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('GPS로 주변 관광지를 찾는 중');
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [farmerName, setFarmerName] = useState<string>('나');
  const [nameDraft, setNameDraft] = useState<string>('');
  const [nameTutorialVisible, setNameTutorialVisible] = useState<boolean>(false);

  // 핵심 애플리케이션 상태 (인터랙티브 순환 구조)
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PLANTS);
  const [seeds, setSeeds] = useState<Seed[]>(INITIAL_SEEDS);
  const [harvestedCrops, setHarvestedCrops] = useState<HarvestedCrop[]>([]);
  const [money, setMoney] = useState<number>(2000);
  const [ownedBuildings, setOwnedBuildings] = useState<string[]>([]);
  const [avatarId, setAvatarId] = useState<AvatarId>('male_nature');
  const [characterSurveyVisible, setCharacterSurveyVisible] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(false);
  const [petId, setPetId] = useState<PetId>('meerkat');
  const [dpadScale, setDpadScale] = useState(1);
  const [menuButtonScale, setMenuButtonScale] = useState(1);
  const [waterCooldownReductionMs, setWaterCooldownReductionMs] = useState(0);
  const [sunCooldownReductionMs, setSunCooldownReductionMs] = useState(0);
  const [growthBoostCount, setGrowthBoostCount] = useState(0);
  const [welcomeGiftClaimed, setWelcomeGiftClaimed] = useState(false);
  const [farmName, setFarmName] = useState('나의 농장');
  const [petSurveyVisible, setPetSurveyVisible] = useState(false);
  const [editingPet, setEditingPet] = useState(false);
  const [touristSpots, setTouristSpots] = useState<TouristSpot[]>([]);
  const [exploreRadiusMeters, setExploreRadiusMeters] = useState(DEFAULT_EXPLORE_RADIUS_METERS);
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaItem[]>([]);

  // 모달 상태
  const [checkInModalVisible, setCheckInModalVisible] = useState<boolean>(false);
  const [selectedSpotForCheckIn, setSelectedSpotForCheckIn] = useState<TouristSpot | null>(null);
  const [checkInNotice, setCheckInNotice] = useState<CheckInNotice>(null);
  const [checkInCooldownUntil, setCheckInCooldownUntil] = useState<Record<string, number>>({});

  const mergeVisitedState = (apiSpots: TouristSpot[], savedSpots: TouristSpot[]) => {
    const visitedSpotKeys = new Set(
      savedSpots
        .filter((spot) => spot.visited)
        .flatMap((spot) => [spot.id, spot.title])
    );

    return apiSpots.map((spot) => ({
      ...spot,
      visited: visitedSpotKeys.has(spot.id) || visitedSpotKeys.has(spot.title),
    }));
  };

  const loadGpsTouristSpots = async (savedSpots: TouristSpot[] = touristSpots) => {
    setGpsLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setCurrentLocation(null);
        setTouristSpots([]);
        setGpsStatusText('위치 권한을 허용해야 현재 위치 주변 관광지를 볼 수 있어요');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCurrentLocation(nextLocation);

      let radiusMeters = DEFAULT_EXPLORE_RADIUS_METERS;
      let nearbySpots = await fetchNearbyHiddenTouristSpots(
        nextLocation.latitude,
        nextLocation.longitude,
        radiusMeters
      );

      if (nearbySpots.length < 20) {
        radiusMeters = 10000;
        setExploreRadiusMeters(radiusMeters);
        nearbySpots = await fetchNearbyHiddenTouristSpots(
          nextLocation.latitude,
          nextLocation.longitude,
          radiusMeters
        );
      } else {
        setExploreRadiusMeters(radiusMeters);
      }

      if (nearbySpots.length > 0) {
        setTouristSpots(mergeVisitedState(nearbySpots, savedSpots));
        setGpsStatusText(`현재 GPS 기준 ${Math.round(radiusMeters / 1000)}km 안 TourAPI 장소를 Groq가 분류해 표시 중`);
      } else {
        setTouristSpots([]);
        setGpsStatusText(`현재 위치 ${Math.round(radiusMeters / 1000)}km 안에 인증 가능한 TourAPI 관광지가 없습니다`);
      }
    } catch (gpsErr) {
      console.warn('GPS TourAPI load failed:', gpsErr);
      setCurrentLocation(null);
      setTouristSpots([]);
      setGpsStatusText('GPS/API 연결 실패: 새로고침을 눌러 다시 시도해주세요');
    } finally {
      setGpsLoading(false);
    }
  };

  // 앱 실행 시 Supabase 클라우드 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      try {
        const result = await dbService.loadUserData(userId);
        if (result.data) {
          const rawPlants = result.data.plants.filter(
            (plant) => !LEGACY_DEFAULT_PLANT_IDS.has(plant.id)
          );
          const cleanedPlants = rawPlants.map(normalizePlantPlot);
          setPlants(cleanedPlants);
          const shouldSyncCleanedPlants =
            cleanedPlants.length !== result.data.plants.length ||
            cleanedPlants.some((plant, index) => plant.id !== rawPlants[index]?.id);
          if (shouldSyncCleanedPlants) {
            void dbService.syncPlants(userId, cleanedPlants).catch((error) => {
              console.warn('Plant cleanup sync failed:', error);
            });
          }
          const cleanedSeeds = result.data.seeds.filter(
            (seed) => !LEGACY_DEFAULT_SEED_IDS.has(seed.id)
          );
          setSeeds(cleanedSeeds);
          if (cleanedSeeds.length !== result.data.seeds.length) {
            dbService.syncSeeds(userId, cleanedSeeds);
          }
          setFarmerName(result.data.farmerName);
          setNameDraft(result.data.hasCustomFarmName ? result.data.farmName : '');
          setNameTutorialVisible(!result.data.hasCustomFarmName);
          setMoney(result.data.money);
          setHarvestedCrops(result.data.harvestedCrops);
          setOwnedBuildings(result.data.ownedBuildings);
          if (result.data.avatarId) {
            setAvatarId(result.data.avatarId);
          }
          const needsCharacter = !result.data.gender || !result.data.travelStyle || !result.data.avatarId;
          setCharacterSurveyVisible(needsCharacter);
          setEditingCharacter(false);
          if (result.data.petId) {
            setPetId(result.data.petId);
          }
          setDpadScale(result.data.dpadScale);
          setMenuButtonScale(result.data.menuButtonScale);
          setWaterCooldownReductionMs(result.data.waterCooldownReductionMs);
          setSunCooldownReductionMs(result.data.sunCooldownReductionMs);
          setGrowthBoostCount(result.data.growthBoostCount);
          setWelcomeGiftClaimed(result.data.welcomeGiftClaimed);
          setFarmName(result.data.farmName);
          setPetSurveyVisible(!needsCharacter && !result.data.petId);
          setEditingPet(false);
          setEncyclopedia(result.data.encyclopedia);
          await loadGpsTouristSpots(result.data.touristSpots);
        }
      } catch (err) {
        console.warn('DB Load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  // 1. 물주기 핸들러
  const handleWater = async (plantId: string) => {
    const targetPlant = plants.find((plant) => plant.id === plantId);
    if (!targetPlant) return;
    const remainingMs = getRemainingCooldownMs(
      targetPlant.lastWateredAt,
      getEffectiveCareCooldownMs(waterCooldownReductionMs)
    );
    if (remainingMs > 0) {
      Alert.alert('아직 물을 줄 수 없어요', `${formatCooldown(remainingMs)} 뒤에 다시 물을 줄 수 있어요.`);
      return;
    }

    const nextWater = Math.min(100, targetPlant.waterProgress + CARE_PROGRESS_STEP);
    const nextPlant = {
      ...targetPlant,
      waterProgress: nextWater,
      growthStage: getGrowthStageFromCare(nextWater, targetPlant.sunProgress),
      lastWateredAt: new Date().toISOString(),
    };
    try {
      await dbService.savePlant(userId, nextPlant);
      setPlants((prev) => prev.map((plant) => (plant.id === plantId ? nextPlant : plant)));
    } catch (error) {
      console.warn('Plant watering save failed:', error);
      Alert.alert('저장 실패', '물주기를 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    }
  };

  // 2. 햇빛 쬐기 핸들러
  const handleSun = async (plantId: string) => {
    const targetPlant = plants.find((plant) => plant.id === plantId);
    if (!targetPlant) return;
    const remainingMs = getRemainingCooldownMs(
      targetPlant.lastSunnedAt,
      getEffectiveCareCooldownMs(sunCooldownReductionMs)
    );
    if (remainingMs > 0) {
      Alert.alert('아직 햇빛을 줄 수 없어요', `${formatCooldown(remainingMs)} 뒤에 다시 햇빛을 줄 수 있어요.`);
      return;
    }

    const nextSun = Math.min(100, targetPlant.sunProgress + CARE_PROGRESS_STEP);
    const nextPlant = {
      ...targetPlant,
      sunProgress: nextSun,
      growthStage: getGrowthStageFromCare(targetPlant.waterProgress, nextSun),
      lastSunnedAt: new Date().toISOString(),
    };
    try {
      await dbService.savePlant(userId, nextPlant);
      setPlants((prev) => prev.map((plant) => (plant.id === plantId ? nextPlant : plant)));
    } catch (error) {
      console.warn('Plant sunlight save failed:', error);
      Alert.alert('저장 실패', '햇빛 주기를 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    }
  };

  // 3. 수확 핸들러 (수확 -> 도감 기록 및 경험치 상승)
  const handleHarvest = async (plant: Plant) => {
    try {
      await dbService.deletePlant(userId, plant.id);
    } catch (error) {
      console.warn('Plant harvest delete failed:', error);
      Alert.alert('저장 실패', '수확 상태를 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
      return;
    }
    const harvestCropName = createHarvestCropName(plant);
    const harvestedCrop: HarvestedCrop = {
      id: `harvest_${plant.id}_${Date.now()}`,
      name: harvestCropName,
      region: plant.region,
      emoji: plant.emoji,
      visual: plant.visual,
      harvestedAt: new Date().toISOString(),
    };
    const nextHarvestedCrops = [harvestedCrop, ...harvestedCrops];
    setHarvestedCrops(nextHarvestedCrops);
    dbService.updateGameState(userId, { harvestedCrops: nextHarvestedCrops });

    // 밭에서 제거 후 클라우드 동기화
    const nextPlants = plants.filter((p) => p.id !== plant.id);
    setPlants(nextPlants);

    // 수확한 작물 자체를 기준으로 도감 기록 생성 및 갱신
    const encyclopediaId = createEncyclopediaId(harvestCropName, plant.region);
    const existingEntry = encyclopedia.find((item) => item.id === encyclopediaId);
    const nextEntry: EncyclopediaItem = {
      id: encyclopediaId,
      cropName: harvestCropName,
      region: plant.region,
      emoji: plant.emoji,
      visual: plant.visual,
      isDiscovered: true,
      harvestCount: (existingEntry?.harvestCount ?? 0) + 1,
      story: existingEntry?.story ?? createHarvestStory(plant),
      specialtyPoint: existingEntry?.specialtyPoint ?? createSpecialtyPoint(plant),
      seedName: plant.species,
      firstHarvestedAt: existingEntry?.firstHarvestedAt ?? harvestedCrop.harvestedAt,
      lastHarvestedAt: harvestedCrop.harvestedAt,
    };
    const nextEnc = existingEntry
      ? encyclopedia.map((item) => (item.id === encyclopediaId ? nextEntry : item))
      : [nextEntry, ...encyclopedia];
    setEncyclopedia(nextEnc);
    dbService.syncEncyclopedia(userId, nextEnc);
    Alert.alert('수확 완료', `${harvestCropName}을(를) 수확했습니다.`);
  };

  // 4. 씨앗 심기 핸들러
  const handlePlantSeed = async (seed: Seed, plotIndex?: number) => {
    const occupiedPlotIndexes = new Set(
      plants.map((plant, index) => getPlantPlotIndex(plant, index))
    );
    const targetPlotIndex =
      typeof plotIndex === 'number' && plotIndex >= 0 && plotIndex < 4
        ? plotIndex
        : [0, 1, 2, 3].find((index) => !occupiedPlotIndexes.has(index));

    if (targetPlotIndex === undefined) {
      Alert.alert('빈 밭이 없어요', '수확하거나 빈 밭으로 이동한 뒤 다시 심어주세요.');
      return;
    }

    // 작물을 DB에 먼저 저장한 뒤 씨앗을 제거해야 저장 실패로 작물이 사라지지 않는다.
    const newPlant: Plant = {
      id: `p_plot_${targetPlotIndex}_${Date.now()}`,
      name: seed.name.replace(' 씨앗', ''),
      species: seed.name,
      region: seed.region,
      emoji: seed.emoji,
      visual: seed.visual,
      plotIndex: targetPlotIndex,
      growthStage: 0, // 씨앗 상태
      waterProgress: 0,
      sunProgress: 0,
      lastWateredAt: undefined,
      lastSunnedAt: undefined,
      harvestReward: `${seed.region} 특산 마스터 배지`,
    };
    const nextPlants = [
      ...plants.filter((plant, index) => getPlantPlotIndex(plant, index) !== targetPlotIndex),
      newPlant,
    ];
    const nextSeeds = seeds.filter((storedSeed) => storedSeed.id !== seed.id);

    try {
      await dbService.savePlant(userId, newPlant);
      await dbService.deleteSeed(userId, seed.id);
    } catch (error) {
      console.warn('Plant seed save failed:', error);
      try {
        await dbService.deletePlant(userId, newPlant.id);
      } catch (rollbackError) {
        console.warn('Plant seed rollback failed:', rollbackError);
      }
      Alert.alert('파종 저장 실패', '씨앗은 사용되지 않았습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
      return;
    }

    setSeeds(nextSeeds);
    setPlants(nextPlants);

    Alert.alert('🌱 파종 완료!', `[${seed.name}]을(를) 내 가든에 심었습니다. 물과 햇빛을 주어 키워보세요!`);
  };

  // 5. 관광지 위치 인증(체크인) 핸들러 -> 씨앗 획득 & 도감 오픈 & DB 저장
  const handleCheckIn = async (spot: TouristSpot) => {
    const now = Date.now();
    const cooldownUntil = checkInCooldownUntil[spot.id];
    if (spot.visited && cooldownUntil && cooldownUntil > now) {
      setCheckInNotice({
        title: '씨앗 재인증 대기 중',
        message: `${spot.title} 씨앗은 이미 받았습니다. ${formatCooldown(cooldownUntil - now)} 뒤에 다시 인증할 수 있어요.`,
      });
      return;
    }

    if (spot.latitude === undefined || spot.longitude === undefined) {
      setCheckInNotice({
        title: 'GPS 인증 불가',
        message: '이 관광지는 좌표 정보가 없어 위치 인증을 진행할 수 없습니다.',
      });
      return;
    }

    let activeLocation: LocationPoint;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setCheckInNotice({
          title: '위치 권한 필요',
          message: '관광지 방문 인증을 위해 위치 권한을 허용해주세요.',
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      activeLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCurrentLocation(activeLocation);
    } catch (locationErr) {
      console.warn('Check-in location error:', locationErr);
      setCheckInNotice({
        title: '현재 위치 확인 실패',
        message: 'GPS 위치를 가져오지 못했습니다. 위치 권한과 브라우저/기기 위치 설정을 확인해주세요.',
      });
      return;
    }

    const distance = getDistanceMeters(activeLocation, {
      latitude: spot.latitude,
      longitude: spot.longitude,
    });

    if (distance > CHECK_IN_RADIUS_METERS) {
      setCheckInNotice({
        title: '아직 관광지 근처가 아니에요',
        message: `${spot.title}에서 ${formatDistanceForAlert(distance)} 떨어져 있습니다. ${CHECK_IN_RADIUS_METERS}m 안으로 들어가면 씨앗을 받을 수 있어요.`,
      });
      return;
    }

    // 방문 처리
    setTouristSpots((prev) =>
      prev.map((s) => (s.id === spot.id ? { ...s, visited: true } : s))
    );
    setCheckInCooldownUntil((prev) => ({
      ...prev,
      [spot.id]: Date.now() + CHECK_IN_COOLDOWN_MS,
    }));
    dbService.checkInSpot(userId, spot.id, spot.title, spot.region);

    // 씨앗 생성 및 지급 & 동기화
    const rewardCount = getDiscoveryRewardCount(spot);
    const rewardTimestamp = Date.now();
    const newSeeds: Seed[] = Array.from({ length: rewardCount }, (_, index) => ({
      id: `seed_${rewardTimestamp}_${index}`,
      name: spot.seedName,
      region: spot.region,
      emoji: spot.seedEmoji,
      visual: spot.seedVisual,
      description: `${spot.title} 방문 인증으로 획득한 귀한 특산 씨앗`,
    }));
    const nextSeeds = [...newSeeds, ...seeds];
    setSeeds(nextSeeds);
    dbService.syncSeeds(userId, nextSeeds);

    // 도감 잠금 해제 & 동기화
    const nextEnc = encyclopedia.map((item) =>
      item.region === spot.region ? { ...item, isDiscovered: true } : item
    );
    setEncyclopedia(nextEnc);
    dbService.syncEncyclopedia(userId, nextEnc);

    setSelectedSpotForCheckIn(spot);
    setCheckInModalVisible(true);
  };

  const handleCompleteNameTutorial = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      Alert.alert('농장 이름', '농장 이름을 입력해주세요.');
      return;
    }
    try {
      await dbService.updateControlSettings(userId, {
        dpadScale,
        menuButtonScale,
        waterCooldownReductionMs,
        sunCooldownReductionMs,
        growthBoostCount,
        welcomeGiftClaimed,
        farmName: nextName,
      });
      setFarmName(nextName);
      setNameTutorialVisible(false);
    } catch (error) {
      console.warn('Farmer name save error:', error);
      Alert.alert('이름 저장 실패', '인터넷 연결을 확인하고 다시 시도해주세요.');
    }
  };

  const handleChangeFarmName = async (nextName: string) => {
    const normalizedName = nextName.trim();
    if (!normalizedName) {
      throw new Error('농장 이름을 입력해주세요.');
    }
    if (normalizedName !== farmName) {
      if (money < CHANGE_SERVICE_PRICE) {
        throw new Error(`농장 이름 변경에는 ${CHANGE_SERVICE_PRICE}G가 필요합니다.`);
      }
      const nextMoney = money - CHANGE_SERVICE_PRICE;
      setMoney(nextMoney);
      await dbService.updateGameState(userId, { money: nextMoney });
    }
    await dbService.updateControlSettings(userId, {
      dpadScale,
      menuButtonScale,
      waterCooldownReductionMs,
      sunCooldownReductionMs,
      growthBoostCount,
      welcomeGiftClaimed,
      farmName: normalizedName,
    });
    setFarmName(normalizedName);
  };

  const handleControlSettingsChange = async (settings: {
    dpadScale: number;
    menuButtonScale: number;
    farmName: string;
    waterCooldownReductionMs: number;
    sunCooldownReductionMs: number;
  }) => {
    setDpadScale(settings.dpadScale);
    setMenuButtonScale(settings.menuButtonScale);
    setWaterCooldownReductionMs(settings.waterCooldownReductionMs);
    setSunCooldownReductionMs(settings.sunCooldownReductionMs);
    await dbService.updateControlSettings(userId, {
      ...settings,
      growthBoostCount,
      welcomeGiftClaimed,
    });
  };

  const handleBuyCareCooldownUpgrade = async (type: 'water' | 'sun') => {
    if (money < CARE_UPGRADE_PRICE) {
      Alert.alert('골드가 부족해요', `${CARE_UPGRADE_PRICE - money}G가 더 필요합니다.`);
      return;
    }

    const nextMoney = money - CARE_UPGRADE_PRICE;
    const nextWaterReduction =
      type === 'water'
        ? waterCooldownReductionMs + CARE_UPGRADE_REDUCTION_MS
        : waterCooldownReductionMs;
    const nextSunReduction =
      type === 'sun'
        ? sunCooldownReductionMs + CARE_UPGRADE_REDUCTION_MS
        : sunCooldownReductionMs;

    setMoney(nextMoney);
    setWaterCooldownReductionMs(nextWaterReduction);
    setSunCooldownReductionMs(nextSunReduction);
    await dbService.updateGameState(userId, { money: nextMoney });
    await dbService.updateControlSettings(userId, {
      dpadScale,
      menuButtonScale,
      farmName,
      waterCooldownReductionMs: nextWaterReduction,
      sunCooldownReductionMs: nextSunReduction,
      growthBoostCount,
      welcomeGiftClaimed,
    });
    Alert.alert(
      '강화 완료',
      `${type === 'water' ? '물주기' : '햇빛쬐기'} 대기 시간이 영구적으로 10초 줄었습니다.`
    );
  };

  const handleBuyGrowthBoost = async () => {
    if (money < GROWTH_BOOST_PRICE) {
      Alert.alert('골드가 부족해요', `${GROWTH_BOOST_PRICE - money}G가 더 필요합니다.`);
      return;
    }

    const nextMoney = money - GROWTH_BOOST_PRICE;
    const nextCount = growthBoostCount + 1;
    setMoney(nextMoney);
    setGrowthBoostCount(nextCount);
    await dbService.updateGameState(userId, { money: nextMoney });
    await dbService.updateControlSettings(userId, {
      dpadScale,
      menuButtonScale,
      farmName,
      waterCooldownReductionMs,
      sunCooldownReductionMs,
      growthBoostCount: nextCount,
      welcomeGiftClaimed,
    });
    Alert.alert('구매 완료', '무럭무럭 자라라를 창고에 넣었습니다.');
  };

  const handleUseGrowthBoost = async (plantId: string) => {
    if (growthBoostCount <= 0) {
      Alert.alert('아이템 부족', '상점에서 무럭무럭 자라라를 구매해주세요.');
      return;
    }

    const nextPlants = plants.map((plant) =>
      plant.id === plantId
        ? { ...plant, growthStage: 4, waterProgress: 100, sunProgress: 100 }
        : plant
    );
    const nextCount = growthBoostCount - 1;
    const boostedPlant = nextPlants.find((plant) => plant.id === plantId);
    if (!boostedPlant) return;
    await dbService.savePlant(userId, boostedPlant);
    setPlants(nextPlants);
    setGrowthBoostCount(nextCount);
    await dbService.updateControlSettings(userId, {
      dpadScale,
      menuButtonScale,
      farmName,
      waterCooldownReductionMs,
      sunCooldownReductionMs,
      growthBoostCount: nextCount,
      welcomeGiftClaimed,
    });
    Alert.alert('무럭무럭!', '작물이 바로 수확 가능한 상태가 되었습니다.');
  };

  const handleClaimWelcomeGift = async () => {
    if (welcomeGiftClaimed) {
      Alert.alert('수령 완료', '신규 유저 선물은 한 번만 받을 수 있습니다.');
      return;
    }

    const nextCount = growthBoostCount + 5;
    setGrowthBoostCount(nextCount);
    setWelcomeGiftClaimed(true);
    await dbService.updateControlSettings(userId, {
      dpadScale,
      menuButtonScale,
      farmName,
      waterCooldownReductionMs,
      sunCooldownReductionMs,
      growthBoostCount: nextCount,
      welcomeGiftClaimed: true,
    });
    Alert.alert('선물 수령 완료', '무럭무럭 자라라 5개를 창고에 넣었습니다.');
  };

  const handleSellHarvestedCrop = (crop: HarvestedCrop) => {
    const nextCrops = harvestedCrops.filter((item) => item.id !== crop.id);
    const nextMoney = money + HARVEST_SELL_PRICE;
    setHarvestedCrops(nextCrops);
    setMoney(nextMoney);
    dbService.updateGameState(userId, {
      money: nextMoney,
      harvestedCrops: nextCrops,
    });
    Alert.alert('판매 완료', `${crop.name}을(를) 판매해 ${HARVEST_SELL_PRICE}G를 벌었습니다.`);
  };

  const handleBuySeed = (seed: Seed, price: number) => {
    if (money < price) {
      Alert.alert('골드가 부족해요', `${price - money}G가 더 필요합니다.`);
      return;
    }
    const purchasedSeed = { ...seed, id: `${seed.id}_${Date.now()}` };
    const nextSeeds = [purchasedSeed, ...seeds];
    const nextMoney = money - price;
    setSeeds(nextSeeds);
    setMoney(nextMoney);
    dbService.syncSeeds(userId, nextSeeds);
    dbService.updateGameState(userId, { money: nextMoney });
    Alert.alert('구매 완료', `${seed.name}을(를) 가방에 넣었습니다.`);
  };

  const handleCompleteCharacterSurvey = async (
    gender: PlayerGender,
    travelStyle: TravelStyle,
    nextAvatarId: AvatarId
  ) => {
    if (editingCharacter && nextAvatarId !== avatarId) {
      if (money < CHANGE_SERVICE_PRICE) {
        Alert.alert('골드가 부족해요', `캐릭터 변경에는 ${CHANGE_SERVICE_PRICE}G가 필요합니다.`);
        return;
      }
      const nextMoney = money - CHANGE_SERVICE_PRICE;
      setMoney(nextMoney);
      await dbService.updateGameState(userId, { money: nextMoney });
    }
    await dbService.updatePlayerProfile(userId, gender, travelStyle, nextAvatarId);
    setAvatarId(nextAvatarId);
    setCharacterSurveyVisible(false);
    setEditingCharacter(false);
    if (!editingCharacter) {
      setPetSurveyVisible(true);
    }
  };

  const handleCompletePetSurvey = async (nextPetId: PetId) => {
    if (editingPet && nextPetId !== petId) {
      if (money < CHANGE_SERVICE_PRICE) {
        Alert.alert('골드가 부족해요', `동행 친구 변경에는 ${CHANGE_SERVICE_PRICE}G가 필요합니다.`);
        return;
      }
      const nextMoney = money - CHANGE_SERVICE_PRICE;
      setMoney(nextMoney);
      await dbService.updateGameState(userId, { money: nextMoney });
    }
    await dbService.updatePet(userId, nextPetId);
    setPetId(nextPetId);
    setPetSurveyVisible(false);
    setEditingPet(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const handleDeleteAccount = async () => {
    await dbService.deleteAccount();
  };

  if (loading) {
    return (
      <View style={styles.gameLoadingScreen}>
        <Text style={styles.gameLoadingEmoji}>🌱</Text>
        <Text style={styles.gameLoadingText}>농장을 준비하고 있어요</Text>
      </View>
    );
  }

  if (characterSurveyVisible) {
    return (
      <CharacterSurvey
        onComplete={handleCompleteCharacterSurvey}
        initialAvatarId={editingCharacter ? avatarId : undefined}
        mode={editingCharacter ? 'edit' : 'create'}
        onCancel={editingCharacter ? () => {
          setCharacterSurveyVisible(false);
          setEditingCharacter(false);
        } : undefined}
      />
    );
  }

  if (petSurveyVisible) {
    return (
      <PetSurvey
        onComplete={handleCompletePetSurvey}
        initialPetId={editingPet ? petId : undefined}
        mode={editingPet ? 'edit' : 'create'}
        onCancel={editingPet ? () => {
          setPetSurveyVisible(false);
          setEditingPet(false);
        } : undefined}
      />
    );
  }

  return (
    <View style={styles.rootWrapper}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        {activeTab !== 'garden' && activeTab !== 'explore' && (
          <View style={styles.topAppBar}>
            <TouchableOpacity style={styles.backToGardenBtn} onPress={() => setActiveTab('garden')}>
              <Ionicons name="chevron-back" size={18} color="#1B4332" />
              <Text style={styles.backToGardenText}>농장으로</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 메인 탭 화면 콘텐츠 */}
        <View style={styles.mainContainer}>
          {activeTab === 'garden' && (
            <GardenTab
              plants={plants}
              seeds={seeds}
              harvestedCrops={harvestedCrops}
              farmerName={farmerName}
              farmName={farmName}
              money={money}
              ownedBuildings={ownedBuildings}
              avatarId={avatarId}
              petId={petId}
              dpadScale={dpadScale}
              menuButtonScale={menuButtonScale}
              waterCooldownReductionMs={waterCooldownReductionMs}
              sunCooldownReductionMs={sunCooldownReductionMs}
              growthBoostCount={growthBoostCount}
              welcomeGiftClaimed={welcomeGiftClaimed}
              onWater={handleWater}
              onSun={handleSun}
              onHarvest={handleHarvest}
              onPlantSeed={handlePlantSeed}
              onGoExplore={() => setActiveTab('explore')}
              onGoEncyclopedia={() => setActiveTab('encyclopedia')}
              onSellHarvestedCrop={handleSellHarvestedCrop}
              onBuySeed={handleBuySeed}
              onBuyCareCooldownUpgrade={handleBuyCareCooldownUpgrade}
              onBuyGrowthBoost={handleBuyGrowthBoost}
              onUseGrowthBoost={handleUseGrowthBoost}
              onClaimWelcomeGift={handleClaimWelcomeGift}
              onChangeCharacter={() => {
                setEditingCharacter(true);
                setCharacterSurveyVisible(true);
              }}
              onChangePet={() => {
                setEditingPet(true);
                setPetSurveyVisible(true);
              }}
              onChangeFarmName={handleChangeFarmName}
              onControlSettingsChange={(settings) =>
                handleControlSettingsChange({
                  ...settings,
                  farmName,
                  waterCooldownReductionMs,
                  sunCooldownReductionMs,
                })
              }
              onLogout={handleLogout}
              onDeleteAccount={handleDeleteAccount}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreTab
              touristSpots={touristSpots}
              onCheckIn={handleCheckIn}
              onGoToGarden={() => setActiveTab('garden')}
              gpsStatusText={gpsStatusText}
              isGpsLoading={gpsLoading || loading}
              exploreRadiusMeters={exploreRadiusMeters}
              onRefreshNearby={() => loadGpsTouristSpots(touristSpots)}
            />
          )}

          {activeTab === 'encyclopedia' && (
            <EncyclopediaTab encyclopedia={encyclopedia} avatarId={avatarId} petId={petId} />
          )}
        </View>

        {/* 모달 팝업들 */}
        <CheckInModal
          visible={checkInModalVisible}
          spot={selectedSpotForCheckIn}
          onClose={() => setCheckInModalVisible(false)}
          onGoToGarden={() => setActiveTab('garden')}
        />

        <Modal
          visible={checkInNotice !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setCheckInNotice(null)}
        >
          <View style={styles.noticeBackdrop}>
            <View style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <Ionicons name="location" size={26} color="#FFF8D9" />
              </View>
              <Text style={styles.noticeTitle}>{checkInNotice?.title}</Text>
              <Text style={styles.noticeMessage}>{checkInNotice?.message}</Text>
              <TouchableOpacity style={styles.noticeButton} onPress={() => setCheckInNotice(null)}>
                <Text style={styles.noticeButtonText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={nameTutorialVisible}
          transparent
          animationType="fade"
          onRequestClose={handleCompleteNameTutorial}
        >
          <View style={styles.tutorialBackdrop}>
            <View style={styles.tutorialCard}>
              <Text style={styles.tutorialEyebrow}>로컬 가든 시작하기</Text>
              <Text style={styles.tutorialTitle}>농장 이름을 정해주세요</Text>
              <Text style={styles.tutorialDesc}>
                처음 정한 농장 이름은 설정에서 다시 변경할 수 있습니다.
              </Text>
              <TextInput
                style={styles.nameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="예: 지민이의 농장"
                placeholderTextColor="#94A3B8"
                maxLength={10}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCompleteNameTutorial}
              />
              <TouchableOpacity style={styles.tutorialButton} onPress={handleCompleteNameTutorial}>
                <Text style={styles.tutorialButtonText}>내 농장으로 가기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return <AuthGate>{(session) => <GameApp session={session} />}</AuthGate>;
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? WEB_PHONE_MAX_WIDTH : undefined,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  topAppBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  appBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centerBrandRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    pointerEvents: 'none',
  },
  backToGardenBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 3,
  },
  backToGardenText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1B4332',
  },
  logoEmoji: {
    fontSize: 20,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B4332',
    letterSpacing: -0.3,
  },
  betaPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 4,
  },
  betaPillText: {
    fontSize: 10,
    color: '#2D6A4F',
    fontWeight: '700',
  },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tutorialBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    paddingHorizontal: 24,
  },
  noticeBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 35, 24, 0.5)',
    paddingHorizontal: 24,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    padding: 22,
    borderWidth: 3,
    borderColor: '#B98043',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 5,
  },
  noticeIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A5A2B',
    borderWidth: 3,
    borderColor: '#6B3F1D',
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#3A2A18',
    textAlign: 'center',
    marginBottom: 8,
  },
  noticeMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5C4B2E',
    lineHeight: 20,
    textAlign: 'center',
  },
  noticeButton: {
    height: 46,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D6840',
    borderRadius: 8,
    marginTop: 18,
    borderWidth: 2,
    borderColor: '#1F4E31',
  },
  noticeButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFF8D9',
  },
  tutorialCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFDF2',
    borderRadius: 8,
    padding: 22,
    borderWidth: 2,
    borderColor: '#D9C48C',
  },
  tutorialEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2D6A4F',
    marginBottom: 8,
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1B4332',
  },
  tutorialDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 16,
  },
  nameInput: {
    height: 48,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B7C99D',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  tutorialButton: {
    height: 48,
    borderRadius: 6,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  tutorialButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gameLoadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6F0D7',
    gap: 12,
  },
  gameLoadingEmoji: {
    fontSize: 48,
  },
  gameLoadingText: {
    color: '#2D6A4F',
    fontSize: 15,
    fontWeight: '900',
  },
});
