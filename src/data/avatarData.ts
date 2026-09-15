import { AvatarId, PlayerGender, TravelStyle } from '../types';

export interface AvatarDefinition {
  id: AvatarId;
  gender: PlayerGender;
  travelStyle: TravelStyle;
  name: string;
  emoji: string;
  styleEmoji: string;
  description: string;
  color: string;
}

const GENDERS: Array<{ id: PlayerGender; label: string; emoji: string }> = [
  { id: 'male', label: '소년', emoji: '🧑🏻' },
  { id: 'female', label: '소녀', emoji: '👩🏻' },
];

const STYLES: Array<{
  id: TravelStyle;
  label: string;
  emoji: string;
  description: string;
  color: string;
}> = [
  { id: 'nature', label: '숲길 정원사', emoji: '🌿', description: '숲과 바다의 작은 변화를 발견하는 자연 여행가', color: '#4F7D4A' },
  { id: 'culture', label: '이야기 수집가', emoji: '🏛️', description: '오래된 장소에 담긴 이야기를 기록하는 문화 여행가', color: '#A86632' },
  { id: 'activity', label: '모험 탐험가', emoji: '🥾', description: '새로운 길과 체험에 씩씩하게 도전하는 활동 여행가', color: '#39739D' },
];

export const AVATARS: AvatarDefinition[] = GENDERS.flatMap((gender) =>
  STYLES.map((style) => ({
    id: `${gender.id}_${style.id}` as AvatarId,
    gender: gender.id,
    travelStyle: style.id,
    name: `${style.label} ${gender.label}`,
    emoji: gender.emoji,
    styleEmoji: style.emoji,
    description: style.description,
    color: style.color,
  }))
);

export const getAvatarDefinition = (avatarId: AvatarId) =>
  AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0];
