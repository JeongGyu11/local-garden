import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Coupon } from '../types';

interface CouponsTabProps {
  coupons: Coupon[];
  onUseCoupon: (coupon: Coupon) => void;
}

export const CouponsTab: React.FC<CouponsTabProps> = ({
  coupons,
  onUseCoupon,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'used'>('available');

  const filteredCoupons = coupons.filter((c) =>
    activeTab === 'available' ? !c.used : c.used
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 쿠폰 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>로컬 혜택 & 쿠폰함 🎟️</Text>
        <Text style={styles.subTitle}>
          작물 육성 및 관광지 방문으로 획득한 특산물 할인권과 배송권입니다.
        </Text>
      </View>

      {/* 탭 전환 버튼 */}
      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'available' && styles.tabBtnActive]}
          onPress={() => setActiveTab('available')}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'available' && styles.tabBtnTextActive,
            ]}
          >
            사용 가능 ({coupons.filter((c) => !c.used).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'used' && styles.tabBtnActive]}
          onPress={() => setActiveTab('used')}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'used' && styles.tabBtnTextActive,
            ]}
          >
            사용 완료 ({coupons.filter((c) => c.used).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 쿠폰 리스트 */}
      {filteredCoupons.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="ticket-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>
            {activeTab === 'available'
              ? '보유 중인 쿠폰이 없습니다.'
              : '사용 완료된 쿠폰이 없습니다.'}
          </Text>
          <Text style={styles.emptyDesc}>
            관광지 방문 또는 작물을 수확하여 다양한 로컬 혜택을 받아보세요!
          </Text>
        </View>
      ) : (
        filteredCoupons.map((coupon) => (
          <View
            key={coupon.id}
            style={[styles.couponCard, coupon.used && styles.couponCardUsed]}
          >
            <View style={styles.couponLeft}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{coupon.discount}</Text>
              </View>
              <View style={styles.regionTag}>
                <Text style={styles.regionTagText}>{coupon.region}</Text>
              </View>
            </View>

            <View style={styles.couponDivider} />

            <View style={styles.couponRight}>
              <Text style={styles.brandName}>{coupon.brand}</Text>
              <Text style={styles.couponTitle}>{coupon.title}</Text>
              <Text style={styles.sourceCrop}>{coupon.sourceCrop}</Text>
              <Text style={styles.expiryDate}>유효기간: {coupon.expiryDate}</Text>

              {!coupon.used ? (
                <TouchableOpacity
                  style={styles.useBtn}
                  onPress={() => onUseCoupon(coupon)}
                >
                  <MaterialIcons name="qr-code-scanner" size={16} color="#FFFFFF" />
                  <Text style={styles.useBtnText}>바코드 / 사용하기</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.usedBadge}>
                  <Text style={styles.usedBadgeText}>사용 완료</Text>
                </View>
              )}
            </View>
          </View>
        ))
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
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  couponCardUsed: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  couponLeft: {
    width: 90,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  discountBadge: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  regionTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  regionTagText: {
    fontSize: 10,
    color: '#2D6A4F',
    fontWeight: '700',
  },
  couponDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  couponRight: {
    flex: 1,
    padding: 14,
  },
  brandName: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
    marginBottom: 4,
  },
  sourceCrop: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 10,
  },
  useBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D6A4F',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  useBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usedBadge: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  usedBadgeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
});
