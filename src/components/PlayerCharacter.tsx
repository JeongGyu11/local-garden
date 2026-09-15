import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AvatarId } from '../types';
import { getAvatarDefinition } from '../data/avatarData';

interface PlayerCharacterProps {
  avatarId: AvatarId;
  size?: number;
  direction?: 'down' | 'up' | 'left' | 'right';
  isWalking?: boolean;
}

/**
 * 6종류 캐릭터별 전용 커스텀 디자인 (얼굴, 헤어스타일, 모자, 패션)
 */
export const PlayerCharacter: React.FC<PlayerCharacterProps> = ({
  avatarId,
  size = 56,
  direction = 'down',
  isWalking = false,
}) => {
  const avatar = getAvatarDefinition(avatarId);
  const isFemale = avatar.gender === 'female';
  const style = avatar.travelStyle;
  const unit = size / 56;

  // 6개 캐릭터별 테마 색상 및 디자인 속성
  const styleConfig = {
    male_nature: {
      skin: '#FFE5D4',
      hair: '#6A4A3C',
      hatCrown: '#EED9A1',
      hatBrim: '#D6C084',
      hatBand: '#4F7D4A',
      shirt: '#F4E8C1',
      overall: '#3E7750',
      pants: '#2C5438',
      shoes: '#6B4226',
      eyeColor: '#2B1A0E',
      icon: 'leaf' as const,
      badgeColor: '#FFF7D6',
    },
    male_culture: {
      skin: '#FFEAE0',
      hair: '#383838',
      hatCrown: '#8C5228',
      hatBrim: '#6B3E1D',
      hatBand: '#3A2010',
      shirt: '#FAF0DB',
      overall: '#A86632',
      pants: '#4E2F17',
      shoes: '#3D2411',
      eyeColor: '#1F1B18',
      icon: 'book' as const,
      badgeColor: '#FFEBC6',
    },
    male_activity: {
      skin: '#FFDFCB',
      hair: '#C25A2B',
      hatCrown: '#2D6288',
      hatBrim: '#1D4563',
      hatBand: '#F2A93B',
      shirt: '#E0F0F7',
      overall: '#39739D',
      pants: '#1A3F59',
      shoes: '#122D40',
      eyeColor: '#1A2A38',
      icon: 'compass' as const,
      badgeColor: '#D8F1FE',
    },
    female_nature: {
      skin: '#FFF0E5',
      hair: '#8D5B3A',
      hatCrown: '#FFF2C6',
      hatBrim: '#FCE798',
      hatBand: '#E57373',
      shirt: '#FFF9EB',
      overall: '#589A6C',
      pants: '#386948',
      shoes: '#A06742',
      eyeColor: '#362316',
      icon: 'flower' as const,
      badgeColor: '#FFE5EC',
    },
    female_culture: {
      skin: '#FFF3EB',
      hair: '#2C221E',
      hatCrown: '#7B241C',
      hatBrim: '#641E16',
      hatBand: '#D4AC0D',
      shirt: '#FDFEFE',
      overall: '#922B21',
      pants: '#511B15',
      shoes: '#2C3E50',
      eyeColor: '#211717',
      icon: 'bookmark' as const,
      badgeColor: '#FCF3CF',
    },
    female_activity: {
      skin: '#FFE9DC',
      hair: '#1B2631',
      hatCrown: '#16A085',
      hatBrim: '#117864',
      hatBand: '#F39C12',
      shirt: '#E8F8F5',
      overall: '#2980B9',
      pants: '#1B4F72',
      shoes: '#154360',
      eyeColor: '#1B2631',
      icon: 'sparkles' as const,
      badgeColor: '#EAFAF1',
    },
  }[avatarId] || {
    skin: '#FFE5D4',
    hair: '#6A4A3C',
    hatCrown: '#EED9A1',
    hatBrim: '#D6C084',
    hatBand: '#4F7D4A',
    shirt: '#F4E8C1',
    overall: '#3E7750',
    pants: '#2C5438',
    shoes: '#6B4226',
    eyeColor: '#2B1A0E',
    icon: 'leaf' as const,
    badgeColor: '#FFF7D6',
  };

  return (
    <View style={{ width: size, height: size * 1.25, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* 바닥 그림자 */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        width: 34 * unit,
        height: 10 * unit,
        borderRadius: 5 * unit,
        backgroundColor: 'rgba(0,0,0,0.18)',
      }} />

      {/* 전체 캐릭터 래퍼 (방향 회전) */}
      <View style={[
        styles.characterContainer,
        { transform: [{ scale: unit }] },
        direction === 'left' && { transform: [{ scale: unit }, { scaleX: -1 }] },
        isWalking && styles.walkingAnimation,
      ]}>
        {/* 모자 / 헤어 / 헤드웨어 피스 */}

        {/* 1. female_nature: 플로피 리본 썬햇 & 땋은 양갈래 */}
        {avatarId === 'female_nature' && (
          <>
            <View style={[styles.longHairBack, { backgroundColor: styleConfig.hair, width: 44, height: 32, top: 12, borderRadius: 16 }]} />
            <View style={[styles.braidLeft, { backgroundColor: styleConfig.hair }]} />
            <View style={[styles.braidRight, { backgroundColor: styleConfig.hair }]} />
          </>
        )}

        {/* 2. female_culture: 체크 아티스트 베레모 & 클래식 보브 단발 */}
        {avatarId === 'female_culture' && (
          <View style={[styles.bobHairBack, { backgroundColor: styleConfig.hair }]} />
        )}

        {/* 3. female_activity: 야구 캡 & 높은 포니테일 */}
        {avatarId === 'female_activity' && (
          <View style={[styles.ponytail, { backgroundColor: styleConfig.hair }]} />
        )}

        {/* 머리 본체 */}
        <View style={[styles.head, { backgroundColor: styleConfig.skin }]}>
          {/* 헤어 앞머리 - 캐릭터별 차별화 */}
          {avatarId === 'male_nature' && (
            <View style={styles.bangsMaleNature}>
              <View style={[styles.hairStrand, { backgroundColor: styleConfig.hair, width: 14, height: 12, borderRadius: 6, left: 2 }]} />
              <View style={[styles.hairStrand, { backgroundColor: styleConfig.hair, width: 16, height: 14, borderRadius: 7, left: 12 }]} />
              <View style={[styles.hairStrand, { backgroundColor: styleConfig.hair, width: 13, height: 11, borderRadius: 5, left: 24 }]} />
            </View>
          )}

          {avatarId === 'male_culture' && (
            <View style={styles.bangsMaleCulture}>
              <View style={[styles.hairStrand, { backgroundColor: styleConfig.hair, width: 18, height: 14, borderRadius: 5, left: 1 }]} />
              <View style={[styles.hairStrand, { backgroundColor: styleConfig.hair, width: 18, height: 12, borderRadius: 5, right: 1 }]} />
            </View>
          )}

          {avatarId === 'male_activity' && (
            <View style={styles.bangsMaleActivity}>
              <View style={[styles.hairSpike, { backgroundColor: styleConfig.hair, left: 2 }]} />
              <View style={[styles.hairSpike, { backgroundColor: styleConfig.hair, left: 12, height: 15 }]} />
              <View style={[styles.hairSpike, { backgroundColor: styleConfig.hair, left: 22 }]} />
            </View>
          )}

          {avatarId === 'female_nature' && (
            <View style={styles.bangsFemaleNature}>
              <View style={[styles.hairCurve, { backgroundColor: styleConfig.hair, left: 2 }]} />
              <View style={[styles.hairCurve, { backgroundColor: styleConfig.hair, right: 2 }]} />
            </View>
          )}

          {avatarId === 'female_culture' && (
            <View style={styles.bangsFemaleCulture}>
              <View style={[styles.straightBangs, { backgroundColor: styleConfig.hair }]} />
              <View style={[styles.pearlPin]} />
            </View>
          )}

          {avatarId === 'female_activity' && (
            <View style={styles.bangsFemaleActivity}>
              <View style={[styles.sideBangsLeft, { backgroundColor: styleConfig.hair }]} />
              <View style={[styles.sideBangsRight, { backgroundColor: styleConfig.hair }]} />
            </View>
          )}

          {/* 얼굴 표정 (방향이 뒷모습이 아닐 때) */}
          {direction !== 'up' && (
            <>
              {/* 캐릭터별 동공 및 안경/특징 */}
              {avatarId === 'male_culture' ? (
                /* 이야기 수집가 안경 */
                <View style={styles.glassesRow}>
                  <View style={[styles.glassFrame, { borderColor: '#5C3A21' }]}>
                    <View style={[styles.pupil, { backgroundColor: styleConfig.eyeColor }]} />
                  </View>
                  <View style={styles.glassBridge} />
                  <View style={[styles.glassFrame, { borderColor: '#5C3A21' }]}>
                    <View style={[styles.pupil, { backgroundColor: styleConfig.eyeColor }]} />
                  </View>
                </View>
              ) : avatarId === 'female_nature' ? (
                /* 맑고 반짝이는 눈 */
                <View style={styles.eyesRow}>
                  <View style={[styles.eyeSparkle, { backgroundColor: styleConfig.eyeColor }]}>
                    <View style={styles.sparkleDot} />
                  </View>
                  <View style={[styles.eyeSparkle, { backgroundColor: styleConfig.eyeColor }]}>
                    <View style={styles.sparkleDot} />
                  </View>
                </View>
              ) : (
                /* 기본 눈매 */
                <View style={styles.eyesRow}>
                  <View style={[styles.pupil, { backgroundColor: styleConfig.eyeColor }]} />
                  <View style={[styles.pupil, { backgroundColor: styleConfig.eyeColor }]} />
                </View>
              )}

              {/* 볼터치 */}
              <View style={styles.cheeksRow}>
                <View style={styles.cheekPink} />
                <View style={styles.cheekPink} />
              </View>

              {/* 입 모양 */}
              {avatarId === 'male_activity' || avatarId === 'female_activity' ? (
                <View style={styles.smileBig} />
              ) : (
                <View style={styles.smileGentle} />
              )}
            </>
          )}
        </View>

        {/* 모자 (Hat / Headwear) */}
        {avatarId === 'male_nature' && (
          <View style={styles.hatNatureMale}>
            <View style={[styles.hatCrownBox, { backgroundColor: styleConfig.hatCrown }]}>
              <View style={[styles.hatBandLine, { backgroundColor: styleConfig.hatBand }]} />
              <Ionicons name="leaf" size={9} color="#94D873" style={{ position: 'absolute', right: -2, top: 4 }} />
            </View>
            <View style={[styles.hatBrimLine, { backgroundColor: styleConfig.hatBrim }]} />
          </View>
        )}

        {avatarId === 'male_culture' && (
          <View style={styles.hatCultureMale}>
            <View style={[styles.newsboyCap, { backgroundColor: styleConfig.hatCrown }]}>
              <View style={styles.capButton} />
            </View>
            <View style={[styles.capVisor, { backgroundColor: styleConfig.hatBrim }]} />
          </View>
        )}

        {avatarId === 'male_activity' && (
          <View style={styles.hatActivityMale}>
            <View style={[styles.safariCap, { backgroundColor: styleConfig.hatCrown }]}>
              <View style={[styles.gogglesBand]}>
                <View style={styles.goggleLens} />
                <View style={styles.goggleLens} />
              </View>
            </View>
            <View style={[styles.safariBrim, { backgroundColor: styleConfig.hatBrim }]} />
          </View>
        )}

        {avatarId === 'female_nature' && (
          <View style={styles.hatNatureFemale}>
            <View style={[styles.floppyCrown, { backgroundColor: styleConfig.hatCrown }]}>
              <View style={[styles.ribbonBand, { backgroundColor: styleConfig.hatBand }]} />
            </View>
            <View style={[styles.floppyBrim, { backgroundColor: styleConfig.hatBrim }]} />
            <Ionicons name="flower" size={11} color="#FF6B8B" style={{ position: 'absolute', right: 2, top: 2 }} />
          </View>
        )}

        {avatarId === 'female_culture' && (
          <View style={styles.hatCultureFemale}>
            <View style={[styles.beretMain, { backgroundColor: styleConfig.hatCrown }]}>
              <View style={styles.beretStem} />
            </View>
          </View>
        )}

        {avatarId === 'female_activity' && (
          <View style={styles.hatActivityFemale}>
            <View style={[styles.baseballCap, { backgroundColor: styleConfig.hatCrown }]}>
              <View style={[styles.capStripe, { backgroundColor: styleConfig.hatBand }]} />
            </View>
            <View style={[styles.baseballVisor, { backgroundColor: styleConfig.hatBrim }]} />
          </View>
        )}

        {/* 상체 & 의상 (Torso & Outfit) */}
        <View style={styles.torsoContainer}>
          <View style={[styles.arm, styles.armLeft, { backgroundColor: styleConfig.shirt }]} />
          
          <View style={[styles.torso, { backgroundColor: styleConfig.shirt }]}>
            {/* 멜빵 / 바지 / 자켓 피스 */}
            <View style={[styles.overallBib, { backgroundColor: styleConfig.overall }]}>
              <Ionicons name={styleConfig.icon} size={8} color={styleConfig.badgeColor} />
            </View>
          </View>

          <View style={[styles.arm, styles.armRight, { backgroundColor: styleConfig.shirt }]} />
        </View>

        {/* 하체 & 신발 */}
        <View style={styles.legsContainer}>
          <View style={[styles.leg, { backgroundColor: styleConfig.pants }]}>
            <View style={[styles.shoe, { backgroundColor: styleConfig.shoes }]} />
          </View>
          <View style={[styles.leg, { backgroundColor: styleConfig.pants }]}>
            <View style={[styles.shoe, { backgroundColor: styleConfig.shoes }]} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  characterContainer: {
    width: 38,
    height: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  walkingAnimation: {
    transform: [{ translateY: -2 }],
  },
  head: {
    width: 34,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#4A3728',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    overflow: 'hidden',
  },
  // 헤어 스타일 피스들
  longHairBack: {
    position: 'absolute',
    zIndex: 1,
  },
  braidLeft: {
    position: 'absolute',
    width: 7,
    height: 22,
    borderRadius: 3.5,
    left: 0,
    top: 18,
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#4A3728',
  },
  braidRight: {
    position: 'absolute',
    width: 7,
    height: 22,
    borderRadius: 3.5,
    right: 0,
    top: 18,
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#4A3728',
  },
  bobHairBack: {
    position: 'absolute',
    width: 38,
    height: 28,
    borderRadius: 12,
    top: 6,
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#221915',
  },
  ponytail: {
    position: 'absolute',
    width: 10,
    height: 24,
    borderRadius: 5,
    right: -2,
    top: 2,
    zIndex: 2,
    transform: [{ rotate: '25deg' }],
    borderWidth: 1,
    borderColor: '#11171E',
  },
  // 앞머리 피스들
  bangsMaleNature: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  bangsMaleCulture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bangsMaleActivity: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 14,
  },
  hairSpike: {
    position: 'absolute',
    width: 8,
    height: 12,
    borderRadius: 4,
    top: 0,
  },
  bangsFemaleNature: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  hairCurve: {
    position: 'absolute',
    width: 14,
    height: 10,
    borderRadius: 5,
    top: 0,
  },
  bangsFemaleCulture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 9,
  },
  straightBangs: {
    width: '100%',
    height: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  pearlPin: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFF9E6',
    right: 4,
    top: 2,
  },
  bangsFemaleActivity: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  sideBangsLeft: {
    position: 'absolute',
    width: 6,
    height: 14,
    left: 2,
    top: 0,
    borderRadius: 3,
  },
  sideBangsRight: {
    position: 'absolute',
    width: 6,
    height: 14,
    right: 2,
    top: 0,
    borderRadius: 3,
  },
  hairStrand: {
    position: 'absolute',
    top: 0,
  },
  // 이목구비
  eyesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  pupil: {
    width: 4,
    height: 5,
    borderRadius: 2,
  },
  eyeSparkle: {
    width: 5,
    height: 6,
    borderRadius: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleDot: {
    width: 1.5,
    height: 1.5,
    borderRadius: 0.8,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 1,
    left: 1,
  },
  glassesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  glassFrame: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  glassBridge: {
    width: 3,
    height: 1.5,
    backgroundColor: '#5C3A21',
  },
  cheeksRow: {
    flexDirection: 'row',
    gap: 16,
    position: 'absolute',
    top: 16,
  },
  cheekPink: {
    width: 4,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FF8A8A',
    opacity: 0.6,
  },
  smileGentle: {
    width: 6,
    height: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#4A3728',
    borderRadius: 3,
    marginTop: 2,
  },
  smileBig: {
    width: 7,
    height: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#4A3728',
    borderRadius: 3.5,
    marginTop: 1,
  },
  // 모자 스타일 피스들
  hatNatureMale: {
    position: 'absolute',
    top: -6,
    zIndex: 5,
    alignItems: 'center',
  },
  hatCrownBox: {
    width: 22,
    height: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: '#7A6434',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  hatBandLine: {
    width: '100%',
    height: 3,
  },
  hatBrimLine: {
    width: 38,
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#7A6434',
  },
  hatCultureMale: {
    position: 'absolute',
    top: -5,
    zIndex: 5,
    alignItems: 'center',
  },
  newsboyCap: {
    width: 30,
    height: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#42240E',
    alignItems: 'center',
  },
  capButton: {
    width: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F2A93B',
    top: -1,
  },
  capVisor: {
    width: 24,
    height: 4,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    marginTop: -2,
  },
  hatActivityMale: {
    position: 'absolute',
    top: -7,
    zIndex: 5,
    alignItems: 'center',
  },
  safariCap: {
    width: 24,
    height: 11,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1,
    borderColor: '#122D40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gogglesBand: {
    width: 22,
    height: 4,
    backgroundColor: '#222',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  goggleLens: {
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#73C6B6',
    borderWidth: 0.5,
    borderColor: '#FFF',
  },
  safariBrim: {
    width: 36,
    height: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#122D40',
  },
  hatNatureFemale: {
    position: 'absolute',
    top: -6,
    zIndex: 5,
    alignItems: 'center',
  },
  floppyCrown: {
    width: 22,
    height: 10,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: '#A08030',
    justifyContent: 'flex-end',
  },
  ribbonBand: {
    width: '100%',
    height: 3,
  },
  floppyBrim: {
    width: 40,
    height: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#A08030',
  },
  hatCultureFemale: {
    position: 'absolute',
    top: -5,
    left: 2,
    zIndex: 5,
  },
  beretMain: {
    width: 32,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A148C',
    alignItems: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  beretStem: {
    width: 2,
    height: 3,
    backgroundColor: '#D4AC0D',
    top: -2,
  },
  hatActivityFemale: {
    position: 'absolute',
    top: -6,
    zIndex: 5,
    alignItems: 'center',
  },
  baseballCap: {
    width: 26,
    height: 11,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 1,
    borderColor: '#0E6251',
    alignItems: 'center',
  },
  capStripe: {
    width: 3,
    height: '100%',
  },
  baseballVisor: {
    width: 26,
    height: 4,
    borderBottomRightRadius: 4,
    marginLeft: 6,
    marginTop: -2,
  },
  // 의상
  torsoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
    marginTop: -4,
  },
  arm: {
    width: 5,
    height: 15,
    borderRadius: 2.5,
    borderWidth: 1,
    borderColor: '#333',
  },
  armLeft: {
    marginRight: -1,
  },
  armRight: {
    marginLeft: -1,
  },
  torso: {
    width: 18,
    height: 17,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overallBib: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legsContainer: {
    flexDirection: 'row',
    gap: 3,
    zIndex: 1,
    marginTop: -2,
  },
  leg: {
    width: 6,
    height: 9,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    justifyContent: 'flex-end',
  },
  shoe: {
    width: 6,
    height: 3.5,
    borderRadius: 1.5,
  },
});
