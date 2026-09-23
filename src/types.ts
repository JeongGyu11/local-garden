export interface Plant {
  id: string;
  name: string;
  species: string;
  region: string;
  emoji: string;
  visual?: SeedVisual;
  plotIndex?: number;
  growthStage: number; // 0: 씨앗, 1: 새싹, 2: 꽃봉오리, 3: 열매맺음, 4: 수확가능
  waterProgress: number; // 0 to 100
  sunProgress: number; // 0 to 100
  lastWateredAt?: string;
  lastSunnedAt?: string;
  harvestReward: string;
}

export type SeedTheme =
  | 'art'
  | 'history'
  | 'nature'
  | 'sea'
  | 'mountain'
  | 'market'
  | 'festival'
  | 'local';

export type SeedPattern =
  | 'paint'
  | 'metal'
  | 'wave'
  | 'leaf'
  | 'stone'
  | 'tile'
  | 'spice'
  | 'sparkle';

export interface SeedVisual {
  theme: SeedTheme;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: SeedPattern;
}

export interface Seed {
  id: string;
  name: string;
  region: string;
  emoji: string;
  description: string;
  visual?: SeedVisual;
}

export interface HarvestedCrop {
  id: string;
  name: string;
  region: string;
  emoji: string;
  visual?: SeedVisual;
  harvestedAt: string;
}

export type PlayerGender = 'male' | 'female';
export type TravelStyle = 'nature' | 'culture' | 'activity';
export type AvatarId = `${PlayerGender}_${TravelStyle}`;
export type PetId = 'meerkat' | 'capybara' | 'panda';

export interface TouristSpot {
  id: string;
  title: string;
  region: '전국' | '제주' | '전남' | '경북' | '강원' | '충북';
  category: string;
  address: string;
  seedName: string;
  seedEmoji: string;
  seedVisual?: SeedVisual;
  description: string;
  visited: boolean;
  distance: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  discoveryType?: 'popular' | 'nearPopular' | 'hiddenDiscovery';
  anchorName?: string;
  popularityScore?: number;
  besidePopularScore?: number;
  hiddenScore?: number;
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
  visual?: SeedVisual;
  isDiscovered: boolean;
  harvestCount: number;
  story: string;
  specialtyPoint: string;
  seedName?: string;
  firstHarvestedAt?: string;
  lastHarvestedAt?: string;
}

export interface DungeonGear {
  speedBoots: boolean;
  goldenPickaxeCharges: number;
  wideTorch: boolean;
  shieldArmorCharges: number;
  hourglassSeconds: number;
}

export interface DungeonProgress {
  maxFloorReached: number;
  unlockedWarpPasses: number[];
}

export interface DungeonReward {
  gold: number;
  seeds: Seed[];
  growthBoosts: number;
  gems: HarvestedCrop[];
}
