import { TouristSpot } from '../types';
import { curateTouristSpotsWithGemini } from './geminiApi';

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

const toLocalDiscoveryType = (
  spot: TouristSpot,
  distanceMeters: number | undefined
): NonNullable<TouristSpot['discoveryType']> => {
  if (isPopularSpot(spot.title)) {
    return 'popular';
  }
  if (distanceMeters !== undefined && distanceMeters <= 5000) {
    return 'nearPopular';
  }
  return 'hiddenDiscovery';
};

const getDefaultDescription = (discoveryType: NonNullable<TouristSpot['discoveryType']>) => {
  if (discoveryType === 'popular') {
    return '현재 GPS 주변의 대표 명소로 추정되는 TourAPI 관광지입니다.';
  }
  if (discoveryType === 'nearPopular') {
    return '현재 위치의 인기 동선에 붙여 방문하기 좋은 주변 관광지입니다.';
  }
  return '인기 명소와 조금 떨어져 존재를 알리기 좋은 숨은 관광지 후보입니다.';
};

export async function fetchNearbyHiddenTouristSpots(
  latitude: number,
  longitude: number,
  radiusMeters = 20000
): Promise<TouristSpot[]> {
  const url = buildTourApiUrl('locationBasedList2', {
    numOfRows: '30',
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
  const spots = filterTouristCandidates(items)
    .slice(0, 18)
    .map((item) => {
      const config = getRegionConfigFromAddress(item.addr1 ?? '');
      const spot = toTouristSpot(item, config);
      const distanceMeters = getTourApiDistance(item);
      const discoveryType = toLocalDiscoveryType(spot, distanceMeters);
      return {
        ...spot,
        discoveryType,
        distance: formatDistance(distanceMeters),
        description: getDefaultDescription(discoveryType),
      };
    });

  try {
    return await curateTouristSpotsWithGemini(spots);
  } catch (geminiErr) {
    console.warn('Gemini tourist spot curation failed:', geminiErr);
    return spots;
  }
}
