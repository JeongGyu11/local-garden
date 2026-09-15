import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarId, PlayerGender, TravelStyle } from '../types';
import { PlayerCharacter } from './PlayerCharacter';

type CharacterSurveyProps = {
  onComplete: (gender: PlayerGender, travelStyle: TravelStyle, avatarId: AvatarId) => Promise<void>;
  initialAvatarId?: AvatarId;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
};

const TRAVEL_OPTIONS: Array<{
  id: TravelStyle;
  emoji: string;
  title: string;
  description: string;
  color: string;
}> = [
  { id: 'nature', emoji: '🌿', title: '자연 속 힐링', description: '숲, 바다, 정원처럼 조용한 자연 명소를 좋아해요', color: '#4F7D4A' },
  { id: 'culture', emoji: '🏛️', title: '문화와 이야기', description: '역사, 전시, 골목의 숨은 이야기를 찾아다녀요', color: '#A86632' },
  { id: 'activity', emoji: '🥾', title: '활동적인 모험', description: '걷고 체험하며 새로운 장소에 도전하는 편이에요', color: '#39739D' },
];

export const CharacterSurvey: React.FC<CharacterSurveyProps> = ({
  onComplete,
  initialAvatarId,
  onCancel,
  mode = 'create',
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const initialParts = initialAvatarId?.split('_') as [PlayerGender, TravelStyle] | undefined;
  const [gender, setGender] = useState<PlayerGender | null>(initialParts?.[0] ?? null);
  const [travelStyle, setTravelStyle] = useState<TravelStyle | null>(initialParts?.[1] ?? null);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!gender || !travelStyle) return;
    setSaving(true);
    try {
      await onComplete(gender, travelStyle, `${gender}_${travelStyle}` as AvatarId);
    } catch (error) {
      Alert.alert('저장 실패', '선택 정보를 저장하지 못했습니다. 다시 시도해주세요.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {onCancel && (
          <TouchableOpacity style={styles.closeButton} onPress={onCancel} accessibilityLabel="캐릭터 변경 취소">
            <Ionicons name="close" size={22} color="#FFF9E4" />
          </TouchableOpacity>
        )}
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={[styles.progressBar, step === 2 && styles.progressActive]} />
        </View>
        <Text style={styles.eyebrow}>{mode === 'edit' ? '캐릭터 변경' : '캐릭터 만들기'} · {step}/2</Text>

        {step === 1 ? (
          <>
            <Text style={styles.title}>어떤 캐릭터로{`\n`}{mode === 'edit' ? '갈아입을까요?' : '여행을 시작할까요?'}</Text>
            <Text style={styles.description}>선택한 성별과 여행 취향을 조합해 나만의 캐릭터가 만들어져요.</Text>
            <View style={styles.genderRow}>
              {([
                { id: 'male' as const, label: '남자 캐릭터', emoji: '🧑🏻' },
                { id: 'female' as const, label: '여자 캐릭터', emoji: '👩🏻' },
              ]).map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.genderCard, gender === option.id && styles.selectedCard]}
                  onPress={() => setGender(option.id)}
                >
                  <Text style={styles.genderEmoji}>{option.emoji}</Text>
                  <Text style={styles.genderLabel}>{option.label}</Text>
                  {gender === option.id && <Ionicons name="checkmark-circle" size={22} color="#2D6A4F" />}
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.nextButton, !gender && styles.disabledButton]}
              disabled={!gender}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextButtonText}>여행 취향 선택하기</Text>
              <Ionicons name="arrow-forward" size={19} color="#FFF9E4" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>나와 가장 가까운{`\n`}여행 취향은?</Text>
            <Text style={styles.description}>취향에 따라 옷 색상과 캐릭터 장식이 달라집니다.</Text>
            <View style={styles.optionList}>
              {TRAVEL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.travelCard, travelStyle === option.id && styles.selectedCard]}
                  onPress={() => setTravelStyle(option.id)}
                >
                  <View style={[styles.travelIcon, { backgroundColor: option.color }]}>
                    <Text style={styles.travelEmoji}>{option.emoji}</Text>
                  </View>
                  <View style={styles.travelCopy}>
                    <Text style={styles.travelTitle}>{option.title}</Text>
                    <Text style={styles.travelDescription}>{option.description}</Text>
                  </View>
                  {travelStyle === option.id && <Ionicons name="checkmark-circle" size={23} color="#2D6A4F" />}
                </TouchableOpacity>
              ))}
            </View>
            {gender && travelStyle && (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>선택한 캐릭터 미리보기</Text>
                <View style={styles.previewAvatarBox}>
                  <PlayerCharacter avatarId={`${gender}_${travelStyle}` as AvatarId} size={70} />
                </View>
              </View>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>이전</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, styles.finishButton, (!travelStyle || saving) && styles.disabledButton]}
                disabled={!travelStyle || saving}
                onPress={finish}
              >
                {saving ? <ActivityIndicator color="#FFF9E4" /> : <Text style={styles.nextButtonText}>{mode === 'edit' ? '이 캐릭터로 변경' : '캐릭터 확정'}</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F0D7' },
  content: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, justifyContent: 'center' },
  closeButton: { position: 'absolute', right: 24, top: 24, zIndex: 2, width: 42, height: 42, borderRadius: 21, backgroundColor: '#2D6A4F', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1D5037' },
  progressRow: { flexDirection: 'row', gap: 7, marginBottom: 22 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#D9D1B3' },
  progressActive: { backgroundColor: '#2D6A4F' },
  eyebrow: { color: '#8A5A2B', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  title: { color: '#183C2B', fontSize: 29, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  description: { color: '#66705C', fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 10, marginBottom: 25 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderCard: { flex: 1, minHeight: 185, borderRadius: 18, backgroundColor: '#FFFDF3', borderWidth: 3, borderColor: '#DACEA4', alignItems: 'center', justifyContent: 'center', gap: 12 },
  selectedCard: { borderColor: '#2D6A4F', backgroundColor: '#F1F7DF' },
  genderEmoji: { fontSize: 65 },
  genderLabel: { color: '#33452E', fontSize: 15, fontWeight: '900' },
  nextButton: { height: 54, borderRadius: 13, backgroundColor: '#2D6A4F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, borderWidth: 2, borderColor: '#1D5037' },
  nextButtonText: { color: '#FFF9E4', fontSize: 15, fontWeight: '900' },
  disabledButton: { opacity: 0.42 },
  optionList: { gap: 11 },
  travelCard: { minHeight: 86, borderRadius: 15, backgroundColor: '#FFFDF3', borderWidth: 3, borderColor: '#DACEA4', flexDirection: 'row', alignItems: 'center', padding: 12 },
  travelIcon: { width: 55, height: 55, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  travelEmoji: { fontSize: 27 },
  travelCopy: { flex: 1 },
  travelTitle: { color: '#2E422E', fontSize: 16, fontWeight: '900', marginBottom: 3 },
  travelDescription: { color: '#6C735F', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  backButton: { width: 90, height: 54, borderRadius: 13, borderWidth: 2, borderColor: '#8C7B54', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  backButtonText: { color: '#63583B', fontSize: 15, fontWeight: '900' },
  finishButton: { flex: 1 },
  previewCard: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#A5D6A7', alignItems: 'center' },
  previewLabel: { color: '#2E7D32', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  previewAvatarBox: { padding: 6 },
});
