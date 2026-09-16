import { TouristSpot } from '../types';

export const DISCOVERY_REWARD_COUNTS: Record<
  NonNullable<TouristSpot['discoveryType']>,
  number
> = {
  popular: 1,
  nearPopular: 2,
  hiddenDiscovery: 3,
};

export const getDiscoveryRewardCount = (spot: TouristSpot) =>
  DISCOVERY_REWARD_COUNTS[spot.discoveryType ?? 'hiddenDiscovery'];
