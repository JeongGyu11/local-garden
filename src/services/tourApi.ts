import { SeedVisual, TouristSpot } from '../types';
import { curateTouristSpotsWithGemini } from './geminiApi';
import { curateTouristSpotsWithGroq } from './groqApi';

declare const process: {
  env?: {
    EXPO_PUBLIC_TOUR_API_KEY?: string;
  };
};

type SupportedRegion = TouristSpot['region'];

interface TourApiRawItem {
  addr1?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  contentid?: string | number;
  firstimage?: string;
  mapx?: string | number;
  mapy?: string | number;
  title?: string;
}

interface RegionConfig {
  areaCode: string;
  region: SupportedRegion;
  seedName: string;
  seedEmoji: string;
}

const TOUR_API_BASE = 'https://apis.data.go.kr/B551011/KorService2';

const REGION_CONFIGS: RegionConfig[] = [
  { areaCode: '39', region: '제주', seedName: '제주 감귤 씨앗', seedEmoji: '🍊' },
  { areaCode: '38', region: '전남', seedName: '전남 녹차 씨앗', seedEmoji: '🍵' },
  { areaCode: '35', region: '경북', seedName: '경북 사과 씨앗', seedEmoji: '🍎' },
  { areaCode: '32', region: '강원', seedName: '강원 감자 씨앗', seedEmoji: '🥔' },
  { areaCode: '33', region: '충북', seedName: '충북 마늘 씨앗', seedEmoji: '🧄' },
];

const DEFAULT_REGION_CONFIG: RegionConfig = {
  areaCode: '',
  region: '전국',
  seedName: '로컬 특산 씨앗',
  seedEmoji: '🌱',
};

const POPULAR_SPOT_KEYWORDS = [
  '경복궁',
  '광화문',
  '남산',
  '롯데월드',
  '명동',
  '성산일출봉',
  '속초해수욕장',
  '안동 하회마을',
  '여수밤바다',
  '오죽헌',
  '월정리',
  '전주한옥마을',
  '정동진',
  '청남대',
  '한라산',
  '해운대',
  '협재',
];

const SMALL_PLACE_KEYWORDS = [
  '기념비',
  '기념탑',
  '동상',
  '비석',
  '표지석',
  '주차장',
  '관리사무소',
  '화장실',
  '센터',
  '안내소',
  '매표소',
];

const CATEGORY_LABELS: Record<string, string> = {
  A0101: '자연 명소',
  A0102: '생태 관광지',
  A0201: '역사 관광지',
  A0202: '휴양 관광지',
  A0203: '체험 관광지',
  A0204: '산업 관광지',
  A0205: '건축/조형물',
  A0206: '문화시설',
  A0207: '축제/공연',
  A0208: '레포츠',
};

const getApiKey = () => {
  if (typeof process === 'undefined') {
    return '';
  }
  return process.env?.EXPO_PUBLIC_TOUR_API_KEY?.trim() ?? '';
};

const toArray = (items: TourApiRawItem | TourApiRawItem[] | undefined) => {
  if (!items) {
    return [];
  }
  return Array.isArray(items) ? items : [items];
};

const buildTourApiUrl = (path: string, params: Record<string, string>) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('TourAPI key is missing.');
  }

  const query = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'LocalGarden',
    _type: 'json',
    ...params,
  });

  return `${TOUR_API_BASE}/${path}?serviceKey=${apiKey}&${query.toString()}`;
};

const isPopularSpot = (title: string) =>
  POPULAR_SPOT_KEYWORDS.some((keyword) => title.includes(keyword));

const isTooSmallPlace = (title: string, address: string) =>
  SMALL_PLACE_KEYWORDS.some((keyword) => title.includes(keyword) || address.includes(keyword));

const REPRESENTATIVE_SPOT_KEYWORDS = [
  '궁',
  '성',
  '산',
  '해변',
  '해수욕장',
  '공원',
  '수목원',
  '휴양림',
  '마을',
  '한옥',
  '시장',
  '거리',
  '문화',
  '예술',
  '미술관',
  '박물관',
  '전망대',
  '타워',
  '랜드',
  '타운',
  '항',
  '등대',
];

const getCategoryLabel = (item: TourApiRawItem) => {
  const categoryCode = item.cat2 || item.cat1 || item.cat3 || '';
  return CATEGORY_LABELS[categoryCode] ?? '숨은 관광지';
};

const createSeedNameFromTitle = (title: string, fallbackSeedName: string) => {
  const cleanedTitle = title
    .replace(/[()[\]{}]/g, ' ')
    .replace(/관광지|공원|박물관|미술관|전시관|기념관|체험관|문화관|센터|마을/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const seedBase = (cleanedTitle || title).replace(/\s+/g, '').slice(0, 8);
  return seedBase ? `${seedBase} 씨앗` : fallbackSeedName;
};

const getDefaultSeedVisual = (category: string, title: string, address: string): SeedVisual => {
  const text = `${category} ${title} ${address}`;

  if (/해변|바다|항구|섬|등대|수변|호수|강/.test(text)) {
    return {
      theme: 'sea',
      primaryColor: '#2F8FBD',
      secondaryColor: '#9CE3F0',
      accentColor: '#FFF2C6',
      pattern: 'wave',
    };
  }
  if (/산|봉|계곡|둘레길|숲길|전망|고개/.test(text)) {
    return {
      theme: 'mountain',
      primaryColor: '#4F6F3A',
      secondaryColor: '#A8B56F',
      accentColor: '#E2D4B5',
      pattern: 'stone',
    };
  }
  if (/자연|생태|공원|수목원|정원|휴양림|습지|숲/.test(text)) {
    return {
      theme: 'nature',
      primaryColor: '#3E7A3B',
      secondaryColor: '#9BCB68',
      accentColor: '#E6F5C9',
      pattern: 'leaf',
    };
  }
  if (/역사|전통|문화재|사찰|성|궁|향교|고택|한옥/.test(text)) {
    return {
      theme: 'history',
      primaryColor: '#8A5A2B',
      secondaryColor: '#2F4F4F',
      accentColor: '#D9B66F',
      pattern: 'tile',
    };
  }
  if (/문화|미술|예술|전시|공방|박물관|갤러리|공연/.test(text)) {
    return {
      theme: 'art',
      primaryColor: '#7C3AED',
      secondaryColor: '#F59E0B',
      accentColor: '#EC4899',
      pattern: 'paint',
    };
  }
  if (/시장|거리|골목|먹자|상가|음식|맛집/.test(text)) {
    return {
      theme: 'market',
      primaryColor: '#C65D1E',
      secondaryColor: '#F2B84B',
      accentColor: '#7A2E17',
      pattern: 'spice',
    };
  }
  if (/축제|행사|체험/.test(text)) {
    return {
      theme: 'festival',
      primaryColor: '#D946EF',
      secondaryColor: '#38BDF8',
      accentColor: '#FDE047',
      pattern: 'sparkle',
    };
  }

  return {
    theme: 'local',
    primaryColor: '#6E9F44',
    secondaryColor: '#F2D36B',
    accentColor: '#FFF8D9',
    pattern: 'leaf',
  };
};

const toNumber = (value: string | number | undefined) => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toTouristSpot = (item: TourApiRawItem, config: RegionConfig): TouristSpot => {
  const title = item.title?.trim() || '이름 없는 관광지';
  const address = item.addr1?.trim() || `${config.region} 지역 관광지`;
  const category = getCategoryLabel(item);

  return {
    id: `tourapi_${item.contentid ?? `${config.region}_${title}`}`,
    title,
    region: config.region,
    category,
    address,
    seedName: createSeedNameFromTitle(title, config.seedName),
    seedEmoji: config.seedEmoji,
    seedVisual: getDefaultSeedVisual(category, title, address),
    description: `${config.region}의 덜 알려진 ${category}입니다. 방문 인증을 완료하면 지역 특산 씨앗을 받을 수 있어요.`,
    visited: false,
    distance: 'GPS 인증 가능',
    latitude: toNumber(item.mapy),
    longitude: toNumber(item.mapx),
    imageUrl: item.firstimage,
  };
};

const scoreHiddenSpot = (item: TourApiRawItem) => {
  let score = 0;
  if (item.firstimage) score += 3;
  if (item.mapx && item.mapy) score += 2;
  if (item.addr1) score += 2;
  if (item.cat2 === 'A0101' || item.cat2 === 'A0102') score += 2;
  if (item.cat2 === 'A0201' || item.cat2 === 'A0203') score += 1;
  if (item.title && item.title.length >= 4) score += 1;
  return score;
};

const getTourApiDistance = (item: TourApiRawItem) =>
  toNumber((item as TourApiRawItem & { dist?: string | number }).dist);

const filterTouristCandidates = (items: TourApiRawItem[]) =>
  items
    .filter((item) => item.title && item.addr1 && item.mapx && item.mapy)
    .filter((item) => !isTooSmallPlace(item.title ?? '', item.addr1 ?? ''))
    .sort((a, b) => {
      const distanceA = getTourApiDistance(a);
      const distanceB = getTourApiDistance(b);

      if (distanceA !== undefined && distanceB !== undefined && distanceA !== distanceB) {
        return distanceA - distanceB;
      }
      if (distanceA !== undefined && distanceB === undefined) {
        return -1;
      }
      if (distanceA === undefined && distanceB !== undefined) {
        return 1;
      }

      return scoreHiddenSpot(b) - scoreHiddenSpot(a);
    });

const createDistanceBuckets = (radiusMeters: number) => {
  const buckets = [
    { min: 0, max: 1000 },
    { min: 1000, max: 3000 },
    { min: 3000, max: 5000 },
    { min: 5000, max: 10000 },
    { min: 10000, max: 20000 },
  ];

  return buckets.filter((bucket) => bucket.min < radiusMeters).reverse();
};

const getMaxSpotCount = (radiusMeters: number) => {
  if (radiusMeters <= 1000) return 10;
  if (radiusMeters <= 3000) return 15;
  if (radiusMeters <= 5000) return 20;
  if (radiusMeters <= 10000) return 25;
  return 30;
};

const selectDistanceSpreadCandidates = (
  items: TourApiRawItem[],
  radiusMeters: number,
  maxItems = getMaxSpotCount(radiusMeters)
) => {
  const selected = new Map<string, TourApiRawItem>();
  const getKey = (item: TourApiRawItem) => String(item.contentid ?? `${item.title}_${item.addr1}`);
  const sortedItems = filterTouristCandidates(items);
  const buckets = createDistanceBuckets(radiusMeters);
  const baseBucketLimit = Math.max(2, Math.floor(maxItems / Math.max(1, buckets.length)));
  const remainder = maxItems % Math.max(1, buckets.length);

  buckets.forEach((bucket, bucketIndex) => {
    const bucketLimit = baseBucketLimit + (bucketIndex < remainder ? 1 : 0);
    sortedItems
      .filter((item) => {
        const distanceMeters = getTourApiDistance(item);
        return (
          distanceMeters !== undefined &&
          distanceMeters >= bucket.min &&
          distanceMeters < Math.min(bucket.max, radiusMeters)
        );
      })
      .slice(0, bucketLimit)
      .forEach((item) => {
        if (selected.size < maxItems) {
          selected.set(getKey(item), item);
        }
      });
  });

  sortedItems.forEach((item) => {
    if (selected.size < maxItems) {
      selected.set(getKey(item), item);
    }
  });

  return Array.from(selected.values()).sort((a, b) => {
    const distanceA = getTourApiDistance(a) ?? Number.POSITIVE_INFINITY;
    const distanceB = getTourApiDistance(b) ?? Number.POSITIVE_INFINITY;
    return distanceA - distanceB;
  });
};

const getRegionConfigFromAddress = (address: string): RegionConfig => {
  if (address.includes('제주')) {
    return REGION_CONFIGS[0];
  }
  if (address.includes('전남') || address.includes('전라남도')) {
    return REGION_CONFIGS[1];
  }
  if (address.includes('경북') || address.includes('경상북도')) {
    return REGION_CONFIGS[2];
  }
  if (address.includes('강원')) {
    return REGION_CONFIGS[3];
  }
  if (address.includes('충북') || address.includes('충청북도')) {
    return REGION_CONFIGS[4];
  }
  return DEFAULT_REGION_CONFIG;
};

const formatDistance = (meters: number | undefined) => {
  if (meters === undefined) {
    return 'GPS 인증 가능';
  }
  if (meters < 1000) {
    return `현재 위치에서 ${Math.round(meters)}m`;
  }
  return `현재 위치에서 ${(meters / 1000).toFixed(1)}km`;
};

const getDefaultDescription = (discoveryType: NonNullable<TouristSpot['discoveryType']>) => {
  if (discoveryType === 'popular') {
    return '실제로 많이 알려진 대표 명소로 분류된 TourAPI 관광지입니다.';
  }
  if (discoveryType === 'nearPopular') {
    return '유명 명소 근처에 있지만 상대적으로 덜 알려진 주변 관광지입니다.';
  }
  return '유명 명소 동선과 조금 떨어진 사람들이 잘 모를 만한 숨은 관광지 후보입니다.';
};

const getSpotDistanceMeters = (from: TouristSpot, to: TouristSpot) => {
  if (
    from.latitude === undefined ||
    from.longitude === undefined ||
    to.latitude === undefined ||
    to.longitude === undefined
  ) {
    return Number.POSITIVE_INFINITY;
  }

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

const findNearestPopularAnchor = (spot: TouristSpot, popularAnchors: TouristSpot[]) =>
  popularAnchors
    .map((anchor) => ({ anchor, distance: getSpotDistanceMeters(anchor, spot) }))
    .sort((a, b) => a.distance - b.distance)[0];

const getRepresentativeSpotScore = (spot: TouristSpot, index: number) => {
  let score = 0;
  const text = `${spot.title} ${spot.category} ${spot.address}`;

  if (isPopularSpot(spot.title)) {
    score += 120;
  }
  if (spot.discoveryType === 'popular') {
    score += 100;
  }
  if (spot.imageUrl) {
    score += 12;
  }
  if (/자연|역사|문화|체험|휴양|생태/.test(spot.category)) {
    score += 10;
  }
  if (REPRESENTATIVE_SPOT_KEYWORDS.some((keyword) => text.includes(keyword))) {
    score += 18;
  }
  if (isTooSmallPlace(spot.title, spot.address)) {
    score -= 60;
  }

  return score - index * 0.2;
};

const getPopularAnchors = (spots: TouristSpot[]) => {
  const strictAnchors = spots.filter(
    (spot) => isPopularSpot(spot.title) || spot.discoveryType === 'popular'
  );

  if (strictAnchors.length > 0) {
    return strictAnchors;
  }

  const representativeFallback = spots
    .map((spot, index) => ({
      spot,
      score: getRepresentativeSpotScore(spot, index),
    }))
    .filter(({ spot }) => !isTooSmallPlace(spot.title, spot.address))
    .sort((a, b) => b.score - a.score)[0]?.spot;

  return representativeFallback ? [representativeFallback] : [];
};

const applyFamousAnchorDiscoveryRules = (spots: TouristSpot[]) => {
  if (spots.length === 0) {
    return spots;
  }

  const ranked = spots
    .map((spot, index) => ({ spot: { ...spot }, index, score: getRepresentativeSpotScore(spot, index) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const popular = ranked.slice(0, 5).map(({ spot }) => spot);
  const popularIds = new Set(popular.map((spot) => spot.id));
  const remaining = ranked.map(({ spot }) => spot).filter((spot) => !popularIds.has(spot.id));
  const nearPopular = remaining
    .map((spot) => ({ spot, nearest: findNearestPopularAnchor(spot, popular) }))
    .sort((a, b) => a.nearest.distance - b.nearest.distance)
    .slice(0, 5);
  const nearPopularIds = new Set(nearPopular.map(({ spot }) => spot.id));
  const hidden = remaining.filter((spot) => !nearPopularIds.has(spot.id)).slice(0, 10);

  return [
    ...popular.map((spot) => ({
      ...spot,
      discoveryType: 'popular' as const,
      anchorName: undefined,
      description: getDefaultDescription('popular'),
    })),
    ...nearPopular.map(({ spot, nearest }) => ({
      ...spot,
      discoveryType: 'nearPopular' as const,
      anchorName: nearest.anchor.title,
      description: `${nearest.anchor.title} 근처의 상대적으로 덜 알려진 장소입니다.`,
    })),
    ...hidden.map((spot) => ({
      ...spot,
      discoveryType: 'hiddenDiscovery' as const,
      anchorName: undefined,
      description: getDefaultDescription('hiddenDiscovery'),
    })),
  ];
};

export async function fetchNearbyHiddenTouristSpots(
  latitude: number,
  longitude: number,
  radiusMeters = 20000
): Promise<TouristSpot[]> {
  const url = buildTourApiUrl('locationBasedList2', {
    numOfRows: '300',
    pageNo: '1',
    arrange: 'E',
    contentTypeId: '12',
    mapX: String(longitude),
    mapY: String(latitude),
    radius: String(radiusMeters),
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TourAPI nearby request failed: ${response.status}`);
  }

  const json = await response.json();
  const resultCode = json?.response?.header?.resultCode;
  if (resultCode && resultCode !== '0000') {
    throw new Error(json?.response?.header?.resultMsg ?? 'TourAPI nearby result error');
  }

  const items = toArray(json?.response?.body?.items?.item);
  const spots = selectDistanceSpreadCandidates(items, radiusMeters)
    .map((item) => {
      const config = getRegionConfigFromAddress(item.addr1 ?? '');
      const spot = toTouristSpot(item, config);
      const distanceMeters = getTourApiDistance(item);
      const discoveryType = isPopularSpot(spot.title)
        ? ('popular' as const)
        : ('hiddenDiscovery' as const);
      return {
        ...spot,
        discoveryType,
        distance: formatDistance(distanceMeters),
        description: getDefaultDescription(discoveryType),
      };
  });

  try {
    return await curateTouristSpotsWithGroq(spots);
  } catch (groqErr) {
    console.warn('Groq 관광지 큐레이션 실패 (2차 Gemini API로 전환합니다):', groqErr);
    try {
      return await curateTouristSpotsWithGemini(spots);
    } catch (geminiErr) {
      console.warn('Gemini 관광지 큐레이션 실패 (3차 로컬 규칙으로 전환합니다):', geminiErr);
      return applyFamousAnchorDiscoveryRules(spots);
    }
  }
}
