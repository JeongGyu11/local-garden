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

import {
  INITIAL_PLANTS,
  INITIAL_SEEDS,
  INITIAL_ENCYCLOPEDIA,
} from './src/data/mockData';
import { HarvestedCrop, Plant, Seed, TouristSpot, EncyclopediaItem } from './src/types';
import { dbService, CURRENT_USER_ID } from './src/services/dbService';
import { fetchNearbyHiddenTouristSpots } from './src/services/tourApi';

import { GardenTab } from './src/components/GardenTab';
import { ExploreTab } from './src/components/ExploreTab';
import { EncyclopediaTab } from './src/components/EncyclopediaTab';
import { HarvestModal } from './src/components/HarvestModal';
import { CheckInModal } from './src/components/CheckInModal';

type TabType = 'garden' | 'explore' | 'encyclopedia';
type LocationPoint = { latitude: number; longitude: number };
type CheckInNotice = { title: string; message: string } | null;

const CHECK_IN_RADIUS_METERS = 500;
const CHECK_IN_COOLDOWN_MS = 15 * 60 * 1000;
const LEGACY_DEFAULT_PLANT_IDS = new Set(['p1', 'p2']);

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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('garden');
  const [loading, setLoading] = useState<boolean>(true);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('GPS로 주변 관광지를 찾는 중');
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [farmerName, setFarmerName] = useState<string>('나');
  const [nameDraft, setNameDraft] = useState<string>('');
  const [nameTutorialVisible, setNameTutorialVisible] = useState<boolean>(true);

  // 핵심 애플리케이션 상태 (인터랙티브 순환 구조)
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PLANTS);
  const [seeds, setSeeds] = useState<Seed[]>(INITIAL_SEEDS);
  const [harvestedCrops, setHarvestedCrops] = useState<HarvestedCrop[]>([]);
  const [money, setMoney] = useState<number>(0);
  const [touristSpots, setTouristSpots] = useState<TouristSpot[]>([]);
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaItem[]>(INITIAL_ENCYCLOPEDIA);

  // 모달 상태
  const [checkInModalVisible, setCheckInModalVisible] = useState<boolean>(false);
  const [selectedSpotForCheckIn, setSelectedSpotForCheckIn] = useState<TouristSpot | null>(null);
  const [checkInNotice, setCheckInNotice] = useState<CheckInNotice>(null);
  const [checkInCooldownUntil, setCheckInCooldownUntil] = useState<Record<string, number>>({});

  const [harvestModalVisible, setHarvestModalVisible] = useState<boolean>(false);
  const [harvestedPlant, setHarvestedPlant] = useState<Plant | null>(null);

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

      const nearbySpots = await fetchNearbyHiddenTouristSpots(
        nextLocation.latitude,
        nextLocation.longitude
      );

      if (nearbySpots.length > 0) {
        setTouristSpots(mergeVisitedState(nearbySpots, savedSpots));
        setGpsStatusText('현재 GPS 기준 TourAPI 장소를 Gemini가 분류해 표시 중');
      } else {
        setTouristSpots([]);
        setGpsStatusText('현재 위치 주변에 인증 가능한 TourAPI 관광지가 없습니다');
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
        const result = await dbService.loadUserData(CURRENT_USER_ID);
        if (result.data) {
          const cleanedPlants = result.data.plants.filter(
            (plant) => !LEGACY_DEFAULT_PLANT_IDS.has(plant.id)
          );
          setPlants(cleanedPlants);
          if (cleanedPlants.length !== result.data.plants.length) {
            dbService.syncPlants(CURRENT_USER_ID, cleanedPlants);
          }
          setSeeds(result.data.seeds);
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
  }, []);

  // 1. 물주기 핸들러
  const handleWater = (plantId: string) => {
    setPlants((prev) => {
      const nextPlants = prev.map((p) => {
        if (p.id === plantId) {
          const nextWater = Math.min(100, p.waterProgress + 25);
          const nextStage =
            nextWater >= 100 && p.sunProgress >= 80
              ? Math.min(4, p.growthStage + 1)
              : p.growthStage;
          return {
            ...p,
            waterProgress: nextWater,
            growthStage: nextStage,
          };
        }
        return p;
      });
      dbService.syncPlants(CURRENT_USER_ID, nextPlants);
      return nextPlants;
    });
  };

  // 2. 햇빛 쬐기 핸들러
  const handleSun = (plantId: string) => {
    setPlants((prev) => {
      const nextPlants = prev.map((p) => {
        if (p.id === plantId) {
          const nextSun = Math.min(100, p.sunProgress + 25);
          const nextStage =
            p.waterProgress >= 80 && nextSun >= 100
              ? Math.min(4, p.growthStage + 1)
              : p.growthStage;
          return {
            ...p,
            sunProgress: nextSun,
            growthStage: nextStage,
          };
        }
        return p;
      });
      dbService.syncPlants(CURRENT_USER_ID, nextPlants);
      return nextPlants;
    });
  };

  // 3. 수확 핸들러 (수확 -> 도감 기록 및 경험치 상승)
  const handleHarvest = (plant: Plant) => {
    setHarvestedPlant(plant);
    setHarvestModalVisible(true);

    const harvestedCrop: HarvestedCrop = {
      id: `harvest_${plant.id}_${Date.now()}`,
      name: plant.name,
      region: plant.region,
      emoji: plant.emoji,
      harvestedAt: new Date().toISOString(),
    };
    setHarvestedCrops((prev) => [harvestedCrop, ...prev]);

    // 밭에서 제거 후 클라우드 동기화
    const nextPlants = plants.filter((p) => p.id !== plant.id);
    setPlants(nextPlants);
    dbService.syncPlants(CURRENT_USER_ID, nextPlants);

    // 도감 수확 카운트 증가 & 동기화
    const nextEnc = encyclopedia.map((item) =>
      item.cropName.includes(plant.region) || item.region === plant.region
        ? { ...item, isDiscovered: true, harvestCount: item.harvestCount + 1 }
        : item
    );
    setEncyclopedia(nextEnc);
    dbService.syncEncyclopedia(CURRENT_USER_ID, nextEnc);
  };

  // 4. 씨앗 심기 핸들러
  const handlePlantSeed = (seed: Seed, plotIndex?: number) => {
    // 씨앗 보관함에서 제거 & 동기화
    const nextSeeds = seeds.filter((s) => s.id !== seed.id);
    setSeeds(nextSeeds);
    dbService.syncSeeds(CURRENT_USER_ID, nextSeeds);

    // 밭에 새 작물 등록 & 동기화
    const newPlant: Plant = {
      id: `p_${Date.now()}`,
      name: seed.name.replace(' 씨앗', ''),
      species: `${seed.region} 특산 품종`,
      region: seed.region,
      emoji: seed.emoji,
      growthStage: 0, // 씨앗 상태
      waterProgress: 20,
      sunProgress: 20,
      harvestReward: `${seed.region} 특산 마스터 배지`,
    };
    const nextPlants = [...plants];
    if (typeof plotIndex === 'number' && plotIndex >= 0 && plotIndex < 4) {
      nextPlants[plotIndex] = newPlant;
    } else {
      nextPlants.unshift(newPlant);
    }
    setPlants(nextPlants);
    dbService.syncPlants(CURRENT_USER_ID, nextPlants);

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
    dbService.checkInSpot(CURRENT_USER_ID, spot.id, spot.title, spot.region);

    // 씨앗 생성 및 지급 & 동기화
    const newSeed: Seed = {
      id: `seed_${Date.now()}`,
      name: spot.seedName,
      region: spot.region,
      emoji: spot.seedEmoji,
      description: `${spot.title} 방문 인증으로 획득한 귀한 특산 씨앗`,
    };
    const nextSeeds = [newSeed, ...seeds];
    setSeeds(nextSeeds);
    dbService.syncSeeds(CURRENT_USER_ID, nextSeeds);

    // 도감 잠금 해제 & 동기화
    const nextEnc = encyclopedia.map((item) =>
      item.region === spot.region ? { ...item, isDiscovered: true } : item
    );
    setEncyclopedia(nextEnc);
    dbService.syncEncyclopedia(CURRENT_USER_ID, nextEnc);

    setSelectedSpotForCheckIn(spot);
    setCheckInModalVisible(true);
  };

  const handleCompleteNameTutorial = () => {
    const nextName = nameDraft.trim() || '나';
    setFarmerName(nextName);
    setNameTutorialVisible(false);
  };

  const handleSellHarvestedCrop = (crop: HarvestedCrop) => {
    setHarvestedCrops((prev) => prev.filter((item) => item.id !== crop.id));
    setMoney((prev) => prev + 120);
    Alert.alert('판매 완료', `${crop.name}을(를) 판매해 120G를 벌었습니다.`);
  };

  return (
    <View style={styles.rootWrapper}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        {activeTab !== 'garden' && (
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
              money={money}
              onWater={handleWater}
              onSun={handleSun}
              onHarvest={handleHarvest}
              onPlantSeed={handlePlantSeed}
              onGoExplore={() => setActiveTab('explore')}
              onGoEncyclopedia={() => setActiveTab('encyclopedia')}
              onSellHarvestedCrop={handleSellHarvestedCrop}
            />
          )}

          {activeTab === 'explore' && (
            <ExploreTab
              touristSpots={touristSpots}
              onCheckIn={handleCheckIn}
              gpsStatusText={gpsStatusText}
              isGpsLoading={gpsLoading || loading}
              onRefreshNearby={() => loadGpsTouristSpots(touristSpots)}
            />
          )}

          {activeTab === 'encyclopedia' && (
            <EncyclopediaTab encyclopedia={encyclopedia} />
          )}
        </View>

        {/* 모달 팝업들 */}
        <CheckInModal
          visible={checkInModalVisible}
          spot={selectedSpotForCheckIn}
          onClose={() => setCheckInModalVisible(false)}
          onGoToGarden={() => setActiveTab('garden')}
        />

        <HarvestModal
          visible={harvestModalVisible}
          plant={harvestedPlant}
          onClose={() => setHarvestModalVisible(false)}
          onGoToEncyclopedia={() => setActiveTab('encyclopedia')}
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
              <Text style={styles.tutorialTitle}>정원사 이름을 알려주세요</Text>
              <Text style={styles.tutorialDesc}>
                입력한 이름으로 농장 이름이 만들어집니다.
              </Text>
              <TextInput
                style={styles.nameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="예: 지민"
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
    maxWidth: Platform.OS === 'web' ? 960 : undefined,
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
});
