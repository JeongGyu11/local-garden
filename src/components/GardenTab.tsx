import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Plant, Seed } from '../types';
import { AnimalCrossingGarden } from './AnimalCrossingGarden';

interface GardenTabProps {
  plants: Plant[];
  seeds: Seed[];
  onWater: (plantId: string) => void;
  onSun: (plantId: string) => void;
  onHarvest: (plant: Plant) => void;
  onPlantSeed: (seed: Seed, plotIndex?: number) => void;
  onGoExplore: () => void;
}

const STAGE_NAMES = ['🌱 씨앗', '🌿 새싹', '🌸 꽃봉오리', '🍊 열매 맺음', '✨ 수확 가능!'];

export const GardenTab: React.FC<GardenTabProps> = ({
  plants,
  seeds,
  onWater,
  onSun,
  onHarvest,
  onPlantSeed,
  onGoExplore,
}) => {
  const [viewMode, setViewMode] = useState<'game' | 'list'>('game');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 상단 뷰 모드 스위처 (동물의 숲 게임 모드 vs 리스트 모드) */}
      <View style={styles.viewModeRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'game' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('game')}
        >
          <Ionicons
            name="game-controller"
            size={16}
            color={viewMode === 'game' ? '#FFFFFF' : '#64748B'}
          />
          <Text
            style={[
              styles.viewModeBtnText,
              viewMode === 'game' && styles.viewModeBtnTextActive,
            ]}
          >
            동물의 숲 팜 모드 🎮
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons
            name="list"
            size={16}
            color={viewMode === 'list' ? '#FFFFFF' : '#64748B'}
          />
          <Text
            style={[
              styles.viewModeBtnText,
              viewMode === 'list' && styles.viewModeBtnTextActive,
            ]}
          >
            한눈에 리스트 📋
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. 동물의 숲 인터랙티브 게임 모드 */}
      {viewMode === 'game' ? (
        <AnimalCrossingGarden
          plants={plants}
          seeds={seeds}
          onWater={onWater}
          onSun={onSun}
          onHarvest={onHarvest}
          onPlantSeed={onPlantSeed}
          onGoExplore={onGoExplore}
        />
      ) : (
        /* 2. 대시보드 리스트 모드 */
        <View style={styles.listViewContainer}>
          {/* 가든 빌리지 헤더 */}
          <View style={styles.header}>
            <View>
              <View style={styles.levelRow}>
                <Text style={styles.villageLevel}>Lv.3 로컬 정원사</Text>
                <View style={styles.weatherBadge}>
                  <Text style={styles.weatherText}>☀️ 제주 맑음 23°C</Text>
                </View>
              </View>
              <Text style={styles.title}>내 특산 가든 🏡</Text>
            </View>
            <TouchableOpacity style={styles.exploreQuickBtn} onPress={onGoExplore}>
              <Ionicons name="compass-outline" size={18} color="#2D6A4F" />
              <Text style={styles.exploreQuickText}>씨앗 찾으러 가기</Text>
            </TouchableOpacity>
          </View>

          {/* 가든 부스터 배너 */}
          <View style={styles.boosterBanner}>
            <Ionicons name="sparkles" size={20} color="#F59E0B" />
            <Text style={styles.boosterText}>
              관광지 체크인 시 <Text style={styles.bold}>성장 속도 2배 부스터</Text> 활성화!
            </Text>
          </View>

          {/* 재배 중인 특산 작물 목록 */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>재배 중인 특산 작물 ({plants.length})</Text>
            <Text style={styles.sectionSub}>물과 햇빛을 주어 수확 단계까지 키워보세요!</Text>
          </View>

          {plants.length === 0 ? (
            <View style={styles.emptyGardenCard}>
              <Text style={styles.emptyEmoji}>🌾</Text>
              <Text style={styles.emptyTitle}>밭이 비어있습니다</Text>
              <Text style={styles.emptyDesc}>
                아래 씨앗 보관함에서 씨앗을 심거나, 관광지를 탐험해 새 씨앗을 얻어보세요!
              </Text>
            </View>
          ) : (
            plants.map((plant) => {
              const isHarvestReady = plant.growthStage >= 4;
              const stageName = STAGE_NAMES[plant.growthStage] || '✨ 수확 가능';

              return (
                <View key={plant.id} style={styles.plantCard}>
                  <View style={styles.plantCardHeader}>
                    <View style={styles.plantEmojiBox}>
                      <Text style={styles.plantEmoji}>{plant.emoji}</Text>
                    </View>
                    <View style={styles.plantInfo}>
                      <View style={styles.plantTitleRow}>
                        <Text style={styles.plantName}>{plant.name}</Text>
                        <View style={styles.regionBadge}>
                          <Text style={styles.regionBadgeText}>{plant.region}</Text>
                        </View>
                      </View>
                      <Text style={styles.plantSpecies}>{plant.species}</Text>
                    </View>
                    <View
                      style={[
                        styles.stagePill,
                        isHarvestReady ? styles.stagePillHarvest : styles.stagePillNormal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stagePillText,
                          isHarvestReady ? styles.stagePillTextHarvest : styles.stagePillTextNormal,
                        ]}
                      >
                        {stageName}
                      </Text>
                    </View>
                  </View>

                  {/* 진행도 게이지 바 */}
                  <View style={styles.gaugeContainer}>
                    <View style={styles.gaugeRow}>
                      <View style={styles.gaugeLabel}>
                        <Ionicons name="water" size={14} color="#3B82F6" />
                        <Text style={styles.gaugeText}>수분 충전도</Text>
                      </View>
                      <Text style={styles.gaugeValue}>{plant.waterProgress}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${plant.waterProgress}%`, backgroundColor: '#3B82F6' },
                        ]}
                      />
                    </View>

                    <View style={[styles.gaugeRow, { marginTop: 8 }]}>
                      <View style={styles.gaugeLabel}>
                        <Ionicons name="sunny" size={14} color="#F59E0B" />
                        <Text style={styles.gaugeText}>일조량 충전도</Text>
                      </View>
                      <Text style={styles.gaugeValue}>{plant.sunProgress}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${plant.sunProgress}%`, backgroundColor: '#F59E0B' },
                        ]}
                      />
                    </View>
                  </View>

                  {/* 하단 액션 버튼 */}
                  <View style={styles.actionRow}>
                    {isHarvestReady ? (
                      <TouchableOpacity
                        style={styles.harvestBtn}
                        onPress={() => onHarvest(plant)}
                      >
                        <MaterialCommunityIcons name="hand-peace" size={20} color="#FFFFFF" />
                        <Text style={styles.harvestBtnText}>지금 수확하기! (보상 수령)</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.waterBtn}
                          onPress={() => onWater(plant.id)}
                        >
                          <Ionicons name="water" size={16} color="#2563EB" />
                          <Text style={styles.waterBtnText}>물주기 (+25%)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.sunBtn}
                          onPress={() => onSun(plant.id)}
                        >
                          <Ionicons name="sunny" size={16} color="#D97706" />
                          <Text style={styles.sunBtnText}>햇빛쬐기 (+25%)</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* 보유 씨앗 보관함 */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>보유 중인 특산 씨앗 ({seeds.length})</Text>
            <Text style={styles.sectionSub}>관광지 체크인으로 획득한 씨앗입니다.</Text>
          </View>

          {seeds.length === 0 ? (
            <View style={styles.emptySeedsBox}>
              <Text style={styles.emptySeedText}>
                보유 중인 씨앗이 없습니다. [로컬 탐험] 탭에서 관광지를 방문해 보세요!
              </Text>
            </View>
          ) : (
            seeds.map((seed) => (
              <View key={seed.id} style={styles.seedCard}>
                <View style={styles.seedEmojiBox}>
                  <Text style={styles.seedEmoji}>{seed.emoji}</Text>
                </View>
                <View style={styles.seedInfo}>
                  <View style={styles.seedTitleRow}>
                    <Text style={styles.seedName}>{seed.name}</Text>
                    <View style={styles.seedRegionTag}>
                      <Text style={styles.seedRegionText}>{seed.region}</Text>
                    </View>
                  </View>
                  <Text style={styles.seedDesc}>{seed.description}</Text>
                </View>
                <TouchableOpacity
                  style={styles.plantSeedBtn}
                  onPress={() => onPlantSeed(seed)}
                >
                  <Text style={styles.plantSeedBtnText}>밭에 심기</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingBottom: 40,
  },
  viewModeRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 3,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#2D6A4F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  viewModeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  viewModeBtnTextActive: {
    color: '#FFFFFF',
  },
  listViewContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  villageLevel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D6A4F',
    backgroundColor: '#D8F3DC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weatherBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  weatherText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B4332',
  },
  exploreQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  exploreQuickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  boosterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 8,
  },
  boosterText: {
    fontSize: 13,
    color: '#78350F',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3748',
  },
  sectionSub: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  emptyGardenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A5568',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  plantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EBF2EE',
  },
  plantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  plantEmojiBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  plantEmoji: {
    fontSize: 28,
  },
  plantInfo: {
    flex: 1,
  },
  plantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  regionBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  regionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  plantSpecies: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  stagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stagePillNormal: {
    backgroundColor: '#F3F4F6',
  },
  stagePillHarvest: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  stagePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stagePillTextNormal: {
    color: '#4B5563',
  },
  stagePillTextHarvest: {
    color: '#B45309',
  },
  gaugeContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  gaugeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gaugeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gaugeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  gaugeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  waterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  waterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  sunBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFBEB',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sunBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  harvestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  harvestBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptySeedsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptySeedText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  seedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  seedEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  seedEmoji: {
    fontSize: 22,
  },
  seedInfo: {
    flex: 1,
  },
  seedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  seedRegionTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  seedRegionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  seedDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  plantSeedBtn: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  plantSeedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
