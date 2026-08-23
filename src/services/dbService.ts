import { supabase } from '../lib/supabase';
import { Plant, Seed, TouristSpot, Coupon, EncyclopediaItem } from '../types';
import {
  INITIAL_PLANTS,
  INITIAL_SEEDS,
  TOURIST_SPOTS,
  INITIAL_COUPONS,
  INITIAL_ENCYCLOPEDIA,
} from '../data/mockData';

export const CURRENT_USER_ID = 'user_gardener_01'; // 기본 고유 유저 ID

export const dbService = {
  // 1. 유저 전체 데이터 초기화 및 불러오기
  async loadUserData(userId: string = CURRENT_USER_ID) {
    try {
      // 1-1. 유저 프로필 조회 or 생성
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile) {
        await supabase.from('user_profiles').upsert({
          id: userId,
          nickname: '로컬 정원사',
          level: 3,
        });
      }

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
          growthStage: p.growth_stage,
          waterProgress: p.water_progress,
          sunProgress: p.sun_progress,
          harvestReward: p.harvest_reward,
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
        encyclopedia = encData.map((e) => ({
          id: e.id,
          cropName: e.crop_name,
          region: e.region,
          emoji: e.emoji,
          isDiscovered: e.is_discovered,
          harvestCount: e.harvest_count,
          story: e.story,
          specialtyPoint: e.specialty_point,
        }));
      } else {
        encyclopedia = INITIAL_ENCYCLOPEDIA;
        await this.syncEncyclopedia(userId, INITIAL_ENCYCLOPEDIA);
      }

      return {
        success: true,
        data: {
          plants,
          seeds,
          touristSpots,
          coupons,
          encyclopedia,
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
          encyclopedia: INITIAL_ENCYCLOPEDIA,
        },
      };
    }
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
          growth_stage: p.growthStage,
          water_progress: p.waterProgress,
          sun_progress: p.sunProgress,
          harvest_reward: p.harvestReward,
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
      if (encyclopedia.length > 0) {
        const rows = encyclopedia.map((e) => ({
          id: e.id,
          user_id: userId,
          crop_name: e.cropName,
          region: e.region,
          emoji: e.emoji,
          is_discovered: e.isDiscovered,
          harvest_count: e.harvestCount,
          story: e.story,
          specialty_point: e.specialtyPoint,
        }));
        await supabase.from('encyclopedia').upsert(rows);
      }
    } catch (e) {
      console.error('syncEncyclopedia error:', e);
    }
  },
};
