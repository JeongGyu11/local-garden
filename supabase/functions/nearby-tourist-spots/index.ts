import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOUR_API_BASE = 'https://apis.data.go.kr/B551011/KorService2';

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const tourApiKey = Deno.env.get('TOUR_API_KEY');
    if (!tourApiKey) throw new Error('TOUR_API_KEY is not configured');

    const body = await request.json();
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    const requestedRadius = Number(body?.radiusMeters);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude');
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude');
    }
    const radiusMeters = requestedRadius <= 5000 ? 5000 : 10000;
    const query = new URLSearchParams({
      MobileOS: 'ETC',
      MobileApp: 'LocalGarden',
      _type: 'json',
      numOfRows: '300',
      pageNo: '1',
      arrange: 'E',
      contentTypeId: '12',
      mapX: String(longitude),
      mapY: String(latitude),
      radius: String(radiusMeters),
    });

    // data.go.kr service keys are commonly already percent-encoded. Keep the key
    // outside URLSearchParams to avoid encoding '%' a second time.
    const response = await fetch(
      `${TOUR_API_BASE}/locationBasedList2?serviceKey=${tourApiKey}&${query.toString()}`
    );
    if (!response.ok) {
      throw new Error(`TourAPI request failed: ${response.status}`);
    }
    const json = await response.json();
    const resultCode = json?.response?.header?.resultCode;
    if (resultCode && resultCode !== '0000') {
      throw new Error(json?.response?.header?.resultMsg ?? 'TourAPI result error');
    }

    const rawItems = json?.response?.body?.items?.item;
    const items = !rawItems ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
    return Response.json({ items }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
