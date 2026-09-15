import { SeedPattern, SeedTheme, SeedVisual, TouristSpot } from '../types';

declare const process: {
  env?: {
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
  };
};

type DiscoveryType = NonNullable<TouristSpot['discoveryType']>;

interface GeminiSpotClassification {
  id: string;
  discoveryType: DiscoveryType;
  reason: string;
  seedName?: string;
  seedVisual?: Partial<SeedVisual>;
  anchorName?: string;
  popularityScore?: number;
  besidePopularScore?: number;
  hiddenScore?: number;
}

interface GeminiClassificationResponse {
  spots?: GeminiSpotClassification[];
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-3.5-flash';

const getGeminiApiKey = () => {
  if (typeof process === 'undefined') {
    return '';
  }
  return process.env?.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ?? '';
};

const stripJsonFence = (text: string) =>
  text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

const parseGeminiJson = (text: string): GeminiClassificationResponse => {
  const cleanedText = stripJsonFence(text);
  const jsonStart = cleanedText.indexOf('{');
  const jsonEnd = cleanedText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    return {};
  }
  return JSON.parse(cleanedText.slice(jsonStart, jsonEnd + 1));
};

const sanitizeDiscoveryType = (value: string | undefined): DiscoveryType | null => {
  if (value === 'popular' || value === 'nearPopular' || value === 'hiddenDiscovery') {
    return value;
  }
  return null;
};

const sanitizeScore = (value: unknown) => {
  const score = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
};

const classifyByScores = (
  classifications: Map<string, GeminiSpotClassification>,
  spots: TouristSpot[]
) => {
  const scored = spots.map((spot, index) => {
    const classification = classifications.get(spot.id);
    return {
      id: spot.id,
      index,
      popularityScore: sanitizeScore(classification?.popularityScore),
      besidePopularScore: sanitizeScore(classification?.besidePopularScore),
      hiddenScore: sanitizeScore(classification?.hiddenScore),
      hasAnchor: Boolean(classification?.anchorName?.trim()),
      discoveryType: classification?.discoveryType,
    };
  });
  const popularLimit = Math.max(2, Math.min(5, Math.ceil(spots.length * 0.18)));
  const nearPopularLimit = Math.max(3, Math.min(8, Math.ceil(spots.length * 0.28)));

  const popularIds = new Set(
    scored
      .filter(({ popularityScore }) => popularityScore >= 70)
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, popularLimit)
      .map(({ id }) => id)
  );

  if (popularIds.size === 0) {
    const bestPopular = scored
      .filter(({ popularityScore }) => popularityScore >= 50)
      .sort((a, b) => b.popularityScore - a.popularityScore)[0];
    if (bestPopular) {
      popularIds.add(bestPopular.id);
    }
  }

  const nearPopularIds = new Set(
    scored
      .filter(({ id, besidePopularScore, hasAnchor }) => {
        return !popularIds.has(id) && hasAnchor && besidePopularScore >= 55;
      })
      .sort((a, b) => b.besidePopularScore - a.besidePopularScore)
      .slice(0, nearPopularLimit)
      .map(({ id }) => id)
  );

  if (nearPopularIds.size === 0) {
    const bestBeside = scored
      .filter(({ id, besidePopularScore, hasAnchor }) => {
        return !popularIds.has(id) && hasAnchor && besidePopularScore >= 45;
      })
      .sort((a, b) => b.besidePopularScore - a.besidePopularScore)[0];
    if (bestBeside) {
      nearPopularIds.add(bestBeside.id);
    }
  }

  return { popularIds, nearPopularIds };
};

const SEED_THEMES: SeedTheme[] = [
  'art',
  'history',
  'nature',
  'sea',
  'mountain',
  'market',
  'festival',
  'local',
];

const SEED_PATTERNS: SeedPattern[] = [
  'paint',
  'metal',
  'wave',
  'leaf',
  'stone',
  'tile',
  'spice',
  'sparkle',
];

const DEFAULT_SEED_VISUAL: SeedVisual = {
  theme: 'local',
  primaryColor: '#6E9F44',
  secondaryColor: '#F2D36B',
  accentColor: '#FFF8D9',
  pattern: 'leaf',
};

const THEME_DEFAULT_VISUALS: Record<SeedTheme, SeedVisual> = {
  art: {
    theme: 'art',
    primaryColor: '#7C3AED',
    secondaryColor: '#F59E0B',
    accentColor: '#EC4899',
    pattern: 'paint',
  },
  history: {
    theme: 'history',
    primaryColor: '#8A5A2B',
    secondaryColor: '#2F4F4F',
    accentColor: '#D9B66F',
    pattern: 'tile',
  },
  nature: {
    theme: 'nature',
    primaryColor: '#3E7A3B',
    secondaryColor: '#9BCB68',
    accentColor: '#E6F5C9',
    pattern: 'leaf',
  },
  sea: {
    theme: 'sea',
    primaryColor: '#2F8FBD',
    secondaryColor: '#9CE3F0',
    accentColor: '#FFF2C6',
    pattern: 'wave',
  },
  mountain: {
    theme: 'mountain',
    primaryColor: '#4F6F3A',
    secondaryColor: '#A8B56F',
    accentColor: '#E2D4B5',
    pattern: 'stone',
  },
  market: {
    theme: 'market',
    primaryColor: '#C65D1E',
    secondaryColor: '#F2B84B',
    accentColor: '#7A2E17',
    pattern: 'spice',
  },
  festival: {
    theme: 'festival',
    primaryColor: '#D946EF',
    secondaryColor: '#38BDF8',
    accentColor: '#FDE047',
    pattern: 'sparkle',
  },
  local: DEFAULT_SEED_VISUAL,
};

const sanitizeColor = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
};

const sanitizeSeedVisual = (visual: Partial<SeedVisual> | undefined): SeedVisual => {
  const theme = visual?.theme && SEED_THEMES.includes(visual.theme) ? visual.theme : 'local';
  const fallback = THEME_DEFAULT_VISUALS[theme] ?? DEFAULT_SEED_VISUAL;
  const pattern =
    visual?.pattern && SEED_PATTERNS.includes(visual.pattern)
      ? visual.pattern
      : fallback.pattern;

  return {
    theme,
    primaryColor: sanitizeColor(visual?.primaryColor, fallback.primaryColor),
    secondaryColor: sanitizeColor(visual?.secondaryColor, fallback.secondaryColor),
    accentColor: sanitizeColor(visual?.accentColor, fallback.accentColor),
    pattern,
  };
};

const toPromptPayload = (spots: TouristSpot[]) =>
  spots.map((spot) => ({
    id: spot.id,
    title: spot.title,
    address: spot.address,
    category: spot.category,
    distance: spot.distance,
    currentSeedName: spot.seedName,
  }));

export async function curateTouristSpotsWithGemini(
  spots: TouristSpot[]
): Promise<TouristSpot[]> {
  const apiKey = getGeminiApiKey();
  if (!apiKey || spots.length === 0) {
    return spots;
  }

  const prompt = `
너는 한국 관광 앱 "로컬 가든"의 관광 큐레이터야.
아래 목록은 사용자의 현재 GPS 주변에서 한국관광공사 TourAPI로 받은 관광지야.

각 장소마다 아래 점수를 0~100점으로 매겨.
- popularityScore: 실제 유명도. 전국/지역 단위 대표 명소로 볼수록 높게 줘.
- besidePopularScore: 유명 명소 옆 후보 점수. 유명한 장소 근처인데 그 유명세에 가려 덜 알려졌을수록 높게 줘.
- hiddenScore: 숨은 발견 점수. 유명 명소 동선과 떨어져 있고 사람들이 잘 모를 만할수록 높게 줘.

그리고 점수 기준으로 아래 셋 중 하나도 함께 추천해.
- popular: 실제로 전국/지역 단위에서 널리 알려진 대표 명소. 관광객이 이름만 들어도 알 가능성이 높은 곳.
- nearPopular: popular로 볼 만한 유명 명소 근처에 있지만, 그 유명세에 가려 상대적으로 사람들이 잘 모를 만한 장소.
- hiddenDiscovery: 유명 명소 근처가 아니거나 거리가 조금 있고, 실제로 잘 알려지지 않은 숨은/비인기 관광지 후보.

평가 기준:
- popularityScore 90~100: 전국적으로 아주 유명한 랜드마크.
- popularityScore 70~89: 지역 대표급 명소.
- popularityScore 50~69: 어느 정도 알려진 동네/지역 명소.
- popularityScore 0~49: 유명하다고 보기 어려운 장소.
- besidePopularScore는 anchorName에 실제 유명 명소명을 쓸 수 있을 때만 55점 이상 줘.
- anchorName을 확신할 수 없으면 besidePopularScore는 45점 이하로 둬.
- hiddenScore는 작은 장소, 골목, 공방, 동네 공원, 덜 알려진 문화공간일수록 높게 줘.
- 유명한 장소와 가까워도 그 장소 자체가 유명하면 hiddenScore를 낮춰.
- "진짜 비인기"라고 확정하지 말고, 앱에 보여줄 추천 이유는 추정 표현으로 짧게 작성해.
- reason은 한국어 45자 이내로 써.
- seedName은 관광지 이름이나 장소 분위기와 연결된 농장 게임 씨앗 이름으로 만들어. 반드시 "씨앗"으로 끝내.
- seedName은 12자 이내를 권장하고, 너무 일반적인 "로컬 특산 씨앗"은 쓰지 마.
- seedVisual은 장소 성격을 반영해 골라. theme은 art/history/nature/sea/mountain/market/festival/local 중 하나.
- pattern은 paint/metal/wave/leaf/stone/tile/spice/sparkle 중 하나.
- 색상은 앱에서 바로 쓸 수 있는 #RRGGBB 형식으로만 써.
- 응답은 설명 없이 JSON만 반환해.

JSON 형식:
{
  "spots": [
    {
      "id": "입력 id",
      "discoveryType": "popular | nearPopular | hiddenDiscovery",
      "popularityScore": 0,
      "besidePopularScore": 0,
      "hiddenScore": 0,
      "reason": "앱 카드에 보여줄 짧은 추천 이유",
      "seedName": "관광지 기반 창작 씨앗 이름",
      "seedVisual": {
        "theme": "art | history | nature | sea | mountain | market | festival | local",
        "primaryColor": "#RRGGBB",
        "secondaryColor": "#RRGGBB",
        "accentColor": "#RRGGBB",
        "pattern": "paint | metal | wave | leaf | stone | tile | spice | sparkle"
      },
      "anchorName": "근처 대표 명소명 또는 빈 문자열"
    }
  ]
}

TourAPI 장소 목록:
${JSON.stringify(toPromptPayload(spots))}
`;

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    return spots;
  }

  const parsed = parseGeminiJson(text);
  const classificationById = new Map(
    (parsed.spots ?? [])
      .map((item) => {
        const discoveryType = sanitizeDiscoveryType(item.discoveryType);
        if (!item.id || !discoveryType) {
          return null;
        }
        return [item.id, { ...item, discoveryType }] as const;
      })
      .filter((item): item is readonly [string, GeminiSpotClassification] => item !== null)
  );
  const scoreBuckets = classifyByScores(classificationById, spots);

  return spots.map((spot) => {
    const classification = classificationById.get(spot.id);
    if (!classification) {
      return spot;
    }
    const popularityScore = sanitizeScore(classification.popularityScore);
    const besidePopularScore = sanitizeScore(classification.besidePopularScore);
    const hiddenScore = sanitizeScore(classification.hiddenScore);
    const discoveryType: DiscoveryType = scoreBuckets.popularIds.has(spot.id)
      ? 'popular'
      : scoreBuckets.nearPopularIds.has(spot.id)
        ? 'nearPopular'
        : 'hiddenDiscovery';

    return {
      ...spot,
      discoveryType,
      anchorName:
        discoveryType === 'nearPopular' && classification.anchorName
          ? classification.anchorName
          : undefined,
      description: classification.reason || spot.description,
      seedName: classification.seedName?.trim() || spot.seedName,
      seedVisual: sanitizeSeedVisual(classification.seedVisual ?? spot.seedVisual),
      popularityScore,
      besidePopularScore,
      hiddenScore,
    };
  });
}
