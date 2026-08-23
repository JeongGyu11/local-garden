import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EncyclopediaItem } from '../types';

interface EncyclopediaTabProps {
  encyclopedia: EncyclopediaItem[];
}

export const EncyclopediaTab: React.FC<EncyclopediaTabProps> = ({
  encyclopedia,
}) => {
  const discoveredCount = encyclopedia.filter((item) => item.isDiscovered).length;
  const totalCount = encyclopedia.length;
  const progressPercent = Math.round((discoveredCount / totalCount) * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 도감 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>전국 특산물 도감 📖</Text>
        <Text style={styles.subTitle}>
          여행지를 방문해 전국 8도의 모든 특산물을 수집해 보세요!
        </Text>
      </View>

      {/* 수집 진행률 카드 */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.progressLabel}>전국 특산물 수집률</Text>
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

      {/* 도감 목록 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>특산 작물 도감 카드</Text>
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
                  <View style={styles.regionTag}>
                    <Text style={styles.regionTagText}>{item.region}</Text>
                  </View>
                </View>
                <Text style={styles.harvestStat}>
                  {item.isDiscovered
                    ? `🏆 총 ${item.harvestCount}회 수확 완료`
                    : '관광지 방문 시 잠금 해제'}
                </Text>
              </View>
            </View>

            {item.isDiscovered ? (
              <View style={styles.storyBox}>
                <Text style={styles.storyText}>{item.story}</Text>
                <View style={styles.pointRow}>
                  <Ionicons name="sparkles" size={13} color="#059669" />
                  <Text style={styles.pointText}>{item.specialtyPoint}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.lockedHintBox}>
                <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
                <Text style={styles.lockedHintText}>
                  {item.region} 지역 관광지를 방문하여 인증하면 도감이 완성됩니다.
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  subTitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  progressFraction: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  progressPercent: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2D6A4F',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: 5,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emojiContainerLocked: {
    backgroundColor: '#E2E8F0',
  },
  cropEmoji: {
    fontSize: 24,
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
    fontWeight: '700',
    color: '#1E293B',
  },
  cropNameLocked: {
    color: '#94A3B8',
  },
  regionTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  regionTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  harvestStat: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '500',
  },
  storyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  storyText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pointText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  lockedHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  lockedHintText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
});
