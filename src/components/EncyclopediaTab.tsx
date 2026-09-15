import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarId, EncyclopediaItem, PetId } from '../types';
import { AVATARS } from '../data/avatarData';
import { PETS } from '../data/petData';
import { PetCharacter } from './PetCharacter';
import { PlayerCharacter } from './PlayerCharacter';

interface EncyclopediaTabProps {
  encyclopedia: EncyclopediaItem[];
  avatarId: AvatarId;
  petId: PetId;
}

export const EncyclopediaTab: React.FC<EncyclopediaTabProps> = ({
  encyclopedia,
  avatarId,
  petId,
}) => {
  const [catalog, setCatalog] = useState<'crops' | 'characters' | 'pets'>('crops');
  const discoveredCount = encyclopedia.filter((item) => item.isDiscovered).length;
  const totalCount = encyclopedia.length;
  const progressPercent = Math.round((discoveredCount / totalCount) * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.bookBadge}>
          <Ionicons name="book" size={18} color="#FFF8D9" />
          <Text style={styles.bookBadgeText}>농부의 기록장</Text>
        </View>
        <Text style={styles.title}>{catalog === 'crops' ? '특산 작물 도감' : catalog === 'characters' ? '여행 캐릭터 도감' : '동행 친구 도감'}</Text>
        <Text style={styles.subTitle}>
          {catalog === 'crops'
            ? '여행에서 얻은 씨앗과 수확한 작물의 이야기를 모아요'
            : catalog === 'characters'
              ? '여행 취향마다 달라지는 여섯 캐릭터를 만나보세요'
              : '농장을 함께 산책하는 귀여운 친구들을 만나보세요'}
        </Text>
      </View>

      <View style={styles.catalogTabs}>
        <Pressable style={[styles.catalogTab, catalog === 'crops' && styles.catalogTabActive]} onPress={() => setCatalog('crops')}>
          <Ionicons name="leaf" size={16} color={catalog === 'crops' ? '#FFF8D9' : '#456044'} />
          <Text style={[styles.catalogTabText, catalog === 'crops' && styles.catalogTabTextActive]}>작물 도감</Text>
        </Pressable>
        <Pressable style={[styles.catalogTab, catalog === 'characters' && styles.catalogTabActive]} onPress={() => setCatalog('characters')}>
          <Ionicons name="people" size={16} color={catalog === 'characters' ? '#FFF8D9' : '#456044'} />
          <Text style={[styles.catalogTabText, catalog === 'characters' && styles.catalogTabTextActive]}>캐릭터 도감</Text>
        </Pressable>
        <Pressable style={[styles.catalogTab, catalog === 'pets' && styles.catalogTabActive]} onPress={() => setCatalog('pets')}>
          <Ionicons name="paw" size={16} color={catalog === 'pets' ? '#FFF8D9' : '#456044'} />
          <Text style={[styles.catalogTabText, catalog === 'pets' && styles.catalogTabTextActive]}>펫 도감</Text>
        </Pressable>
      </View>

      {catalog === 'pets' ? (
        <>
          <View style={styles.characterSummary}>
            <Text style={styles.characterSummaryTitle}>현재 함께 산책 중</Text>
            <Text style={styles.characterSummaryText}>{PETS.find((pet) => pet.id === petId)?.name}</Text>
          </View>
          <View style={styles.characterGrid}>
            {PETS.map((pet) => {
              const selected = pet.id === petId;
              return (
                <View key={pet.id} style={[styles.characterCard, selected && styles.characterCardSelected]}>
                  {selected && <View style={styles.activeRibbon}><Text style={styles.activeRibbonText}>동행 중</Text></View>}
                  <View style={styles.petPortrait}><PetCharacter petId={pet.id} size={58} /></View>
                  <Text style={styles.characterName}>{pet.name}</Text>
                  <Text style={styles.petNickname}>{pet.nickname}</Text>
                  <Text style={styles.characterDescription}>{pet.description}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : catalog === 'characters' ? (
        <>
          <View style={styles.characterSummary}>
            <Text style={styles.characterSummaryTitle}>현재 함께 여행 중</Text>
            <Text style={styles.characterSummaryText}>{AVATARS.find((avatar) => avatar.id === avatarId)?.name}</Text>
          </View>
          <View style={styles.characterGrid}>
            {AVATARS.map((avatar) => {
              const selected = avatar.id === avatarId;
              return (
                <View key={avatar.id} style={[styles.characterCard, selected && styles.characterCardSelected]}>
                  {selected && <View style={styles.activeRibbon}><Text style={styles.activeRibbonText}>사용 중</Text></View>}
                  <View style={[styles.characterPortrait, { backgroundColor: avatar.color }]}>
                    <PlayerCharacter avatarId={avatar.id} size={48} />
                  </View>
                  <Text style={styles.characterName}>{avatar.name}</Text>
                  <Text style={styles.characterDescription}>{avatar.description}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : (
      <>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressLabel}>도감 완성도</Text>
            <Text style={styles.progressFraction}>
              {discoveredCount} / {totalCount}개 발견
            </Text>
          </View>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeaf} />
        <Text style={styles.sectionTitle}>수집 카드</Text>
      </View>

      {encyclopedia.map((item) => {
        return (
          <View
            key={item.id}
            style={[
              styles.card,
              !item.isDiscovered && styles.cardLocked,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardRibbon}>
                <Text style={styles.cardRibbonText}>{item.region}</Text>
              </View>
              <View
                style={[
                  styles.emojiContainer,
                  !item.isDiscovered && styles.emojiContainerLocked,
                ]}
              >
                <Text style={styles.cropEmoji}>
                  {item.isDiscovered ? item.emoji : '🔒'}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.cropName,
                      !item.isDiscovered && styles.cropNameLocked,
                    ]}
                  >
                    {item.isDiscovered ? item.cropName : '미발견 특산물'}
                  </Text>
                </View>
                <Text style={styles.harvestStat}>
                  {item.isDiscovered
                    ? `총 ${item.harvestCount}회 수확 완료`
                    : '관광지 방문 시 잠금 해제'}
                </Text>
              </View>
            </View>

            {item.isDiscovered ? (
              <View style={styles.storyBox}>
                <Text style={styles.storyText}>{item.story}</Text>
                <View style={styles.pointRow}>
                  <Ionicons name="sparkles" size={13} color="#C99542" />
                  <Text style={styles.pointText}>{item.specialtyPoint}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.lockedHintBox}>
                <Ionicons name="lock-closed" size={14} color="#8A6A39" />
                <Text style={styles.lockedHintText}>
                  {item.region} 지역 관광지를 방문하여 인증하면 도감이 완성됩니다.
                </Text>
              </View>
            )}
          </View>
        );
      })}
      </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#78B96A',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#2D6840',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#1F4E31',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 4,
  },
  catalogTabs: { flexDirection: 'row', gap: 8, marginBottom: 16, padding: 4, borderRadius: 9, backgroundColor: '#DDE8B9' },
  catalogTab: { flex: 1, minHeight: 42, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  catalogTabActive: { backgroundColor: '#2D6840' },
  catalogTabText: { color: '#456044', fontSize: 13, fontWeight: '900' },
  catalogTabTextActive: { color: '#FFF8D9' },
  characterSummary: { backgroundColor: '#FFF8D9', borderWidth: 3, borderColor: '#B98043', borderRadius: 8, padding: 14, marginBottom: 14 },
  characterSummaryTitle: { color: '#7B5B2A', fontSize: 11, fontWeight: '900' },
  characterSummaryText: { color: '#2D6840', fontSize: 17, fontWeight: '900', marginTop: 3 },
  characterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  characterCard: { width: '48%', flexGrow: 1, minWidth: 140, backgroundColor: '#FFF8D9', borderRadius: 8, borderWidth: 3, borderColor: '#B98043', padding: 13, alignItems: 'center', overflow: 'hidden' },
  characterCardSelected: { borderColor: '#245F38', backgroundColor: '#F1F7DF' },
  activeRibbon: { position: 'absolute', right: -1, top: -1, zIndex: 2, backgroundColor: '#2D6840', borderBottomLeftRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  activeRibbonText: { color: '#FFF8D9', fontSize: 10, fontWeight: '900' },
  characterPortrait: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 9, borderWidth: 3, borderColor: '#FFF8D9' },
  petPortrait: { width: 76, height: 82, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  characterEmoji: { fontSize: 43 },
  characterStyleEmoji: { position: 'absolute', right: -3, bottom: -2, fontSize: 23 },
  characterName: { color: '#3A2A18', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  characterDescription: { color: '#6B6250', fontSize: 10, lineHeight: 15, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  petNickname: { color: '#8A5A2B', fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  bookBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8A5A2B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 9,
    borderWidth: 2,
    borderColor: '#6B3F1D',
  },
  bookBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF8D9',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF8D9',
  },
  subTitle: {
    fontSize: 13,
    color: '#DCEEC5',
    marginTop: 4,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    padding: 18,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#B98043',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    color: '#7B5B2A',
    fontWeight: '900',
  },
  progressFraction: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3A2A18',
    marginTop: 2,
  },
  progressPercent: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2D6840',
  },
  progressBarBg: {
    height: 14,
    backgroundColor: '#6B4A23',
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#5C3B16',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F7D878',
    borderRadius: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionLeaf: {
    width: 14,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#2D6840',
    transform: [{ rotate: '-30deg' }],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#24492E',
  },
  card: {
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#B98043',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
    elevation: 2,
  },
  cardLocked: {
    backgroundColor: '#E7D7A4',
    borderColor: '#A8874D',
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  cardRibbon: {
    position: 'absolute',
    right: 0,
    top: -5,
    backgroundColor: '#2D6840',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#1F4E31',
  },
  cardRibbonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF8D9',
  },
  emojiContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#F2E0A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#D5B66E',
  },
  emojiContainerLocked: {
    backgroundColor: '#C5B58A',
    borderColor: '#9C7A44',
  },
  cropEmoji: {
    fontSize: 30,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3A2A18',
  },
  cropNameLocked: {
    color: '#6B6250',
  },
  harvestStat: {
    fontSize: 11,
    color: '#2D6840',
    marginTop: 2,
    fontWeight: '800',
  },
  storyBox: {
    backgroundColor: '#F2E0A8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#D5B66E',
  },
  storyText: {
    fontSize: 12,
    color: '#5C4B2E',
    lineHeight: 18,
    marginBottom: 6,
    fontWeight: '600',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointText: {
    fontSize: 11,
    color: '#6B4A23',
    fontWeight: '900',
  },
  lockedHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4C48F',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    borderWidth: 2,
    borderColor: '#B1965C',
  },
  lockedHintText: {
    fontSize: 11,
    color: '#66583A',
    flex: 1,
    fontWeight: '700',
  },
});
