import React, { useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PETS } from '../data/petData';
import { PetId } from '../types';
import { PetCharacter } from './PetCharacter';

interface PetSurveyProps {
  onComplete: (petId: PetId) => Promise<void>;
  initialPetId?: PetId;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

export const PetSurvey: React.FC<PetSurveyProps> = ({ onComplete, initialPetId, onCancel, mode = 'create' }) => {
  const [selectedPetId, setSelectedPetId] = useState<PetId | null>(initialPetId ?? null);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!selectedPetId) return;
    setSaving(true);
    try {
      await onComplete(selectedPetId);
    } catch (error) {
      Alert.alert('저장 실패', '동행 친구를 저장하지 못했습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {onCancel && (
          <TouchableOpacity style={styles.closeButton} onPress={onCancel} accessibilityLabel="펫 변경 취소">
            <Ionicons name="close" size={22} color="#FFF9E4" />
          </TouchableOpacity>
        )}
        <Text style={styles.eyebrow}>{mode === 'edit' ? '동행 친구 변경' : '마지막 설문 · 동행 친구'}</Text>
        <Text style={styles.title}>{mode === 'edit' ? '이번에는 누구와\n산책할까요?' : '농장을 함께 누빌\n친구를 골라주세요'}</Text>
        <Text style={styles.description}>능력 차이는 없어요. 마음이 가는 귀여운 친구를 선택하면 늘 곁을 따라다녀요.</Text>

        <View style={styles.petList}>
          {PETS.map((pet) => {
            const selected = selectedPetId === pet.id;
            return (
              <TouchableOpacity key={pet.id} style={[styles.petCard, selected && styles.selectedCard]} onPress={() => setSelectedPetId(pet.id)}>
                <View style={styles.petPortrait}><PetCharacter petId={pet.id} size={56} /></View>
                <View style={styles.petCopy}>
                  <Text style={styles.petName}>{pet.name}</Text>
                  <Text style={styles.petNickname}>{pet.nickname}</Text>
                  <Text style={styles.petDescription}>{pet.description}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={25} color="#2D6A4F" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[styles.finishButton, (!selectedPetId || saving) && styles.disabledButton]} disabled={!selectedPetId || saving} onPress={finish}>
          {saving ? <ActivityIndicator color="#FFF9E4" /> : <Text style={styles.finishButtonText}>{mode === 'edit' ? '이 친구와 산책하기' : '첫 친구로 맞이하기'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F0D7' },
  content: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, justifyContent: 'center' },
  closeButton: { position: 'absolute', right: 24, top: 24, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1D5037' },
  eyebrow: { color: '#8A5A2B', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  title: { color: '#183C2B', fontSize: 29, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  description: { color: '#66705C', fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 10, marginBottom: 22 },
  petList: { gap: 11 },
  petCard: { minHeight: 106, borderRadius: 17, backgroundColor: '#FFFDF3', borderWidth: 3, borderColor: '#DACEA4', flexDirection: 'row', alignItems: 'center', padding: 12 },
  selectedCard: { borderColor: '#2D6A4F', backgroundColor: '#F1F7DF' },
  petPortrait: { width: 76, height: 78, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  petCopy: { flex: 1 },
  petName: { color: '#263D2D', fontSize: 17, fontWeight: '900' },
  petNickname: { color: '#8A5A2B', fontSize: 11, fontWeight: '900', marginTop: 2 },
  petDescription: { color: '#6C735F', fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 3 },
  finishButton: { height: 56, borderRadius: 13, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', marginTop: 22, borderWidth: 2, borderColor: '#1D5037' },
  finishButtonText: { color: '#FFF9E4', fontSize: 15, fontWeight: '900' },
  disabledButton: { opacity: 0.42 },
});
