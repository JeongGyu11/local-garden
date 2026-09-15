import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarId, EncyclopediaItem, PetId } from '../types';
import { AVATARS } from '../data/avatarData';
import { PETS } from '../data/petData';
import { PetCharacter } from './PetCharacter';
import { PlayerCharacter } from './PlayerCharacter';
import { SeedVisual } from './SeedVisual';

interface EncyclopediaTabProps {
  encyclopedia: EncyclopediaItem[];
  avatarId: AvatarId;
  petId: PetId;
}

const formatHarvestDate = (value?: string) => {
  if (!value) {
    return '기록 없음';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '기록 없음';
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
};

export const EncyclopediaTab: React.FC<EncyclopediaTabProps> = ({
  encyclopedia,
  avatarId,
  petId,
}) => {
  const [catalog, setCatalog] = useState<'crops' | 'characters' | 'pets'>('crops');
  const totalHarvests = encyclopedia.reduce((sum, item) => sum + item.harvestCount, 0);
  const sortedRecords = [...encyclopedia].sort((a, b) => {
    const aTime = a.lastHarvestedAt ? new Date(a.lastHarvestedAt).getTime() : 0;
    const bTime = b.lastHarvestedAt ? new Date(b.lastHarvestedAt).getTime() : 0;
    return bTime - aTime;
  });

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
        <Text style={styles.title}>
          {catalog === 'crops'
            ? '수확 기록 도감'
            : catalog === 'characters'
              ? '여행 캐릭터 도감'
              : '동행 친구 도감'}
        </Text>
        <Text style={styles.subTitle}>
          {catalog === 'crops'
            ? '탐험에서 얻은 씨앗을 키워 수확한 순간마다 기록해요'
            : catalog === 'characters'
              ? '여행 취향마다 달라지는 여섯 캐릭터를 만나보세요'
              : '농장을 함께 산책하는 귀여운 친구들을 만나보세요'}
        </Text>
      </View>

      <View style={styles.catalogTabs}>
        <Pressable
          style={[styles.catalogTab, catalog === 'crops' && styles.catalogTabActive]}
          onPress={() => setCatalog('crops')}
        >
          <Ionicons name="leaf" size={16} color={catalog === 'crops' ? '#FFF8D9' : '#456044'} />
          <Text style={[styles.catalogTabText, catalog === 'crops' && styles.catalogTabTextActive]}>
            작물 도감
          </Text>
        </Pressable>
        <Pressable
          style={[styles.catalogTab, catalog === 'characters' && styles.catalogTabActive]}
          onPress={() => setCatalog('characters')}
        >
          <Ionicons name="people" size={16} color={catalog === 'characters' ? '#FFF8D9' : '#456044'} />
          <Text style={[styles.catalogTabText, catalog === 'characters' && styles.catalogTabTextActive]}>
            캐릭터 도감
          </Text>
        </Pressable>
        <Pressable
          style={[styles.catalogTab, catalog === 'pets' && styles.catalogTabActive]}
          onPress={() => setCatalog('pets')}
        >
          <Ionicons name="paw" size={16} color={catalog === 'pets' ? '#FFF8D9' : '#456044'} />
          <Text style={[styles.catalogTabText, catalog === 'pets' && styles.catalogTabTextActive]}>
            펫 도감
          </Text>
        </Pressable>
      </View>

      {catalog === 'pets' ? (
        <>
          <View style={styles.characterSummary}>
            <Text style={styles.characterSummaryTitle}>현재 함께 산책 중</Text>
            <Text style={styles.characterSummaryText}>
              {PETS.find((pet) => pet.id === petId)?.name}
            </Text>
          </View>
          <View style={styles.characterGrid}>
            {PETS.map((pet) => {
              const selected = pet.id === petId;
              return (
                <View key={pet.id} style={[styles.characterCard, selected && styles.characterCardSelected]}>
                  {selected && (
                    <View style={styles.activeRibbon}>
                      <Text style={styles.activeRibbonText}>동행 중</Text>
                    </View>
                  )}
                  <View style={styles.petPortrait}>
                    <PetCharacter petId={pet.id} size={58} />
                  </View>
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
            <Text style={styles.characterSummaryText}>
              {AVATARS.find((avatar) => avatar.id === avatarId)?.name}
            </Text>
          </View>
          <View style={styles.characterGrid}>
            {AVATARS.map((avatar) => {
              const selected = avatar.id === avatarId;
              return (
                <View key={avatar.id} style={[styles.characterCard, selected && styles.characterCardSelected]}>
                  {selected && (
                    <View style={styles.activeRibbon}>
                      <Text style={styles.activeRibbonText}>사용 중</Text>
                    </View>
                  )}
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
          <View style={styles.recordSummary}>
            <View>
              <Text style={styles.recordSummaryLabel}>기록된 작물</Text>
              <Text style={styles.recordSummaryValue}>{encyclopedia.length}종</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View>
              <Text style={styles.recordSummaryLabel}>총 수확</Text>
              <Text style={styles.recordSummaryValue}>{totalHarvests}회</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeaf} />
            <Text style={styles.sectionTitle}>수확 기록 카드</Text>
          </View>

          {sortedRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="leaf-outline" size={26} color="#FFF8D9" />
              </View>
              <Text style={styles.emptyTitle}>아직 수확 기록이 없어요</Text>
              <Text style={styles.emptyText}>
                탐험에서 씨앗을 얻고 농장에 심은 뒤, 다 자란 작물을 수확하면 이곳에 기록됩니다.
              </Text>
            </View>
          ) : (
            sortedRecords.map((item) => (
              <View key={item.id} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <View style={styles.recordIcon}>
                    <SeedVisual visual={item.visual} emoji={item.emoji} size={54} />
                  </View>
                  <View style={styles.recordInfo}>
                    <View style={styles.regionBadge}>
                      <Text style={styles.regionBadgeText}>{item.region}</Text>
                    </View>
                    <Text style={styles.cropName}>{item.cropName}</Text>
                    <Text style={styles.seedName}>{item.seedName ?? '탐험 씨앗'}</Text>
                  </View>
                  <View style={styles.harvestBadge}>
                    <Text style={styles.harvestBadgeCount}>{item.harvestCount}</Text>
                    <Text style={styles.harvestBadgeLabel}>수확</Text>
                  </View>
                </View>

                <View style={styles.storyBox}>
                  <Text style={styles.storyText}>{item.story}</Text>
                  <View style={styles.pointRow}>
                    <Ionicons name="sparkles" size={13} color="#C99542" />
                    <Text style={styles.pointText}>{item.specialtyPoint}</Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>첫 수확 {formatHarvestDate(item.firstHarvestedAt)}</Text>
                  <Text style={styles.dateText}>최근 수확 {formatHarvestDate(item.lastHarvestedAt)}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#78B96A' },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
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
  bookBadgeText: { fontSize: 12, fontWeight: '900', color: '#FFF8D9' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF8D9' },
  subTitle: { fontSize: 13, color: '#DCEEC5', marginTop: 4, fontWeight: '700' },
  catalogTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    padding: 4,
    borderRadius: 9,
    backgroundColor: '#DDE8B9',
  },
  catalogTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  catalogTabActive: { backgroundColor: '#2D6840' },
  catalogTabText: { color: '#456044', fontSize: 13, fontWeight: '900' },
  catalogTabTextActive: { color: '#FFF8D9' },
  characterSummary: {
    backgroundColor: '#FFF8D9',
    borderWidth: 3,
    borderColor: '#B98043',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  characterSummaryTitle: { color: '#7B5B2A', fontSize: 11, fontWeight: '900' },
  characterSummaryText: { color: '#2D6840', fontSize: 17, fontWeight: '900', marginTop: 3 },
  characterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  characterCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#B98043',
    padding: 13,
    alignItems: 'center',
    overflow: 'hidden',
  },
  characterCardSelected: { borderColor: '#245F38', backgroundColor: '#F1F7DF' },
  activeRibbon: {
    position: 'absolute',
    right: -1,
    top: -1,
    zIndex: 2,
    backgroundColor: '#2D6840',
    borderBottomLeftRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeRibbonText: { color: '#FFF8D9', fontSize: 10, fontWeight: '900' },
  characterPortrait: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    borderWidth: 3,
    borderColor: '#FFF8D9',
  },
  petPortrait: { width: 76, height: 82, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  characterName: { color: '#3A2A18', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  characterDescription: {
    color: '#6B6250',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 5,
  },
  petNickname: { color: '#8A5A2B', fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 3 },
  recordSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#B98043',
  },
  recordSummaryLabel: { fontSize: 12, color: '#7B5B2A', fontWeight: '900' },
  recordSummaryValue: { fontSize: 24, color: '#2D6840', fontWeight: '900', marginTop: 2 },
  summaryDivider: { width: 2, height: 42, backgroundColor: '#D5B66E', marginHorizontal: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLeaf: {
    width: 14,
    height: 14,
    borderRadius: 10,
    backgroundColor: '#2D6840',
    transform: [{ rotate: '-30deg' }],
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#24492E' },
  emptyCard: {
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#B98043',
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2D6840',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, color: '#3A2A18', fontWeight: '900', marginBottom: 6 },
  emptyText: {
    fontSize: 12,
    color: '#6B6250',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  recordCard: {
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#B98043',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
    elevation: 2,
  },
  recordTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recordIcon: {
    width: 66,
    height: 66,
    borderRadius: 8,
    backgroundColor: '#F2E0A8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#D5B66E',
  },
  recordInfo: { flex: 1, minWidth: 0 },
  regionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2D6840',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 5,
  },
  regionBadgeText: { fontSize: 10, color: '#FFF8D9', fontWeight: '900' },
  cropName: { fontSize: 17, fontWeight: '900', color: '#3A2A18' },
  seedName: { fontSize: 11, color: '#8A6A39', fontWeight: '800', marginTop: 3 },
  harvestBadge: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#2D6840',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1F4E31',
  },
  harvestBadgeCount: { fontSize: 18, color: '#FFF8D9', fontWeight: '900' },
  harvestBadgeLabel: { fontSize: 10, color: '#DCEEC5', fontWeight: '900' },
  storyBox: {
    backgroundColor: '#F2E0A8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: '#D5B66E',
  },
  storyText: { fontSize: 12, color: '#5C4B2E', lineHeight: 18, marginBottom: 6, fontWeight: '600' },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointText: { fontSize: 11, color: '#6B4A23', fontWeight: '900', flex: 1 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  dateText: {
    fontSize: 11,
    color: '#6B4A23',
    fontWeight: '800',
    backgroundColor: '#F6E8B7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
