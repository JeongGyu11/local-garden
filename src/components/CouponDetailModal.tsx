import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Coupon } from '../types';

interface CouponDetailModalProps {
  visible: boolean;
  coupon: Coupon | null;
  onClose: () => void;
  onConfirmUse: (couponId: string) => void;
}

export const CouponDetailModal: React.FC<CouponDetailModalProps> = ({
  visible,
  coupon,
  onClose,
  onConfirmUse,
}) => {
  if (!coupon) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* 닫기 버튼 */}
          <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>

          <View style={styles.brandTag}>
            <Text style={styles.brandTagText}>{coupon.brand}</Text>
          </View>

          <Text style={styles.couponTitle}>{coupon.title}</Text>
          <Text style={styles.discountHighlight}>{coupon.discount}</Text>

          {/* 모의 바코드 UI */}
          <View style={styles.barcodeBox}>
            <View style={styles.barcodeLines}>
              {[18, 4, 12, 6, 20, 10, 4, 16, 8, 22, 6, 14, 4, 18, 10, 8, 24, 4, 16, 6].map(
                (w, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.barcodeBar,
                      { width: (idx % 3 === 0 ? 3 : 2), height: 45 },
                    ]}
                  />
                )
              )}
            </View>
            <Text style={styles.barcodeCodeText}>{coupon.code}</Text>
            <Text style={styles.barcodeHint}>
              결제 시 매장 직원에게 위 바코드 및 코드를 제시해 주세요.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>지역</Text>
              <Text style={styles.infoVal}>{coupon.region}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>획득 경로</Text>
              <Text style={styles.infoVal}>{coupon.sourceCrop}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>유효기간</Text>
              <Text style={styles.infoVal}>{coupon.expiryDate}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.useConfirmBtn}
            onPress={() => {
              onConfirmUse(coupon.id);
              onClose();
            }}
          >
            <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.useConfirmBtnText}>매장에서 사용 완료 처리</Text>
          </TouchableOpacity>
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
  closeIconBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
  },
  brandTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 6,
  },
  brandTagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  couponTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  discountHighlight: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D6A4F',
    marginBottom: 16,
  },
  barcodeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  barcodeLines: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
    height: 48,
  },
  barcodeBar: {
    backgroundColor: '#1E293B',
    borderRadius: 1,
  },
  barcodeCodeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#1E293B',
    marginBottom: 4,
  },
  barcodeHint: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  useConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D6A4F',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    gap: 6,
  },
  useConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
