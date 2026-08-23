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
  onGoToEncyclopedia: () => void;
}

export const HarvestModal: React.FC<HarvestModalProps> = ({
  visible,
  plant,
  onClose,
  onGoToEncyclopedia,
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
            정성으로 키워낸 {plant.region}의 명품 특산물이 성공적으로 수확되었습니다!
          </Text>

          {/* 수확 성과 카드 */}
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <Ionicons name="ribbon" size={18} color="#059669" />
              <Text style={styles.rewardHeaderText}>도감 등록 및 수확 업적</Text>
            </View>
            <Text style={styles.rewardTitle}>🏆 {plant.region} 마스터 배지 획득</Text>
            <Text style={styles.rewardNote}>
              [전국 특산물 도감]에 수확 기록이 영구 등록되며, 정원사 경험치(+100 EXP)를 획득했습니다!
            </Text>
          </View>

          {/* 마을 번영도 알림 */}
          <View style={styles.villageNotice}>
            <Ionicons name="sparkles" size={16} color="#D97706" />
            <Text style={styles.villageNoticeText}>
              우리 팜 빌리지의 번영도 레벨이 상승했습니다! ✨
            </Text>
          </View>

          {/* 버튼 */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>계속 가꾸기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.encyclopediaBtn}
              onPress={() => {
                onClose();
                onGoToEncyclopedia();
              }}
            >
              <Text style={styles.encyclopediaBtnText}>도감 보러가기 📖</Text>
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
    gap: 6,
    marginBottom: 6,
  },
  rewardHeaderText: {
    fontSize: 12,
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
  villageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 20,
  },
  villageNoticeText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
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
  encyclopediaBtn: {
    flex: 1.3,
    backgroundColor: '#2D6A4F',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  encyclopediaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
