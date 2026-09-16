import { supabase } from '../lib/supabase';
import { SeedPattern, SeedTheme, SeedVisual, TouristSpot } from '../types';

type DiscoveryType = NonNullable<TouristSpot['discoveryType']>;
interface GroqSpotClassification {
  id: string;
  reason?: string;
  seedName?: string;
  seedVisual?: Partial<SeedVisual>;
  anchorName?: string;
  popularityScore?: number;
  besidePopularScore?: number;
  hiddenScore?: number;
}
interface GroqCurationResponse { spots?: GroqSpotClassification[] }

const getFunctionErrorMessage = async (error: unknown) => {
  const fallback = error instanceof Error ? error.message : String(error);
  const context = (error as { context?: Response } | null)?.context;
  if (!context) return fallback;

  try {
    const body = await context.clone().text();
    return [`HTTP ${context.status}`, body.trim(), fallback].filter(Boolean).join(' · ');
  } catch {
    return fallback;
  }
};

const SEED_THEMES: SeedTheme[] = ['art', 'history', 'nature', 'sea', 'mountain', 'market', 'festival', 'local'];
const SEED_PATTERNS: SeedPattern[] = ['paint', 'metal', 'wave', 'leaf', 'stone', 'tile', 'spice', 'sparkle'];
const sanitizeScore = (value: unknown) => {
  const score = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
};
const sanitizeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim()) ? value.trim() : fallback;
const sanitizeSeedVisual = (visual: Partial<SeedVisual> | undefined, fallback?: SeedVisual): SeedVisual | undefined => {
  if (!visual && !fallback) return undefined;
  const base = fallback ?? {
    theme: 'local' as const,
    primaryColor: '#6E9F44',
    secondaryColor: '#F2D36B',
    accentColor: '#FFF8D9',
    pattern: 'leaf' as const,
  };
  return {
    theme: visual?.theme && SEED_THEMES.includes(visual.theme) ? visual.theme : base.theme,
    primaryColor: sanitizeColor(visual?.primaryColor, base.primaryColor),
    secondaryColor: sanitizeColor(visual?.secondaryColor, base.secondaryColor),
    accentColor: sanitizeColor(visual?.accentColor, base.accentColor),
    pattern: visual?.pattern && SEED_PATTERNS.includes(visual.pattern) ? visual.pattern : base.pattern,
  };
};

/** TourAPI 후보 전체를 Groq가 평가하고, 점수 순위로 5/5/10개를 확정합니다. */
export async function curateTouristSpotsWithGroq(spots: TouristSpot[]): Promise<TouristSpot[]> {
  if (spots.length === 0) return spots;
  const { data, error } = await supabase.functions.invoke<GroqCurationResponse>('curate-tourist-spots', {
    body: {
      spots: spots.map((spot) => ({
        id: spot.id,
        title: spot.title,
        address: spot.address,
        category: spot.category,
        distance: spot.distance,
        currentSeedName: spot.seedName,
      })),
    },
  });
  if (error) {
    throw new Error(`Groq Edge Function failed: ${await getFunctionErrorMessage(error)}`);
  }

  const byId = new Map((data?.spots ?? []).map((item) => [item.id, item]));
  if (byId.size === 0) throw new Error('Groq returned no classifications');
  const scored = spots.map((spot, index) => {
    const item = byId.get(spot.id);
    return {
      spot, item, index,
      popularityScore: sanitizeScore(item?.popularityScore),
      besidePopularScore: sanitizeScore(item?.besidePopularScore),
      hiddenScore: sanitizeScore(item?.hiddenScore),
    };
  });
  const popularIds = new Set([...scored]
    .sort((a, b) => b.popularityScore - a.popularityScore || a.index - b.index)
    .slice(0, 5).map(({ spot }) => spot.id));
  const nearPopularIds = new Set(scored
    .filter(({ spot }) => !popularIds.has(spot.id))
    .sort((a, b) => {
      const anchorDifference = Number(Boolean(b.item?.anchorName?.trim())) - Number(Boolean(a.item?.anchorName?.trim()));
      return anchorDifference || b.besidePopularScore - a.besidePopularScore || a.index - b.index;
    })
    .slice(0, 5).map(({ spot }) => spot.id));
  const hiddenIds = new Set(scored
    .filter(({ spot }) => !popularIds.has(spot.id) && !nearPopularIds.has(spot.id))
    .sort((a, b) => b.hiddenScore - a.hiddenScore || b.index - a.index)
    .slice(0, 10).map(({ spot }) => spot.id));

  return scored.flatMap(({ spot, item, popularityScore, besidePopularScore, hiddenScore }) => {
    let discoveryType: DiscoveryType | null = null;
    if (popularIds.has(spot.id)) discoveryType = 'popular';
    else if (nearPopularIds.has(spot.id)) discoveryType = 'nearPopular';
    else if (hiddenIds.has(spot.id)) discoveryType = 'hiddenDiscovery';
    if (!discoveryType) return [];
    return [{
      ...spot,
      discoveryType,
      anchorName: discoveryType === 'nearPopular' ? item?.anchorName?.trim() || undefined : undefined,
      description: item?.reason?.trim() || spot.description,
      seedName: item?.seedName?.trim() || spot.seedName,
      seedVisual: sanitizeSeedVisual(item?.seedVisual, spot.seedVisual),
      popularityScore,
      besidePopularScore,
      hiddenScore,
    }];
  });
}
