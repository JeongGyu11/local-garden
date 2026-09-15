import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PetId } from '../types';
import { getPetDefinition } from '../data/petData';

interface PetCharacterProps {
  petId: PetId;
  size?: number;
}

/**
 * 3종 펫(미어캣, 카피바라, 판다) 일체형 커스텀 벡터 캐릭터
 */
export const PetCharacter: React.FC<PetCharacterProps> = ({ petId, size = 48 }) => {
  const pet = getPetDefinition(petId);
  const unit = size / 48;

  return (
    <View style={{ width: size, height: size * 1.25, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* 바닥 그림자 */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: 32 * unit,
          height: 8 * unit,
          borderRadius: 4 * unit,
          backgroundColor: 'rgba(0,0,0,0.18)',
        }}
      />

      {/* 펫 일체형 캐릭터 래퍼 */}
      <View style={[styles.petWrapper, { transform: [{ scale: unit }] }]}>
        {/* ================= 1. 미어캣 (Authentic Meerkat) ================= */}
        {petId === 'meerkat' && (
          <View style={styles.meerkatContainer}>
            {/* 미어캣 긴 꼬리 (끝부분 검은색 포인트) */}
            <View style={styles.meerkatTailBase}>
              <View style={styles.meerkatTailTip} />
            </View>

            {/* 미어캣 꼿꼿하게 서있는 긴 몸통 & 등 줄무늬 & 배 털 */}
            <View style={styles.meerkatBody}>
              <View style={styles.meerkatBackStripe1} />
              <View style={styles.meerkatBackStripe2} />
              <View style={styles.meerkatBackStripe3} />
              <View style={styles.meerkatBelly} />
              {/* 가슴 스카프 */}
              <View style={styles.meerkatScarf}>
                <Ionicons name="leaf" size={7} color="#FFF8D6" />
              </View>
            </View>

            {/* 다소곳하게 모은 긴 앞발 */}
            <View style={styles.meerkatHandsRow}>
              <View style={styles.meerkatHand} />
              <View style={styles.meerkatHand} />
            </View>

            {/* 두 발로 우뚝 선 뒷발 및 발톱 */}
            <View style={[styles.meerkatFoot, styles.meerkatFootLeft]} />
            <View style={[styles.meerkatFoot, styles.meerkatFootRight]} />

            {/* 쐐기형 머리 */}
            <View style={styles.meerkatHead}>
              {/* 귀 (머리 옆작은 미어캣 귀) */}
              <View style={[styles.meerkatEar, styles.meerkatEarLeft]} />
              <View style={[styles.meerkatEar, styles.meerkatEarRight]} />

              {/* 선글라스 모양 뚜렷한 미어캣 아이패치 */}
              <View style={styles.meerkatEyePatchLeft} />
              <View style={styles.meerkatEyePatchRight} />

              {/* 반짝이는 눈동자 */}
              <View style={styles.meerkatEyeLeft}>
                <View style={styles.meerkatPupilDot} />
              </View>
              <View style={styles.meerkatEyeRight}>
                <View style={styles.meerkatPupilDot} />
              </View>

              {/* 미어캣 전용 돌출 쐐기 주둥이 & 코 */}
              <View style={styles.meerkatWedgeSnout}>
                <View style={styles.meerkatTriNose} />
                <View style={styles.meerkatMouthLine} />
              </View>

              {/* 생기 볼터치 */}
              <View style={styles.cheekLeft} />
              <View style={styles.cheekRight} />
            </View>
          </View>
        )}

        {/* ================= 2. 카피바라 (Capybara) ================= */}
        {petId === 'capybara' && (
          <View style={styles.capybaraContainer}>
            {/* 느긋한 통통한 유선형 몸통 */}
            <View style={styles.capybaraBody}>
              <View style={styles.capybaraBelly} />
            </View>

            {/* 짤막한 둥근 4개 발 */}
            <View style={[styles.capyFoot, { left: 4 }]} />
            <View style={[styles.capyFoot, { left: 12 }]} />
            <View style={[styles.capyFoot, { right: 12 }]} />
            <View style={[styles.capyFoot, { right: 4 }]} />

            {/* 머리 위에 얹은 깜찍한 유자/귤 🍊 */}
            <View style={styles.tangerine}>
              <View style={styles.tangerineLeaf} />
            </View>

            {/* 뭉툭하고 평화로운 머리 */}
            <View style={styles.capybaraHead}>
              {/* 작은 둥근 귀 */}
              <View style={[styles.capyEar, styles.capyEarLeft]} />
              <View style={[styles.capyEar, styles.capyEarRight]} />

              {/* 느긋하고 평화로운 실눈 */}
              <View style={styles.capyEyeLeft} />
              <View style={styles.capyEyeRight} />

              {/* 뭉툭한 네모/둥근 코 & 입 */}
              <View style={styles.capyNose} />
              <View style={styles.capyMouth} />

              {/* 볼터치 */}
              <View style={styles.cheekLeft} />
              <View style={styles.cheekRight} />
            </View>
          </View>
        )}

        {/* ================= 3. 판다 (Panda) ================= */}
        {petId === 'panda' && (
          <View style={styles.pandaContainer}>
            {/* 동그란 작은 판다 꼬리 */}
            <View style={styles.pandaTail} />

            {/* 똥똥한 흰색 몸통 & 검은색 가슴 Vest 털 */}
            <View style={styles.pandaBody}>
              <View style={styles.pandaVest} />
            </View>

            {/* 검은색 동글동글 앞발 */}
            <View style={[styles.pandaArm, styles.pandaArmLeft]} />
            <View style={[styles.pandaArm, styles.pandaArmRight]} />

            {/* 검은색 앙증맞은 뒷발 */}
            <View style={[styles.pandaLeg, styles.pandaLegLeft]} />
            <View style={[styles.pandaLeg, styles.pandaLegRight]} />

            {/* 머리 */}
            <View style={styles.pandaHead}>
              {/* 검은색 둥근 귀 */}
              <View style={[styles.pandaEar, styles.pandaEarLeft]} />
              <View style={[styles.pandaEar, styles.pandaEarRight]} />

              {/* 판다 다크서클 안대 패치 */}
              <View style={styles.pandaEyePatchLeft} />
              <View style={styles.pandaEyePatchRight} />

              {/* 눈동자 & 하이라이트 */}
              <View style={styles.pandaEyeLeft}>
                <View style={styles.sparkle} />
              </View>
              <View style={styles.pandaEyeRight}>
                <View style={styles.sparkle} />
              </View>

              {/* 코 & 앙증맞은 입 */}
              <View style={styles.pandaNose} />
              <View style={styles.pandaMouth} />

              {/* 입에 든 대나무 잎사귀 🎋 */}
              <View style={styles.bambooLeaf}>
                <Ionicons name="leaf" size={10} color="#4CAF50" />
              </View>

              {/* 발그레 볼터치 */}
              <View style={styles.cheekLeft} />
              <View style={styles.cheekRight} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  petWrapper: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // 공통 볼터치
  cheekLeft: {
    position: 'absolute',
    left: 4,
    bottom: 6,
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FF8A8A',
    opacity: 0.75,
  },
  cheekRight: {
    position: 'absolute',
    right: 4,
    bottom: 6,
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FF8A8A',
    opacity: 0.75,
  },

  // ================= 1. 미어캣 디자인 (Authentic Meerkat Styles) =================
  meerkatContainer: {
    width: 34,
    height: 46,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  meerkatTailBase: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    width: 17,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#AD7747',
    borderWidth: 1,
    borderColor: '#4A2A14',
    transform: [{ rotate: '-32deg' }],
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  meerkatTailTip: {
    width: 6,
    height: '100%',
    borderTopRightRadius: 2.5,
    borderBottomRightRadius: 2.5,
    backgroundColor: '#1C1008',
  },
  meerkatBody: {
    width: 20,
    height: 26,
    borderRadius: 10,
    backgroundColor: '#C8945A',
    borderWidth: 1.5,
    borderColor: '#4A2B14',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
    overflow: 'hidden',
  },
  meerkatBackStripe1: {
    position: 'absolute',
    top: 5,
    right: 1,
    width: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#5E3A1D',
    opacity: 0.8,
  },
  meerkatBackStripe2: {
    position: 'absolute',
    top: 9,
    right: 1,
    width: 11,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#5E3A1D',
    opacity: 0.8,
  },
  meerkatBackStripe3: {
    position: 'absolute',
    top: 13,
    right: 1,
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#5E3A1D',
    opacity: 0.8,
  },
  meerkatBelly: {
    width: 13,
    height: 18,
    borderRadius: 6.5,
    backgroundColor: '#F7E5C8',
    marginTop: 6,
  },
  meerkatScarf: {
    position: 'absolute',
    top: -1,
    width: 14,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3E7750',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meerkatHandsRow: {
    position: 'absolute',
    top: 19,
    zIndex: 3,
    flexDirection: 'row',
    gap: 2,
  },
  meerkatHand: {
    width: 6,
    height: 9,
    borderRadius: 3,
    backgroundColor: '#6B4021',
    borderWidth: 1,
    borderColor: '#3D2413',
  },
  meerkatFoot: {
    position: 'absolute',
    bottom: 0,
    width: 8,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#6B4021',
    borderWidth: 1,
    borderColor: '#3D2413',
    zIndex: 1,
  },
  meerkatFootLeft: { left: 5 },
  meerkatFootRight: { right: 5 },
  meerkatHead: {
    position: 'absolute',
    top: 0,
    width: 27,
    height: 23,
    borderRadius: 11.5,
    backgroundColor: '#D49D60',
    borderWidth: 1.5,
    borderColor: '#4A2B14',
    alignItems: 'center',
    zIndex: 4,
  },
  meerkatEar: {
    position: 'absolute',
    top: 3,
    width: 5,
    height: 7,
    borderRadius: 2.5,
    backgroundColor: '#2A180C',
  },
  meerkatEarLeft: { left: -2 },
  meerkatEarRight: { right: -2 },
  meerkatEyePatchLeft: {
    position: 'absolute',
    left: 3,
    top: 5,
    width: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3D2314',
    transform: [{ rotate: '-10deg' }],
  },
  meerkatEyePatchRight: {
    position: 'absolute',
    right: 3,
    top: 5,
    width: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3D2314',
    transform: [{ rotate: '10deg' }],
  },
  meerkatEyeLeft: {
    position: 'absolute',
    left: 5,
    top: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meerkatEyeRight: {
    position: 'absolute',
    right: 5,
    top: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meerkatPupilDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#0F0804',
  },
  meerkatWedgeSnout: {
    position: 'absolute',
    bottom: 1,
    width: 12,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFF5E1',
    borderWidth: 1,
    borderColor: '#D4B892',
    alignItems: 'center',
  },
  meerkatTriNose: {
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#1F110A',
    marginTop: 1,
  },
  meerkatMouthLine: {
    width: 3,
    height: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#1F110A',
  },

  // ================= 2. 카피바라 디자인 =================
  capybaraContainer: {
    width: 36,
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  capybaraBody: {
    width: 32,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#9A633A',
    borderWidth: 1.5,
    borderColor: '#4A2A14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    bottom: 3,
  },
  capybaraBelly: {
    width: 22,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#C99463',
  },
  capyFoot: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#684026',
    zIndex: 1,
  },
  tangerine: {
    position: 'absolute',
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF9800',
    borderWidth: 1,
    borderColor: '#E65100',
    zIndex: 6,
    alignItems: 'center',
  },
  tangerineLeaf: {
    position: 'absolute',
    top: -2,
    width: 4,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#4CAF50',
  },
  capybaraHead: {
    position: 'absolute',
    top: 3,
    width: 28,
    height: 22,
    borderRadius: 10,
    backgroundColor: '#A87548',
    borderWidth: 1.5,
    borderColor: '#4A2A14',
    alignItems: 'center',
    zIndex: 4,
  },
  capyEar: {
    position: 'absolute',
    top: -2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#684026',
  },
  capyEarLeft: { left: 2 },
  capyEarRight: { right: 2 },
  capyEyeLeft: {
    position: 'absolute',
    left: 6,
    top: 7,
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2A1408',
  },
  capyEyeRight: {
    position: 'absolute',
    right: 6,
    top: 7,
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2A1408',
  },
  capyNose: {
    position: 'absolute',
    bottom: 4,
    width: 7,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A2A14',
  },
  capyMouth: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#4A2A14',
    borderRadius: 1,
  },

  // ================= 3. 판다 디자인 =================
  pandaContainer: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pandaTail: {
    position: 'absolute',
    right: 4,
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#212B27',
  },
  pandaBody: {
    width: 26,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFDF4',
    borderWidth: 1.5,
    borderColor: '#1D2522',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 2,
    bottom: 2,
  },
  pandaVest: {
    width: '100%',
    height: 10,
    backgroundColor: '#303936',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  pandaArm: {
    position: 'absolute',
    top: 18,
    width: 7,
    height: 15,
    borderRadius: 3.5,
    backgroundColor: '#303936',
    zIndex: 3,
  },
  pandaArmLeft: { left: 2, transform: [{ rotate: '15deg' }] },
  pandaArmRight: { right: 2, transform: [{ rotate: '-15deg' }] },
  pandaLeg: {
    position: 'absolute',
    bottom: 0,
    width: 9,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#303936',
    zIndex: 1,
  },
  pandaLegLeft: { left: 5 },
  pandaLegRight: { right: 5 },
  pandaHead: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFDF4',
    borderWidth: 1.5,
    borderColor: '#1D2522',
    alignItems: 'center',
    zIndex: 4,
  },
  pandaEar: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#303936',
  },
  pandaEarLeft: { left: 1 },
  pandaEarRight: { right: 1 },
  pandaEyePatchLeft: {
    position: 'absolute',
    left: 4,
    top: 7,
    width: 8,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#303936',
    transform: [{ rotate: '-12deg' }],
  },
  pandaEyePatchRight: {
    position: 'absolute',
    right: 4,
    top: 7,
    width: 8,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#303936',
    transform: [{ rotate: '12deg' }],
  },
  pandaEyeLeft: {
    position: 'absolute',
    left: 6,
    top: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pandaEyeRight: {
    position: 'absolute',
    right: 6,
    top: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#000',
  },
  pandaNose: {
    position: 'absolute',
    bottom: 5,
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#212B27',
  },
  pandaMouth: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#212B27',
    borderRadius: 1,
  },
  bambooLeaf: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    transform: [{ rotate: '25deg' }],
  },
});
