import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Plant } from '../types';

interface HarvestModalProps {
  visible: boolean;
  plant: Plant | null;
  onClose: () => void;
  onGoToCoupons: () => void;
}

export const HarvestModal: React.FC<HarvestModalProps> = ({
  visible,
  plant,
  onClose,
  onGoToCoupons,
}) => {
  if (!plant) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.cropCircle}>
            <Text style={styles.cropEmoji}>{plant.emoji}</Text>
          </View>

          <Text style={styles.celebrateTitle}>🎉 특산 작물 수확 완료!</Text>
          <Text style={styles.plantName}>{plant.name}</Text>
          <Text style={styles.plantDesc}>
            정성으로 키워낸 {plant.region}의 명품 특산물이 완성되었습니다!
          </Text>

          {/* 지급 보상 박스 */}
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <Ionicons name="gift" size={16} color="#059669" />
              <Text style={styles.rewardHeaderText}>획득한 로컬 리워드</Text>
            </View>
            <Text style={styles.rewardTitle}>{plant.harvestReward}</Text>
            <Text style={styles.rewardNote}>
              쿠폰함에 지급되었으며, 실제 특산물 배송 신청 또는 매장에서 사용 가능합니다.
            </Text>
          </View>

          {/* 도감 업데이트 알림 */}
          <View style={styles.encyclopediaNotice}>
            <Ionicons name="book-outline" size={14} color="#2563EB" />
            <Text style={styles.encyclopediaNoticeText}>
              [전국 특산물 도감]에 수확 기록이 등록되었습니다 (+1).
            </Text>
          </View>

          {/* 버튼 */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>가든으로 돌아가기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.couponBtn}
              onPress={() => {
                onClose();
                onGoToCoupons();
              }}
            >
              <Text style={styles.couponBtnText}>쿠폰 확인하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  cropCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cropEmoji: {
    fontSize: 42,
  },
  celebrateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 2,
  },
  plantName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  plantDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  rewardCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rewardHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  rewardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  rewardNote: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
  },
  encyclopediaNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    width: '100%',
    marginBottom: 20,
  },
  encyclopediaNoticeText: {
    fontSize: 11,
    color: '#1D4ED8',
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  closeBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  couponBtn: {
    flex: 1.2,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  couponBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
