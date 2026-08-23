export interface Plant {
  id: string;
  name: string;
  species: string;
  region: string;
  emoji: string;
  growthStage: number; // 0: 씨앗, 1: 새싹, 2: 꽃봉오리, 3: 열매맺음, 4: 수확가능
  waterProgress: number; // 0 to 100
  sunProgress: number; // 0 to 100
  harvestReward: string;
}

export interface Seed {
  id: string;
  name: string;
  region: string;
  emoji: string;
  description: string;
}

export interface TouristSpot {
  id: string;
  title: string;
  region: '전국' | '제주' | '전남' | '경북' | '강원' | '충북';
  category: string;
  address: string;
  seedName: string;
  seedEmoji: string;
  description: string;
  visited: boolean;
  distance: string;
}

export interface Coupon {
  id: string;
  title: string;
  brand: string;
  discount: string;
  sourceCrop: string;
  region: string;
  expiryDate: string;
  used: boolean;
  code: string;
}

export interface EncyclopediaItem {
  id: string;
  cropName: string;
  region: string;
  emoji: string;
  isDiscovered: boolean;
  harvestCount: number;
  story: string;
  specialtyPoint: string;
}
