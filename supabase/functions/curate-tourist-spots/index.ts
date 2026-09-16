import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SpotInput = {
  id: string;
  title: string;
  address?: string;
  category?: string;
  distance?: string;
  currentSeedName?: string;
};

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) throw new Error('GROQ_API_KEY is not configured');

    const body = await request.json();
    const spots: SpotInput[] = Array.isArray(body?.spots) ? body.spots.slice(0, 60) : [];
    if (spots.length === 0) {
      return Response.json({ spots: [] }, { headers: corsHeaders });
    }

    const prompt = `너는 한국 관광 웹게임 "로컬 가든"의 관광 큐레이터다.
입력된 TourAPI 장소를 평가해 JSON만 반환한다.

모든 후보를 비교해서 각 장소에 다음을 작성한다. 앱은 이 점수 순위로 인기명소 5개,
명소 옆 5개, 숨은 발견 10개를 최종 선정하므로 점수 간 우열을 분명하게 매긴다.
- discoveryType: popular, nearPopular, hiddenDiscovery 중 하나
- popularityScore, besidePopularScore, hiddenScore: 각각 0~100 정수
- reason: 한국어 45자 이내의 추정형 추천 이유
- seedName: 장소 분위기와 연결된 12자 내외 이름이며 반드시 "씨앗"으로 끝남
- seedVisual.theme: art/history/nature/sea/mountain/market/festival/local 중 하나
- seedVisual.pattern: paint/metal/wave/leaf/stone/tile/spice/sparkle 중 하나
- seedVisual의 세 색상: #RRGGBB
- anchorName: nearPopular일 때 근처 대표 명소, 아니면 빈 문자열

판단 기준:
- popular은 전국 또는 지역 대표급으로 널리 알려진 장소다.
- nearPopular은 유명 명소 근처지만 상대적으로 덜 알려진 장소다.
- hiddenDiscovery는 작은 장소, 골목, 공방, 동네 공원 등 숨은 장소 후보다.
- anchorName을 확신할 수 없으면 besidePopularScore는 45 이하로 둔다.
- 입력된 모든 id를 정확히 한 번씩 포함한다.

응답 형식:
{"spots":[{"id":"입력 id","discoveryType":"popular","popularityScore":0,"besidePopularScore":0,"hiddenScore":0,"reason":"추천 이유","seedName":"장소 씨앗","seedVisual":{"theme":"local","primaryColor":"#6E9F44","secondaryColor":"#F2D36B","accentColor":"#FFF8D9","pattern":"leaf"},"anchorName":""}]}

장소 목록:
${JSON.stringify(spots)}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0.2,
        reasoning_effort: 'low',
        include_reasoning: false,
        max_completion_tokens: 12000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'tourist_spot_curation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                spots: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      id: { type: 'string' },
                      discoveryType: { type: 'string' },
                      popularityScore: { type: 'integer', minimum: 0, maximum: 100 },
                      besidePopularScore: { type: 'integer', minimum: 0, maximum: 100 },
                      hiddenScore: { type: 'integer', minimum: 0, maximum: 100 },
                      reason: { type: 'string' },
                      seedName: { type: 'string' },
                      seedVisual: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          theme: { type: 'string' },
                          primaryColor: { type: 'string' },
                          secondaryColor: { type: 'string' },
                          accentColor: { type: 'string' },
                          pattern: { type: 'string' },
                        },
                        required: ['theme', 'primaryColor', 'secondaryColor', 'accentColor', 'pattern'],
                      },
                      anchorName: { type: 'string' },
                    },
                    required: [
                      'id',
                      'discoveryType',
                      'popularityScore',
                      'besidePopularScore',
                      'hiddenScore',
                      'reason',
                      'seedName',
                      'seedVisual',
                      'anchorName',
                    ],
                  },
                },
              },
              required: ['spots'],
            },
          },
        },
        messages: [
          { role: 'system', content: 'Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (response.ok) {
      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Groq returned no content');
      return Response.json(JSON.parse(content), {
        headers: { ...corsHeaders, 'X-Curation-Provider': 'groq' },
      });
    }

    const groqError = `${response.status} ${await response.text()}`;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error(`Groq request failed: ${groqError}; GEMINI_API_KEY is not configured`);
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 12000,
            responseMimeType: 'application/json',
          },
        }),
      }
    );
    if (!geminiResponse.ok) {
      throw new Error(
        `Groq request failed: ${groqError}; Gemini request failed: ${geminiResponse.status} ${await geminiResponse.text()}`
      );
    }

    const geminiJson = await geminiResponse.json();
    const geminiContent = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof geminiContent !== 'string') {
      throw new Error(
        `Groq request failed: ${groqError}; Gemini returned no content (${geminiJson?.candidates?.[0]?.finishReason ?? 'unknown'})`
      );
    }

    return Response.json(JSON.parse(geminiContent), {
      headers: { ...corsHeaders, 'X-Curation-Provider': 'gemini' },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
