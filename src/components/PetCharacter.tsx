import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getPetDefinition } from '../data/petData';
import { PetId } from '../types';

interface PetCharacterProps {
  petId: PetId;
  size?: number;
}

const COLORS: Record<PetId, { body: string; belly: string; limb: string; tail: string }> = {
  meerkat: { body: '#B9783F', belly: '#EBC58F', limb: '#704326', tail: '#9A5E31' },
  capybara: { body: '#9A633A', belly: '#C99463', limb: '#684026', tail: '#684026' },
  panda: { body: '#F4EEDF', belly: '#FFFDF4', limb: '#303936', tail: '#303936' },
};

/** 얼굴 이모지에 몸통·팔다리·꼬리를 더한 작은 농장용 펫 캐릭터. */
export const PetCharacter: React.FC<PetCharacterProps> = ({ petId, size = 48 }) => {
  const pet = getPetDefinition(petId);
  const colors = COLORS[petId];
  const unit = size / 48;

  return (
    <View style={{ width: size, height: size * 1.2 }} accessibilityLabel={`${pet.name} 전신 캐릭터`}>
      <View style={[styles.tail, {
        width: 17 * unit,
        height: 9 * unit,
        borderRadius: 8 * unit,
        right: 1 * unit,
        top: 29 * unit,
        backgroundColor: colors.tail,
      }]} />
      <View style={[styles.body, {
        width: 30 * unit,
        height: 31 * unit,
        borderRadius: 15 * unit,
        left: 9 * unit,
        top: 20 * unit,
        backgroundColor: colors.body,
        borderWidth: Math.max(1, 1.5 * unit),
      }]}>
        <View style={[styles.belly, {
          width: 18 * unit,
          height: 21 * unit,
          borderRadius: 10 * unit,
          backgroundColor: colors.belly,
        }]} />
      </View>
      <View style={[styles.arm, styles.armLeft, {
        width: 7 * unit, height: 22 * unit, borderRadius: 5 * unit,
        left: 6 * unit, top: 25 * unit, backgroundColor: colors.limb,
      }]} />
      <View style={[styles.arm, styles.armRight, {
        width: 7 * unit, height: 22 * unit, borderRadius: 5 * unit,
        right: 6 * unit, top: 25 * unit, backgroundColor: colors.limb,
      }]} />
      <View style={[styles.leg, {
        width: 11 * unit, height: 9 * unit, borderRadius: 5 * unit,
        left: 9 * unit, bottom: 0, backgroundColor: colors.limb,
      }]} />
      <View style={[styles.leg, {
        width: 11 * unit, height: 9 * unit, borderRadius: 5 * unit,
        right: 9 * unit, bottom: 0, backgroundColor: colors.limb,
      }]} />
      <View style={[styles.head, {
        width: 32 * unit,
        height: 32 * unit,
        borderRadius: 16 * unit,
        left: 8 * unit,
        top: 0,
        backgroundColor: pet.color,
        borderWidth: Math.max(1, 1.5 * unit),
      }]}>
        <Text style={{ fontSize: 23 * unit, lineHeight: 29 * unit }}>{pet.emoji}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tail: { position: 'absolute', transform: [{ rotate: '-22deg' }] },
  body: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderColor: '#FFF7D6' },
  belly: { opacity: 0.95 },
  arm: { position: 'absolute', zIndex: 1 },
  armLeft: { transform: [{ rotate: '18deg' }] },
  armRight: { transform: [{ rotate: '-18deg' }] },
  leg: { position: 'absolute' },
  head: { position: 'absolute', zIndex: 3, alignItems: 'center', justifyContent: 'center', borderColor: '#FFF7D6' },
});
