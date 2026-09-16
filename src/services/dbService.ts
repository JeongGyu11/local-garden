import { supabase } from '../lib/supabase';
import {
  AvatarId,
  HarvestedCrop,
  Plant,
  PlayerGender,
  Seed,
  TouristSpot,
  Coupon,
  EncyclopediaItem,
  TravelStyle,
  PetId,
} from '../types';
import {
  INITIAL_PLANTS,
  INITIAL_SEEDS,
  TOURIST_SPOTS,
  INITIAL_COUPONS,
} from '../data/mockData';

export const dbService = {
  async deleteAccount() {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) throw error;
    await supabase.auth.signOut({ scope: 'local' });
  },

  // 1. 유저 전체 데이터 초기화 및 불러오기
  async loadUserData(userId: string) {
    try {
      // 1-1. 유저 프로필 조회 or 생성
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) {
        await supabase.from('user_profiles').upsert({
          id: userId,
          nickname: '로컬 정원사',
          level: 1,
        });
      }

      const farmerName = profile?.nickname ?? '로컬 정원사';
      const gender = (profile?.gender ?? null) as PlayerGender | null;
      const travelStyle = (profile?.travel_style ?? null) as TravelStyle | null;
      const avatarId = (profile?.avatar_id ?? null) as AvatarId | null;
      const petId = (profile?.pet_id ?? null) as PetId | null;

      const { data: gameState } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!gameState) {
        await supabase.from('game_states').insert({ user_id: userId, money: 2000 });
      }
      const money = gameState?.money ?? 2000;
      const savedSettings =
        gameState?.settings && typeof gameState.settings === 'object'
          ? gameState.settings
          : {};
      const dpadScale =
        typeof savedSettings.dpadScale === 'number' ? savedSettings.dpadScale : 1;
      const menuButtonScale =
        typeof savedSettings.menuButtonScale === 'number'
          ? savedSettings.menuButtonScale
          : 1;
      const waterCooldownReductionMs =
        typeof savedSettings.waterCooldownReductionMs === 'number'
          ? savedSettings.waterCooldownReductionMs
          : 0;
      const sunCooldownReductionMs =
        typeof savedSettings.sunCooldownReductionMs === 'number'
          ? savedSettings.sunCooldownReductionMs
          : 0;
      const growthBoostCount =
        typeof savedSettings.growthBoostCount === 'number'
          ? Math.max(0, Math.floor(savedSettings.growthBoostCount))
          : 0;
      const welcomeGiftClaimed = savedSettings.welcomeGiftClaimed === true;
      const farmName =
        typeof savedSettings.farmName === 'string' && savedSettings.farmName.trim()
          ? savedSettings.farmName.trim()
          : `${farmerName.trim() || '나'}의 농장`;
      const hasCustomFarmName =
        typeof savedSettings.farmName === 'string' && Boolean(savedSettings.farmName.trim());
      const harvestedCrops: HarvestedCrop[] = Array.isArray(gameState?.harvested_crops)
        ? gameState.harvested_crops
        : [];
      const farmLayout =
        gameState?.farm_layout && typeof gameState.farm_layout === 'object'
          ? gameState.farm_layout
          : {};
      const ownedBuildings: string[] = Array.isArray(farmLayout.ownedBuildings)
        ? farmLayout.ownedBuildings
        : [];

      // 1-2. 작물(Plants) 조회
      const { data: plantsData } = await supabase
        .from('plants')
        .select('*')
        .eq('user_id', userId);

      let plants: Plant[] = [];
      if (plantsData && plantsData.length > 0) {
        plants = plantsData.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          region: p.region,
          emoji: p.emoji,
          visual: p.visual,
          growthStage: p.growth_stage,
          waterProgress: p.water_progress,
          sunProgress: p.sun_progress,
          lastWateredAt: p.last_watered_at,
          lastSunnedAt: p.last_sunned_at,
          harvestReward: p.harvest_reward,
          plotIndex: p.plot_index,
        }));
      } else {
        // DB에 없으면 초기 데이터 세팅
        plants = INITIAL_PLANTS;
        await this.syncPlants(userId, INITIAL_PLANTS);
      }

      // 1-3. 씨앗(Seeds) 조회
      const { data: seedsData } = await supabase
        .from('seeds')
        .select('*')
        .eq('user_id', userId);

      let seeds: Seed[] = [];
      if (seedsData && seedsData.length > 0) {
        seeds = seedsData.map((s) => ({
          id: s.id,
          name: s.name,
          region: s.region,
          emoji: s.emoji,
          description: s.description,
          visual: s.visual,
        }));
      } else {
        seeds = INITIAL_SEEDS;
        await this.syncSeeds(userId, INITIAL_SEEDS);
      }

      // 1-4. 방문 관광지(Visited Spots) 조회
      const { data: visitedData } = await supabase
        .from('visited_spots')
        .select('spot_id')
        .eq('user_id', userId);

      const visitedIds = new Set(visitedData ? visitedData.map((v) => v.spot_id) : []);
      const touristSpots: TouristSpot[] = TOURIST_SPOTS.map((spot) => ({
        ...spot,
        visited: visitedIds.has(spot.id),
      }));

      // 1-5. 쿠폰(Coupons) 조회
      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', userId);

      let coupons: Coupon[] = [];
      if (couponsData && couponsData.length > 0) {
        coupons = couponsData.map((c) => ({
          id: c.id,
          title: c.title,
          brand: c.brand,
          discount: c.discount,
          sourceCrop: c.source_crop,
          region: c.region,
          expiryDate: c.expiry_date,
          used: c.used,
          code: c.code,
        }));
      } else {
        coupons = INITIAL_COUPONS;
        await this.syncCoupons(userId, INITIAL_COUPONS);
      }

      // 1-6. 도감(Encyclopedia) 조회
      const { data: encData } = await supabase
        .from('encyclopedia')
        .select('*')
        .eq('user_id', userId);

      let encyclopedia: EncyclopediaItem[] = [];
      if (encData && encData.length > 0) {
        encyclopedia = encData
          .map((e) => ({
            id: e.id,
            cropName: e.crop_name,
            region: e.region,
            emoji: e.emoji,
            visual: e.visual,
            isDiscovered: e.is_discovered,
            harvestCount: e.harvest_count,
            story: e.story,
            specialtyPoint: e.specialty_point,
            seedName: e.seed_name,
            firstHarvestedAt: e.first_harvested_at,
            lastHarvestedAt: e.last_harvested_at,
          }))
          .filter((item) => item.id.startsWith('harvest_') || Boolean(item.lastHarvestedAt));
        if (encyclopedia.length !== encData.length) {
          await this.syncEncyclopedia(userId, encyclopedia);
        }
      } else {
        encyclopedia = [];
      }

      return {
        success: true,
        data: {
          plants,
          seeds,
          touristSpots,
          coupons,
          encyclopedia,
          farmerName,
          money,
          harvestedCrops,
          ownedBuildings,
          gender,
          travelStyle,
          avatarId,
          petId,
          dpadScale,
          menuButtonScale,
          waterCooldownReductionMs,
          sunCooldownReductionMs,
          growthBoostCount,
          welcomeGiftClaimed,
          farmName,
          hasCustomFarmName,
        },
      };
    } catch (error) {
      console.warn('Supabase load fallback to local:', error);
      return {
        success: false,
        data: {
          plants: INITIAL_PLANTS,
          seeds: INITIAL_SEEDS,
          touristSpots: TOURIST_SPOTS,
          coupons: INITIAL_COUPONS,
          encyclopedia: [],
          farmerName: '로컬 정원사',
          money: 2000,
          harvestedCrops: [],
          ownedBuildings: [],
          gender: null,
          travelStyle: null,
          avatarId: null,
          petId: null,
          dpadScale: 1,
          menuButtonScale: 1,
          waterCooldownReductionMs: 0,
          sunCooldownReductionMs: 0,
          growthBoostCount: 0,
          welcomeGiftClaimed: false,
          farmName: '나의 농장',
          hasCustomFarmName: false,
        },
      };
    }
  },

  async updateFarmerName(userId: string, farmerName: string) {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        nickname: farmerName,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  },

  async updateControlSettings(
    userId: string,
    settings: {
      dpadScale: number;
      menuButtonScale: number;
      farmName: string;
      waterCooldownReductionMs: number;
      sunCooldownReductionMs: number;
      growthBoostCount: number;
      welcomeGiftClaimed: boolean;
    }
  ) {
    const { error } = await supabase
      .from('game_states')
      .upsert({
        user_id: userId,
        settings,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  },

  async updatePlayerProfile(
    userId: string,
    gender: PlayerGender,
    travelStyle: TravelStyle,
    avatarId: AvatarId
  ) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        gender,
        travel_style: travelStyle,
        avatar_id: avatarId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    if (error) throw error;
  },

  async updatePet(userId: string, petId: PetId) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ pet_id: petId, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  },

  async updateGameState(
    userId: string,
    changes: {
      money?: number;
      harvestedCrops?: HarvestedCrop[];
      ownedBuildings?: string[];
    }
  ) {
    const row: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (changes.money !== undefined) row.money = changes.money;
    if (changes.harvestedCrops !== undefined) {
      row.harvested_crops = changes.harvestedCrops;
    }
    if (changes.ownedBuildings !== undefined) {
      row.farm_layout = { ownedBuildings: changes.ownedBuildings };
    }

    const { error } = await supabase.from('game_states').upsert(row);
    if (error) throw error;
  },

  // 작물 동기화
  async syncPlants(userId: string, plants: Plant[]) {
    try {
      // 기존 작물 삭제 후 재등록
      await supabase.from('plants').delete().eq('user_id', userId);
      if (plants.length > 0) {
        const rows = plants.map((p) => ({
          id: p.id,
          user_id: userId,
          name: p.name,
          species: p.species,
          region: p.region,
          emoji: p.emoji,
          visual: p.visual,
          growth_stage: p.growthStage,
          water_progress: p.waterProgress,
          sun_progress: p.sunProgress,
          last_watered_at: p.lastWateredAt,
          last_sunned_at: p.lastSunnedAt,
          harvest_reward: p.harvestReward,
          plot_index: p.plotIndex,
        }));
        await supabase.from('plants').insert(rows);
      }
    } catch (e) {
      console.error('syncPlants error:', e);
    }
  },

  // 씨앗 동기화
  async syncSeeds(userId: string, seeds: Seed[]) {
    try {
      await supabase.from('seeds').delete().eq('user_id', userId);
      if (seeds.length > 0) {
        const rows = seeds.map((s) => ({
          id: s.id,
          user_id: userId,
          name: s.name,
          region: s.region,
          emoji: s.emoji,
          description: s.description,
          visual: s.visual,
        }));
        await supabase.from('seeds').insert(rows);
      }
    } catch (e) {
      console.error('syncSeeds error:', e);
    }
  },

  // 관광지 체크인 기록 저장
  async checkInSpot(userId: string, spotId: string, spotTitle: string, region: string) {
    try {
      await supabase.from('visited_spots').upsert({
        user_id: userId,
        spot_id: spotId,
        spot_title: spotTitle,
        region: region,
      });
    } catch (e) {
      console.error('checkInSpot error:', e);
    }
  },

  // 쿠폰 동기화 및 추가
  async syncCoupons(userId: string, coupons: Coupon[]) {
    try {
      if (coupons.length > 0) {
        const rows = coupons.map((c) => ({
          id: c.id,
          user_id: userId,
          title: c.title,
          brand: c.brand,
          discount: c.discount,
          source_crop: c.sourceCrop,
          region: c.region,
          expiry_date: c.expiryDate,
          used: c.used,
          code: c.code,
        }));
        await supabase.from('coupons').upsert(rows);
      }
    } catch (e) {
      console.error('syncCoupons error:', e);
    }
  },

  // 쿠폰 사용 처리
  async markCouponUsed(couponId: string) {
    try {
      await supabase
        .from('coupons')
        .update({ used: true })
        .eq('id', couponId);
    } catch (e) {
      console.error('markCouponUsed error:', e);
    }
  },

  // 도감 동기화
  async syncEncyclopedia(userId: string, encyclopedia: EncyclopediaItem[]) {
    try {
      await supabase.from('encyclopedia').delete().eq('user_id', userId);
      if (encyclopedia.length > 0) {
        const rows = encyclopedia.map((e) => ({
          id: e.id,
          user_id: userId,
          crop_name: e.cropName,
          region: e.region,
          emoji: e.emoji,
          visual: e.visual,
          is_discovered: e.isDiscovered,
          harvest_count: e.harvestCount,
          story: e.story,
          specialty_point: e.specialtyPoint,
          seed_name: e.seedName,
          first_harvested_at: e.firstHarvestedAt,
          last_harvested_at: e.lastHarvestedAt,
        }));
        await supabase.from('encyclopedia').upsert(rows);
      }
    } catch (e) {
      console.error('syncEncyclopedia error:', e);
    }
  },
};
