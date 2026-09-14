import { TouristSpot } from '../types';

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
  anchorName?: string;
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

각 장소를 반드시 아래 셋 중 하나로 분류해.
- popular: 현재 위치 주변의 대표/유명 명소. 이미 사람들이 많이 알 가능성이 높은 장소.
- nearPopular: 인기 명소 근처에 붙여 방문하기 좋은 장소. 유명 명소의 수요를 주변으로 확장하기 좋은 곳.
- hiddenDiscovery: 인기 명소와 조금 거리가 있거나, 존재 자체를 알리는 의미가 큰 진짜 숨은/비인기 후보.

규칙:
- 모르면 popular라고 단정하지 말고 nearPopular 또는 hiddenDiscovery로 분류해.
- "진짜 비인기"라고 확정하지 말고, 앱에 보여줄 추천 이유는 추정 표현으로 짧게 작성해.
- reason은 한국어 45자 이내로 써.
- seedName은 관광지 이름이나 장소 분위기와 연결된 농장 게임 씨앗 이름으로 만들어. 반드시 "씨앗"으로 끝내.
- seedName은 12자 이내를 권장하고, 너무 일반적인 "로컬 특산 씨앗"은 쓰지 마.
- 응답은 설명 없이 JSON만 반환해.

JSON 형식:
{
  "spots": [
    {
      "id": "입력 id",
      "discoveryType": "popular | nearPopular | hiddenDiscovery",
      "reason": "앱 카드에 보여줄 짧은 추천 이유",
      "seedName": "관광지 기반 창작 씨앗 이름",
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

  return spots.map((spot) => {
    const classification = classificationById.get(spot.id);
    if (!classification) {
      return spot;
    }

    return {
      ...spot,
      discoveryType: classification.discoveryType,
      anchorName:
        classification.discoveryType === 'nearPopular' && classification.anchorName
          ? classification.anchorName
          : undefined,
      description: classification.reason || spot.description,
      seedName: classification.seedName?.trim() || spot.seedName,
    };
  });
}
