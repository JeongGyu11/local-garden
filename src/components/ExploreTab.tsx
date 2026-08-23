import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouristSpot } from '../types';

interface ExploreTabProps {
  touristSpots: TouristSpot[];
  onCheckIn: (spot: TouristSpot) => void;
}

const REGIONS = ['전체', '제주', '전남', '경북', '강원', '충북'];

export const ExploreTab: React.FC<ExploreTabProps> = ({
  touristSpots,
  onCheckIn,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSpots = touristSpots.filter((spot) => {
    const matchesRegion =
      selectedRegion === '전체' || spot.region === selectedRegion;
    const matchesSearch =
      spot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.seedName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRegion && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* 검색 & 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>로컬 관광지 탐험 🗺️</Text>
        <Text style={styles.headerSub}>
          관광지를 방문하고 인증하면 해당 지역 특산 씨앗을 드려요!
        </Text>

        {/* 검색창 */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="관광지, 지역, 특산물 씨앗 검색..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* 지역 필터 칩 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regionFilterRow}
        >
          {REGIONS.map((region) => {
            const isSelected = selectedRegion === region;
            return (
              <TouchableOpacity
                key={region}
                style={[
                  styles.regionChip,
                  isSelected && styles.regionChipSelected,
                ]}
                onPress={() => setSelectedRegion(region)}
              >
                <Text
                  style={[
                    styles.regionChipText,
                    isSelected && styles.regionChipTextSelected,
                  ]}
                >
                  {region}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 관광지 리스트 */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listHeader}>
          <Text style={styles.listCount}>
            추천 관광지 <Text style={styles.bold}>{filteredSpots.length}</Text>개
          </Text>
          <View style={styles.apiBadge}>
            <Text style={styles.apiBadgeText}>🇰🇷 한국관광공사 TourAPI</Text>
          </View>
        </View>

        {filteredSpots.map((spot) => (
          <View key={spot.id} style={styles.spotCard}>
            <View style={styles.spotTop}>
              <View style={styles.badgeRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{spot.category}</Text>
                </View>
                <View style={styles.distanceBadge}>
                  <Ionicons name="location-outline" size={12} color="#64748B" />
                  <Text style={styles.distanceText}>{spot.distance}</Text>
                </View>
              </View>
              {spot.visited && (
                <View style={styles.visitedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.visitedText}>방문 완료</Text>
                </View>
              )}
            </View>

            <Text style={styles.spotTitle}>{spot.title}</Text>
            <Text style={styles.spotAddress}>{spot.address}</Text>
            <Text style={styles.spotDesc}>{spot.description}</Text>

            {/* 씨앗 리워드 박스 */}
            <View style={styles.rewardBox}>
              <View style={styles.rewardLeft}>
                <Text style={styles.rewardEmoji}>{spot.seedEmoji}</Text>
                <View>
                  <Text style={styles.rewardLabel}>방문 인증 시 획득 씨앗</Text>
                  <Text style={styles.rewardSeedName}>{spot.seedName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.checkInBtn,
                  spot.visited && styles.checkInBtnVisited,
                ]}
                onPress={() => onCheckIn(spot)}
              >
                <Ionicons
                  name={spot.visited ? 'refresh' : 'location'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.checkInBtnText}>
                  {spot.visited ? '재인증(+부스터)' : '위치 인증(체크인)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    marginLeft: 8,
  },
  regionFilterRow: {
    gap: 8,
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  regionChipSelected: {
    backgroundColor: '#2D6A4F',
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  regionChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listCount: {
    fontSize: 13,
    color: '#64748B',
  },
  bold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  apiBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  apiBadgeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  spotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  spotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: 11,
    color: '#64748B',
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visitedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  spotTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 3,
  },
  spotAddress: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  spotDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rewardEmoji: {
    fontSize: 22,
  },
  rewardLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  rewardSeedName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  checkInBtnVisited: {
    backgroundColor: '#0284C7',
  },
  checkInBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
