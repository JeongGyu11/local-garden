import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouristSpot } from '../types';

interface CheckInModalProps {
  visible: boolean;
  spot: TouristSpot | null;
  onClose: () => void;
  onGoToGarden: () => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  spot,
  onClose,
  onGoToGarden,
}) => {
  if (!spot) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={32} color="#F59E0B" />
          </View>

          <Text style={styles.badgeText}>📍 GPS 위치 인증 완료!</Text>
          <Text style={styles.spotTitle}>{spot.title}</Text>
          <Text style={styles.spotDesc}>
            관광지 방문이 성공적으로 확인되었습니다.
          </Text>

          {/* 획득 씨앗 박스 */}
          <View style={styles.seedBox}>
            <Text style={styles.seedEmoji}>{spot.seedEmoji}</Text>
            <View style={styles.seedTextCol}>
              <Text style={styles.seedObtainedLabel}>새로운 특산 씨앗 획득!</Text>
              <Text style={styles.seedName}>{spot.seedName}</Text>
              <Text style={styles.seedRegion}>
                [{spot.region} 특산물] 내 가든에 보관되었습니다.
              </Text>
            </View>
          </View>

          {/* 부스터 알림 */}
          <View style={styles.boosterTip}>
            <Ionicons name="flash" size={16} color="#E76F51" />
            <Text style={styles.boosterTipText}>
              방문 보너스로 <Text style={styles.bold}>작물 성장 2배 부스터</Text>가 적용됩니다!
            </Text>
          </View>

          {/* 버튼들 */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>계속 탐험</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gardenBtn}
              onPress={() => {
                onClose();
                onGoToGarden();
              }}
            >
              <Text style={styles.gardenBtnText}>내 가든에 심으러 가기</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  spotTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  spotDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  seedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  seedEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  seedTextCol: {
    flex: 1,
  },
  seedObtainedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  seedName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
    marginTop: 1,
  },
  seedRegion: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
  boosterTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    padding: 10,
    borderRadius: 10,
    gap: 6,
    width: '100%',
    marginBottom: 20,
  },
  boosterTipText: {
    fontSize: 11,
    color: '#9A3412',
    flex: 1,
  },
  bold: {
    fontWeight: '700',
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
  gardenBtn: {
    flex: 1.5,
    backgroundColor: '#2D6A4F',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  gardenBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
