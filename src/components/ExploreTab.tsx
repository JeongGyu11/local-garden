import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouristSpot } from '../types';

interface ExploreTabProps {
  touristSpots: TouristSpot[];
  onCheckIn: (spot: TouristSpot) => void | Promise<void>;
  gpsStatusText: string;
  isGpsLoading: boolean;
  onRefreshNearby: () => void;
}

const REGIONS = ['전체', '제주', '전남', '경북', '강원', '충북'];
type ExploreMode = NonNullable<TouristSpot['discoveryType']>;

export const ExploreTab: React.FC<ExploreTabProps> = ({
  touristSpots,
  onCheckIn,
  gpsStatusText,
  isGpsLoading,
  onRefreshNearby,
}) => {
  const [exploreMode, setExploreMode] = useState<ExploreMode>('popular');
  const [selectedRegion, setSelectedRegion] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const openGoogleMapsRoute = (spot: TouristSpot) => {
    const destination =
      spot.latitude !== undefined && spot.longitude !== undefined
        ? `${spot.latitude},${spot.longitude}`
        : `${spot.title} ${spot.address}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=walking`;
    Linking.openURL(url);
  };

  const filteredSpots = touristSpots.filter((spot) => {
    const spotMode = spot.discoveryType ?? 'hiddenDiscovery';
    const matchesMode = spotMode === exploreMode;
    const matchesRegion =
      selectedRegion === '전체' || spot.region === selectedRegion;
    const matchesSearch =
      spot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.seedName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMode && matchesRegion && matchesSearch;
  });

  const modeTitleMap: Record<ExploreMode, string> = {
    popular: '인기 명소',
    nearPopular: '인기 명소 옆',
    hiddenDiscovery: '숨은 관광지 발견',
  };
  const modeDescriptionMap: Record<ExploreMode, string> = {
    popular: 'Gemini가 대표 명소로 분류한 GPS 주변 TourAPI 장소예요',
    nearPopular: '인기 명소 근처의 사람들이 잘 모를 만한 장소예요',
    hiddenDiscovery: '인기 동선에서 조금 떨어진 비인기 후보를 발견해보세요',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBoard}>
          <Text style={styles.headerKicker}>관광 수요를 주변으로 넓히는 농장 의뢰</Text>
          <Text style={styles.headerTitle}>숨은 관광지 탐험</Text>
          <Text style={styles.headerSub}>
            현재 GPS 주변 TourAPI 관광지만 씨앗 보상으로 연결해요
          </Text>
        </View>

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, exploreMode === 'popular' && styles.modeTabActive]}
            onPress={() => setExploreMode('popular')}
          >
            <Ionicons
              name="star"
              size={15}
              color={exploreMode === 'popular' ? '#FFF8D9' : '#6B4A23'}
            />
            <Text style={[styles.modeTabText, exploreMode === 'popular' && styles.modeTabTextActive]}>
              인기 명소
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, exploreMode === 'nearPopular' && styles.modeTabActive]}
            onPress={() => setExploreMode('nearPopular')}
          >
            <Ionicons
              name="trail-sign"
              size={16}
              color={exploreMode === 'nearPopular' ? '#FFF8D9' : '#6B4A23'}
            />
            <Text style={[styles.modeTabText, exploreMode === 'nearPopular' && styles.modeTabTextActive]}>
              명소 옆
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, exploreMode === 'hiddenDiscovery' && styles.modeTabActive]}
            onPress={() => setExploreMode('hiddenDiscovery')}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={exploreMode === 'hiddenDiscovery' ? '#FFF8D9' : '#6B4A23'}
            />
            <Text style={[styles.modeTabText, exploreMode === 'hiddenDiscovery' && styles.modeTabTextActive]}>
              숨은 발견
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#6B4A23" />
          <TextInput
            style={styles.searchInput}
            placeholder="관광지, 지역, 씨앗 찾기"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9C7A44"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8A5A2B" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.gpsPanel}>
          <View style={styles.gpsTextRow}>
            <Ionicons name="navigate-circle" size={18} color="#2D6840" />
            <Text style={styles.gpsStatusText}>
              {isGpsLoading ? 'GPS로 주변 관광지를 찾는 중...' : gpsStatusText}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefreshNearby}>
            <Ionicons name="refresh" size={15} color="#FFF8D9" />
            <Text style={styles.refreshBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>

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

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listCount}>{modeTitleMap[exploreMode]}</Text>
            <Text style={styles.listCountStrong}>{filteredSpots.length}곳 발견</Text>
            <Text style={styles.listDescription}>{modeDescriptionMap[exploreMode]}</Text>
          </View>
          <View style={styles.apiBadge}>
            <Text style={styles.apiBadgeText}>TourAPI + Gemini</Text>
          </View>
        </View>

        {filteredSpots.map((spot) => (
          <View key={spot.id} style={styles.spotCard}>
            <View style={styles.cardPin} />
            <View style={styles.spotMainRow}>
              {spot.imageUrl ? (
                <Image
                  source={{ uri: spot.imageUrl }}
                  style={styles.spotImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.spotImageFallback}>
                  <Text style={styles.spotImageEmoji}>{spot.seedEmoji}</Text>
                  <Text style={styles.spotImageFallbackText}>탐험지</Text>
                </View>
              )}

              <View style={styles.spotInfo}>
                <View style={styles.spotTop}>
                  <View style={styles.badgeRow}>
                    {spot.discoveryType === 'nearPopular' && spot.anchorName && (
                      <View style={styles.anchorBadge}>
                        <Ionicons name="flag" size={11} color="#FFF8D9" />
                        <Text style={styles.anchorText}>{spot.anchorName} 옆</Text>
                      </View>
                    )}
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
              </View>
            </View>

            <View style={styles.rewardBox}>
              <View style={styles.rewardLeft}>
                <View style={styles.rewardSeedBubble}>
                  <Text style={styles.rewardEmoji}>{spot.seedEmoji}</Text>
                </View>
                <View style={styles.rewardTextBlock}>
                  <Text style={styles.rewardLabel}>의뢰 보상</Text>
                  <Text style={styles.rewardSeedName}>{spot.seedName}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.routeBtn}
                  onPress={() => openGoogleMapsRoute(spot)}
                >
                  <Ionicons name="map" size={16} color="#3A2A18" />
                  <Text style={styles.routeBtnText}>길찾기</Text>
                </TouchableOpacity>
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
                    {spot.visited ? '재인증' : '위치 인증'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {filteredSpots.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="navigate" size={24} color="#FFF8D9" />
            </View>
            <Text style={styles.emptyTitle}>GPS 기반 관광지가 아직 없어요</Text>
            <Text style={styles.emptyText}>
              위치 권한을 허용하고 새로고침을 눌러주세요. 기본으로 세팅된 장소는 표시하지 않고,
              현재 위치 주변 TourAPI 결과를 Gemini가 분류한 장소만 보여줍니다.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={onRefreshNearby}>
              <Ionicons name="refresh" size={15} color="#FFF8D9" />
              <Text style={styles.emptyButtonText}>GPS로 다시 찾기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#78B96A',
  },
  header: {
    backgroundColor: '#78B96A',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerBoard: {
    backgroundColor: '#2D6840',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#1F4E31',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 4,
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F7D878',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF8D9',
  },
  headerSub: {
    fontSize: 13,
    color: '#DCEEC5',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#D5B66E',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#3D321F',
    marginLeft: 8,
    fontWeight: '700',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#E6F5C9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#5E8E42',
    gap: 4,
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8D9',
    borderRadius: 7,
    gap: 5,
    borderWidth: 2,
    borderColor: '#D5B66E',
    paddingHorizontal: 6,
  },
  modeTabActive: {
    backgroundColor: '#8A5A2B',
    borderColor: '#6B3F1D',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6B4A23',
    textAlign: 'center',
  },
  modeTabTextActive: {
    color: '#FFF8D9',
  },
  regionFilterRow: {
    gap: 8,
  },
  gpsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F5C9',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#5E8E42',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
  },
  gpsTextRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  gpsStatusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#24492E',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6840',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 4,
    borderWidth: 2,
    borderColor: '#1F4E31',
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF8D9',
  },
  regionChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFF8D9',
    borderWidth: 2,
    borderColor: '#D5B66E',
  },
  regionChipSelected: {
    backgroundColor: '#8A5A2B',
    borderColor: '#6B3F1D',
  },
  regionChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B4A23',
  },
  regionChipTextSelected: {
    color: '#FFF8D9',
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
    backgroundColor: 'rgba(255, 248, 217, 0.62)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'rgba(107, 74, 35, 0.2)',
  },
  listCount: {
    fontSize: 11,
    color: '#466233',
    fontWeight: '800',
  },
  listCountStrong: {
    fontSize: 15,
    color: '#24492E',
    fontWeight: '900',
  },
  listDescription: {
    fontSize: 11,
    color: '#466233',
    fontWeight: '700',
    marginTop: 2,
  },
  apiBadge: {
    backgroundColor: '#F7D878',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C99542',
  },
  apiBadgeText: {
    fontSize: 11,
    color: '#5C3B16',
    fontWeight: '900',
  },
  spotCard: {
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 3,
    borderWidth: 3,
    borderColor: '#B98043',
    position: 'relative',
  },
  cardPin: {
    position: 'absolute',
    top: -7,
    left: 18,
    width: 20,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#D95845',
    borderWidth: 2,
    borderColor: '#8F3A25',
  },
  spotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  spotMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  spotInfo: {
    flex: 1,
    minWidth: 0,
  },
  spotImage: {
    width: 178,
    height: 178,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D5B66E',
    backgroundColor: '#E6F5C9',
  },
  spotImageFallback: {
    width: 178,
    height: 178,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D5B66E',
    backgroundColor: '#E6F5C9',
  },
  spotImageEmoji: {
    fontSize: 38,
    marginBottom: 6,
  },
  spotImageFallbackText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#466233',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  anchorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#2D6840',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  anchorText: {
    fontSize: 11,
    color: '#FFF8D9',
    fontWeight: '900',
  },
  categoryBadge: {
    backgroundColor: '#E9D090',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    color: '#5C3B16',
    fontWeight: '800',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: 11,
    color: '#6B4A23',
    fontWeight: '700',
  },
  visitedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F5C9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visitedText: {
    fontSize: 11,
    color: '#2D6840',
    fontWeight: '700',
  },
  spotTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3A2A18',
    marginBottom: 3,
  },
  spotAddress: {
    fontSize: 12,
    color: '#8A6A39',
    marginBottom: 8,
    fontWeight: '700',
  },
  spotDesc: {
    fontSize: 13,
    color: '#5C4B2E',
    lineHeight: 18,
    marginBottom: 12,
    fontWeight: '600',
  },
  rewardBox: {
    backgroundColor: '#F2E0A8',
    borderRadius: 8,
    padding: 14,
    borderWidth: 2,
    borderColor: '#D5B66E',
    marginTop: 12,
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  routeBtn: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEFAE',
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
    borderWidth: 2,
    borderColor: '#C99542',
  },
  routeBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3A2A18',
  },
  rewardSeedBubble: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEFAE',
    borderWidth: 2,
    borderColor: '#C99542',
  },
  rewardEmoji: {
    fontSize: 30,
  },
  rewardTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rewardLabel: {
    fontSize: 12,
    color: '#7B5B2A',
    fontWeight: '900',
    marginBottom: 3,
  },
  rewardSeedName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#3A2A18',
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6840',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 2,
    borderColor: '#1F4E31',
  },
  checkInBtnVisited: {
    backgroundColor: '#8A5A2B',
    borderColor: '#6B3F1D',
  },
  checkInBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFF8D9',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 24,
    borderWidth: 3,
    borderColor: '#B98043',
    shadowColor: '#2E2718',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 0,
    elevation: 3,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D6840',
    borderWidth: 2,
    borderColor: '#1F4E31',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#3A2A18',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C4B2E',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6840',
    borderRadius: 8,
    paddingHorizontal: 14,
    gap: 5,
    borderWidth: 2,
    borderColor: '#1F4E31',
  },
  emptyButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF8D9',
  },
});
