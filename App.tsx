import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  INITIAL_PLANTS,
  INITIAL_SEEDS,
  TOURIST_SPOTS,
  INITIAL_COUPONS,
  INITIAL_ENCYCLOPEDIA,
} from './src/data/mockData';
import { Plant, Seed, TouristSpot, Coupon, EncyclopediaItem } from './src/types';
import { dbService, CURRENT_USER_ID } from './src/services/dbService';

import { GardenTab } from './src/components/GardenTab';
import { ExploreTab } from './src/components/ExploreTab';
import { EncyclopediaTab } from './src/components/EncyclopediaTab';
import { CouponsTab } from './src/components/CouponsTab';

import { CheckInModal } from './src/components/CheckInModal';
import { HarvestModal } from './src/components/HarvestModal';
import { CouponDetailModal } from './src/components/CouponDetailModal';

type TabType = 'garden' | 'explore' | 'encyclopedia' | 'coupons';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('garden');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  // 핵심 애플리케이션 상태 (인터랙티브 순환 구조)
  const [plants, setPlants] = useState<Plant[]>(INITIAL_PLANTS);
  const [seeds, setSeeds] = useState<Seed[]>(INITIAL_SEEDS);
  const [touristSpots, setTouristSpots] = useState<TouristSpot[]>(TOURIST_SPOTS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaItem[]>(INITIAL_ENCYCLOPEDIA);

  // 모달 상태
  const [checkInModalVisible, setCheckInModalVisible] = useState<boolean>(false);
  const [selectedSpotForCheckIn, setSelectedSpotForCheckIn] = useState<TouristSpot | null>(null);

  const [harvestModalVisible, setHarvestModalVisible] = useState<boolean>(false);
  const [harvestedPlant, setHarvestedPlant] = useState<Plant | null>(null);

  const [couponModalVisible, setCouponModalVisible] = useState<boolean>(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // 앱 실행 시 Supabase 클라우드 데이터 불러오기
  useEffect(() => {
    async function loadData() {
      try {
        const result = await dbService.loadUserData(CURRENT_USER_ID);
        if (result.data) {
          setPlants(result.data.plants);
          setSeeds(result.data.seeds);
          setTouristSpots(result.data.touristSpots);
          setCoupons(result.data.coupons);
          setEncyclopedia(result.data.encyclopedia);
          setIsSynced(true);
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

  // 3. 수확 핸들러 (수확 -> 리워드 쿠폰 생성 + 도감 카운트 증가)
  const handleHarvest = (plant: Plant) => {
    setHarvestedPlant(plant);
    setHarvestModalVisible(true);

    // 밭에서 제거 후 클라우드 동기화
    const nextPlants = plants.filter((p) => p.id !== plant.id);
    setPlants(nextPlants);
    dbService.syncPlants(CURRENT_USER_ID, nextPlants);

    // 새 리워드 쿠폰 발급 & 동기화
    const newCoupon: Coupon = {
      id: `c_${Date.now()}`,
      title: plant.harvestReward,
      brand: `${plant.region} 로컬 가든 협동조합`,
      discount: '무료 배송/교환',
      sourceCrop: `${plant.name} 수확 완료 보상`,
      region: plant.region,
      expiryDate: '2026.12.31까지',
      used: false,
      code: `HARVEST-${plant.region.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const nextCoupons = [newCoupon, ...coupons];
    setCoupons(nextCoupons);
    dbService.syncCoupons(CURRENT_USER_ID, nextCoupons);

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
  const handlePlantSeed = (seed: Seed) => {
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
      harvestReward: `${seed.region} 특산품 선물세트 배송권`,
    };
    const nextPlants = [newPlant, ...plants];
    setPlants(nextPlants);
    dbService.syncPlants(CURRENT_USER_ID, nextPlants);

    Alert.alert('🌱 파종 완료!', `[${seed.name}]을(를) 내 가든에 심었습니다. 물과 햇빛을 주어 키워보세요!`);
  };

  // 5. 관광지 위치 인증(체크인) 핸들러 -> 씨앗 획득 & 도감 오픈 & DB 저장
  const handleCheckIn = (spot: TouristSpot) => {
    // 방문 처리
    setTouristSpots((prev) =>
      prev.map((s) => (s.id === spot.id ? { ...s, visited: true } : s))
    );
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

  // 6. 쿠폰 사용 핸들러
  const handleUseCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setCouponModalVisible(true);
  };

  const handleConfirmUseCoupon = (couponId: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, used: true } : c))
    );
    dbService.markCouponUsed(couponId);
    Alert.alert('✅ 사용 완료', '쿠폰 사용 처리가 완료되었습니다.');
  };

  return (
    <View style={styles.rootWrapper}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />

        {/* 상단 앱바 */}
        <View style={styles.topAppBar}>
          <View style={styles.appBrandRow}>
            <Text style={styles.logoEmoji}>🌱</Text>
            <Text style={styles.logoText}>로컬 가든</Text>
            <View style={styles.betaPill}>
              <Text style={styles.betaPillText}>☁️ Supabase</Text>
            </View>
          </View>

        <TouchableOpacity
          style={styles.notificationBtn}
          onPress={() => Alert.alert('🔔 알림', '오늘 보성 녹차 물주기 타이머가 완료되었습니다!')}
        >
          <Ionicons name="notifications-outline" size={20} color="#1E293B" />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* 메인 탭 화면 콘텐츠 */}
      <View style={styles.mainContainer}>
        {activeTab === 'garden' && (
          <GardenTab
            plants={plants}
            seeds={seeds}
            onWater={handleWater}
            onSun={handleSun}
            onHarvest={handleHarvest}
            onPlantSeed={handlePlantSeed}
            onGoExplore={() => setActiveTab('explore')}
          />
        )}

        {activeTab === 'explore' && (
          <ExploreTab
            touristSpots={touristSpots}
            onCheckIn={handleCheckIn}
          />
        )}

        {activeTab === 'encyclopedia' && (
          <EncyclopediaTab encyclopedia={encyclopedia} />
        )}

        {activeTab === 'coupons' && (
          <CouponsTab
            coupons={coupons}
            onUseCoupon={handleUseCoupon}
          />
        )}
      </View>

      {/* 하단 네비게이션 탭 바 */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('garden')}
        >
          <Ionicons
            name={activeTab === 'garden' ? 'leaf' : 'leaf-outline'}
            size={22}
            color={activeTab === 'garden' ? '#2D6A4F' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'garden' && styles.tabLabelActive,
            ]}
          >
            내 가든
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('explore')}
        >
          <Ionicons
            name={activeTab === 'explore' ? 'compass' : 'compass-outline'}
            size={22}
            color={activeTab === 'explore' ? '#2D6A4F' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'explore' && styles.tabLabelActive,
            ]}
          >
            로컬 탐험
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('encyclopedia')}
        >
          <Ionicons
            name={activeTab === 'encyclopedia' ? 'book' : 'book-outline'}
            size={22}
            color={activeTab === 'encyclopedia' ? '#2D6A4F' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'encyclopedia' && styles.tabLabelActive,
            ]}
          >
            특산 도감
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('coupons')}
        >
          <View>
            <Ionicons
              name={activeTab === 'coupons' ? 'ticket' : 'ticket-outline'}
              size={22}
              color={activeTab === 'coupons' ? '#2D6A4F' : '#94A3B8'}
            />
            {coupons.filter((c) => !c.used).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {coupons.filter((c) => !c.used).length}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'coupons' && styles.tabLabelActive,
            ]}
          >
            쿠폰함
          </Text>
        </TouchableOpacity>
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
        onGoToCoupons={() => setActiveTab('coupons')}
      />

      <CouponDetailModal
        visible={couponModalVisible}
        coupon={selectedCoupon}
        onClose={() => setCouponModalVisible(false)}
        onConfirmUse={handleConfirmUseCoupon}
      />
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
    maxWidth: 480,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
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
  bottomTabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#2D6A4F',
    fontWeight: '800',
  },
  tabBadge: {
    position: 'absolute',
    top: -3,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
