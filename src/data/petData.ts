import { PetId } from '../types';

export interface PetDefinition {
  id: PetId;
  name: string;
  emoji: string;
  nickname: string;
  description: string;
  color: string;
}

export const PETS: PetDefinition[] = [
  { id: 'meerkat', name: '미어캣', emoji: '🐿️', nickname: '호기심 많은 보초', description: '두 발로 쏙 일어나 주변을 구경하는 작은 친구', color: '#D69B5B' },
  { id: 'capybara', name: '카피바라', emoji: '🦔', nickname: '느긋한 산책 친구', description: '서두르지 않고 포근하게 곁을 지켜주는 친구', color: '#A87548' },
  { id: 'panda', name: '판다', emoji: '🐼', nickname: '말랑한 대나무 친구', description: '뒤뚱뒤뚱 따라오며 보기만 해도 웃음 나는 친구', color: '#526257' },
];

export const getPetDefinition = (petId: PetId) =>
  PETS.find((pet) => pet.id === petId) ?? PETS[0];
