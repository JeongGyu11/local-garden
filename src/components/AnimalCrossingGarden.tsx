import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Plant, Seed } from '../types';

interface AnimalCrossingGardenProps {
  plants: Plant[];
  seeds: Seed[];
  onWater: (plantId: string) => void;
  onSun: (plantId: string) => void;
  onHarvest: (plant: Plant) => void;
  onPlantSeed: (seed: Seed, plotIndex: number) => void;
  onGoExplore: () => void;
}

interface Plot {
  id: number;
  x: number;
  y: number;
  label: string;
}

// 4개의 밭 좌표 (가든 맵 상의 위치)
const PLOTS: Plot[] = [
  { id: 0, x: 50, y: 70, label: '1번 밭 (제주 구역)' },
  { id: 1, x: 200, y: 70, label: '2번 밭 (전남 구역)' },
  { id: 2, x: 50, y: 190, label: '3번 밭 (경북 구역)' },
  { id: 3, x: 200, y: 190, label: '4번 밭 (강원 구역)' },
];

// NPC 및 특수 오브젝트 좌표
const WELL_OBJ = { x: 260, y: 20, name: '💧 맑은 우물', action: 'water_refill' };
const NPC_OBJ = { x: 40, y: 20, name: '🦊 로컬 촌장님', action: 'npc_talk' };

export const AnimalCrossingGarden: React.FC<AnimalCrossingGardenProps> = ({
  plants,
  seeds,
  onWater,
  onSun,
  onHarvest,
  onPlantSeed,
  onGoExplore,
}) => {
  // 캐릭터 좌표 & 방향
  const [charPos, setCharPos] = useState<{ x: number; y: number }>({ x: 130, y: 140 });
  const [direction, setDirection] = useState<'down' | 'up' | 'left' | 'right'>('down');
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [floatingEffect, setFloatingEffect] = useState<{ text: string; x: number; y: number } | null>(null);

  // 캐릭터 이동 범위 경계 (맵 크기: 330 x 300)
  const MAP_BOUNDS = { minX: 15, maxX: 275, minY: 15, maxY: 250 };

  const moveCharacter = (dx: number, dy: number, dir: 'down' | 'up' | 'left' | 'right') => {
    setDirection(dir);
    setIsWalking(true);
    setTimeout(() => setIsWalking(false), 150);

    setCharPos((prev) => ({
      x: Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, prev.x + dx)),
      y: Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, prev.y + dy)),
    }));
  };

  // PC 크롬 브라우저 키보드(방향키 & WASD) 조작 지원
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        const step = 20;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          moveCharacter(0, -step, 'up');
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          moveCharacter(0, step, 'down');
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          moveCharacter(-step, 0, 'left');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          moveCharacter(step, 0, 'right');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  // 이펙트 띄우기 헬퍼
  const triggerEffect = (text: string, x: number, y: number) => {
    setFloatingEffect({ text, x, y });
    setTimeout(() => setFloatingEffect(null), 1200);
  };

  // 캐릭터와 가장 가까운 밭 찾기 (거리 판정: 55px 이내)
  const nearbyPlotIndex = PLOTS.findIndex(
    (p) => Math.hypot(p.x - charPos.x, p.y - charPos.y) < 55
  );
  const nearbyPlot = nearbyPlotIndex !== -1 ? PLOTS[nearbyPlotIndex] : null;
  const currentPlantInPlot = nearbyPlotIndex !== -1 ? plants[nearbyPlotIndex] : null;

  // 우물 및 촌장님과의 거리 판정
  const isNearWell = Math.hypot(WELL_OBJ.x - charPos.x, WELL_OBJ.y - charPos.y) < 50;
  const isNearNPC = Math.hypot(NPC_OBJ.x - charPos.x, NPC_OBJ.y - charPos.y) < 50;

  // 상호작용 핸들러
  const handleActionWater = () => {
    if (currentPlantInPlot) {
      onWater(currentPlantInPlot.id);
      triggerEffect('💦 솨아아~ (+25%)', charPos.x - 20, charPos.y - 30);
    }
  };

  const handleActionSun = () => {
    if (currentPlantInPlot) {
      onSun(currentPlantInPlot.id);
      triggerEffect('☀️ 따스한 햇살! (+25%)', charPos.x - 20, charPos.y - 30);
    }
  };

  const handleActionHarvest = () => {
    if (currentPlantInPlot) {
      triggerEffect('🎉 수확 대성공!', charPos.x - 20, charPos.y - 30);
      onHarvest(currentPlantInPlot);
    }
  };

  const handleActionPlant = () => {
    if (seeds.length === 0) {
      Alert.alert(
        '🌱 씨앗 부족',
        '보유 중인 씨앗이 없습니다. [로컬 탐험] 탭에서 관광지를 방문해 씨앗을 얻어오세요!'
      );
      return;
    }
    const seedToPlant = seeds[0];
    onPlantSeed(seedToPlant, nearbyPlotIndex);
    triggerEffect(`🌱 ${seedToPlant.name} 심기 완료!`, charPos.x - 20, charPos.y - 30);
  };

  const handleTalkNPC = () => {
    Alert.alert(
      '🦊 로컬 촌장님',
      '“어서 오게나! 우리 마을 밭에 전국 각지의 특산물 씨앗을 심어보게. [로컬 탐험]에서 관광지 체크인을 하면 성장 2배 부스터도 준다네!”'
    );
  };

  const handleWellRefill = () => {
    triggerEffect('💧 시원한 물통 가득 채움!', charPos.x - 20, charPos.y - 30);
  };

  // 화면 터치 이동 (Tap-to-Move) 핸들러 - 모바일에서 터치한 지점으로 캐릭터 이동
  const handleMapTouch = (touchX: number, touchY: number) => {
    const targetX = Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, touchX - 20));
    const targetY = Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, touchY - 20));

    const dx = targetX - charPos.x;
    const dy = targetY - charPos.y;
    const dir =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
        ? 'down'
        : 'up';

    setDirection(dir);
    setIsWalking(true);
    setTimeout(() => setIsWalking(false), 250);
    setCharPos({ x: targetX, y: targetY });
  };

  return (
    <View style={styles.container}>
      {/* 2.5D 탑다운 게임 맵 캔버스 */}
      <View style={styles.gameMapContainer}>
        {/* 맵 헤더 뱃지 */}
        <View style={styles.mapHudTop}>
          <View style={styles.villageTag}>
            <Text style={styles.villageTagText}>🏡 로컬 팜 빌리지</Text>
          </View>
          <Text style={styles.keyGuide}>
            {Platform.OS === 'web' ? '⌨️ 방향키/WASD 또는 클릭' : '👆 맵 터치 또는 🕹️ 십자키로 이동'}
          </Text>
        </View>

        {/* 맵 지형 (잔디 & 돌길) - 화면 터치로 이동 가능 */}
        <TouchableOpacity
          activeOpacity={0.96}
          style={styles.mapCanvas}
          onPress={(e) => handleMapTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        >
          {/* NPC 촌장님 */}
          <TouchableOpacity
            style={[styles.npcEntity, { left: NPC_OBJ.x, top: NPC_OBJ.y }]}
            onPress={handleTalkNPC}
          >
            <Text style={styles.npcEmoji}>🦊</Text>
            <View style={styles.nameTag}>
              <Text style={styles.nameTagText}>촌장님</Text>
            </View>
          </TouchableOpacity>

          {/* 맑은 우물 */}
          <TouchableOpacity
            style={[styles.wellEntity, { left: WELL_OBJ.x, top: WELL_OBJ.y }]}
            onPress={handleWellRefill}
          >
            <Text style={styles.wellEmoji}>⛲</Text>
            <View style={styles.nameTag}>
              <Text style={styles.nameTagText}>우물</Text>
            </View>
          </TouchableOpacity>

          {/* 4개의 밭 오브젝트 */}
          {PLOTS.map((plot, idx) => {
            const crop = plants[idx];
            const isHarvestReady = crop && crop.growthStage >= 4;
            const isTargeted = nearbyPlotIndex === idx;

            return (
              <View
                key={plot.id}
                style={[
                  styles.plotBox,
                  { left: plot.x, top: plot.y },
                  isTargeted && styles.plotBoxTargeted,
                ]}
              >
                <View style={styles.dirtPatch}>
                  {crop ? (
                    <View style={styles.cropDisplay}>
                      <Text style={[styles.cropEmoji, isHarvestReady && styles.cropReadyPulse]}>
                        {crop.growthStage === 0
                          ? '🌱'
                          : crop.growthStage === 1
                          ? '🌿'
                          : crop.growthStage === 2
                          ? '🌸'
                          : crop.emoji}
                      </Text>
                      <Text style={styles.cropPlotName} numberOfLines={1}>
                        {crop.name}
                      </Text>
                      {/* 수분/햇빛 미니 게이지 */}
                      <View style={styles.miniGaugeRow}>
                        <View
                          style={[
                            styles.miniGaugeBar,
                            { width: `${crop.waterProgress}%`, backgroundColor: '#3B82F6' },
                          ]}
                        />
                        <View
                          style={[
                            styles.miniGaugeBar,
                            { width: `${crop.sunProgress}%`, backgroundColor: '#F59E0B' },
                          ]}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyPlotContainer}>
                      <Text style={styles.emptyPlotSign}>🟫</Text>
                      <Text style={styles.emptyPlotText}>빈 밭</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.plotLabel}>{idx + 1}번 밭</Text>
              </View>
            );
          })}

          {/* 플레이어 캐릭터 (동물의 숲 정원사) */}
          <View
            style={[
              styles.characterSprite,
              { left: charPos.x, top: charPos.y },
              isWalking && styles.characterWalkingBob,
            ]}
          >
            {/* 캐릭터 상단 말풍선 안내 (가까운 오브젝트가 있을 때) */}
            {nearbyPlot && (
              <View style={styles.speechBubble}>
                <Text style={styles.speechBubbleText}>
                  {currentPlantInPlot
                    ? currentPlantInPlot.growthStage >= 4
                      ? '✨ 수확 가능!'
                      : '💧 물주기 필요!'
                    : '🌱 씨앗 심기'}
                </Text>
              </View>
            )}

            {isNearNPC && (
              <View style={styles.speechBubble}>
                <Text style={styles.speechBubbleText}>💬 촌장님과 대화</Text>
              </View>
            )}

            {isNearWell && (
              <View style={styles.speechBubble}>
                <Text style={styles.speechBubbleText}>💧 우물에서 물뜨기</Text>
              </View>
            )}

            {/* 정원사 아바타 */}
            <View style={styles.avatarBody}>
              <Text style={styles.characterEmoji}>
                {direction === 'left' ? '🧑‍🌾' : direction === 'right' ? '🧑‍🌾' : '🧑‍🌾'}
              </Text>
              <View style={styles.playerShadow} />
            </View>
          </View>

          {/* 플로팅 이펙트 애니메이션 */}
          {floatingEffect && (
            <View style={[styles.floatingTag, { left: floatingEffect.x, top: floatingEffect.y }]}>
              <Text style={styles.floatingTagText}>{floatingEffect.text}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 동물의 숲 스타일 상호작용 액션바 & 컨트롤 패드 */}
      <View style={styles.interactionSection}>
        {/* 현재 위치에 따른 액션 버튼 프롬프트 */}
        <View style={styles.actionPromptCard}>
          {nearbyPlot ? (
            currentPlantInPlot ? (
              <View style={styles.actionRowGrid}>
                <View style={styles.targetInfo}>
                  <Text style={styles.targetTitle}>📍 {currentPlantInPlot.name}</Text>
                  <Text style={styles.targetStatus}>
                    수분: {currentPlantInPlot.waterProgress}% · 일조량: {currentPlantInPlot.sunProgress}%
                  </Text>
                </View>

                {currentPlantInPlot.growthStage >= 4 ? (
                  <TouchableOpacity style={styles.btnHarvestAction} onPress={handleActionHarvest}>
                    <MaterialCommunityIcons name="hand-peace" size={18} color="#FFFFFF" />
                    <Text style={styles.btnActionText}>수확하기 (보상 획득!)</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionButtonPair}>
                    <TouchableOpacity style={styles.btnWaterAction} onPress={handleActionWater}>
                      <Ionicons name="water" size={16} color="#FFFFFF" />
                      <Text style={styles.btnActionText}>물주기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSunAction} onPress={handleActionSun}>
                      <Ionicons name="sunny" size={16} color="#FFFFFF" />
                      <Text style={styles.btnActionText}>햇빛쬐기</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.actionRowGrid}>
                <View style={styles.targetInfo}>
                  <Text style={styles.targetTitle}>📍 비어있는 {nearbyPlot.label}</Text>
                  <Text style={styles.targetStatus}>
                    보유 씨앗: {seeds.length > 0 ? seeds[0].name : '없음 (탐험 필요)'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.btnPlantAction} onPress={handleActionPlant}>
                  <Ionicons name="leaf" size={16} color="#FFFFFF" />
                  <Text style={styles.btnActionText}>씨앗 심기</Text>
                </TouchableOpacity>
              </View>
            )
          ) : isNearNPC ? (
            <View style={styles.actionRowGrid}>
              <Text style={styles.targetTitle}>🦊 촌장님 앞에 도착했습니다</Text>
              <TouchableOpacity style={styles.btnNpcAction} onPress={handleTalkNPC}>
                <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
                <Text style={styles.btnActionText}>대화하기</Text>
              </TouchableOpacity>
            </View>
          ) : isNearWell ? (
            <View style={styles.actionRowGrid}>
              <Text style={styles.targetTitle}>⛲ 맑은 우물 앞에 도착했습니다</Text>
              <TouchableOpacity style={styles.btnWaterAction} onPress={handleWellRefill}>
                <Ionicons name="water" size={16} color="#FFFFFF" />
                <Text style={styles.btnActionText}>물통 채우기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.idlePrompt}>
              <Ionicons name="walk-outline" size={18} color="#64748B" />
              <Text style={styles.idlePromptText}>
                밭이나 우물, 촌장님 가까이로 캐릭터를 이동시켜 보세요!
              </Text>
            </View>
          )}
        </View>

        {/* 모바일 가상 D-PAD 조이스틱 컨트롤러 */}
        <View style={styles.controllerContainer}>
          <View style={styles.dpad}>
            <TouchableOpacity
              style={[styles.dpadBtn, styles.dpadUp]}
              onPress={() => moveCharacter(0, -22, 'up')}
            >
              <Ionicons name="chevron-up" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.dpadMiddleRow}>
              <TouchableOpacity
                style={[styles.dpadBtn, styles.dpadLeft]}
                onPress={() => moveCharacter(-22, 0, 'left')}
              >
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.dpadCenter}>
                <Text style={styles.dpadCenterText}>MOVE</Text>
              </View>
              <TouchableOpacity
                style={[styles.dpadBtn, styles.dpadRight]}
                onPress={() => moveCharacter(22, 0, 'right')}
              >
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.dpadBtn, styles.dpadDown]}
              onPress={() => moveCharacter(0, 22, 'down')}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* 우측 퀵 액션 버튼 (탐험 바로가기) */}
          <TouchableOpacity style={styles.quickExploreBox} onPress={onGoExplore}>
            <Ionicons name="compass" size={24} color="#2D6A4F" />
            <Text style={styles.quickExploreTitle}>관광지 탐험</Text>
            <Text style={styles.quickExploreSub}>씨앗 찾으러 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  gameMapContainer: {
    backgroundColor: '#95D5B2',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#52B788',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  mapHudTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#74C69D',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  villageTag: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  villageTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  keyGuide: {
    fontSize: 11,
    color: '#1B4332',
    fontWeight: '700',
  },
  mapCanvas: {
    height: 310,
    position: 'relative',
    backgroundColor: '#A7E8BD',
  },
  npcEntity: {
    position: 'absolute',
    alignItems: 'center',
    width: 50,
  },
  npcEmoji: {
    fontSize: 28,
  },
  wellEntity: {
    position: 'absolute',
    alignItems: 'center',
    width: 50,
  },
  wellEmoji: {
    fontSize: 28,
  },
  nameTag: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: -2,
  },
  nameTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  plotBox: {
    position: 'absolute',
    width: 90,
    height: 85,
    alignItems: 'center',
  },
  plotBoxTargeted: {
    transform: [{ scale: 1.05 }],
  },
  dirtPatch: {
    width: 82,
    height: 64,
    backgroundColor: '#8B5A2B',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#6F4E37',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  plotLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B4332',
    marginTop: 2,
  },
  cropDisplay: {
    alignItems: 'center',
  },
  cropEmoji: {
    fontSize: 24,
  },
  cropReadyPulse: {
    transform: [{ scale: 1.2 }],
  },
  cropPlotName: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: -2,
    maxWidth: 70,
  },
  miniGaugeRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  miniGaugeBar: {
    width: 24,
    height: 4,
    borderRadius: 2,
  },
  emptyPlotContainer: {
    alignItems: 'center',
  },
  emptyPlotSign: {
    fontSize: 18,
  },
  emptyPlotText: {
    fontSize: 9,
    color: '#ECC8AF',
    fontWeight: '700',
  },
  characterSprite: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  characterWalkingBob: {
    transform: [{ translateY: -3 }],
  },
  avatarBody: {
    alignItems: 'center',
  },
  characterEmoji: {
    fontSize: 30,
  },
  playerShadow: {
    width: 20,
    height: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: -4,
  },
  speechBubble: {
    position: 'absolute',
    top: -24,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 20,
  },
  speechBubbleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  floatingTag: {
    position: 'absolute',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    zIndex: 30,
  },
  floatingTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  interactionSection: {
    marginTop: 14,
  },
  actionPromptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionRowGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetInfo: {
    flex: 1,
  },
  targetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  targetStatus: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionButtonPair: {
    flexDirection: 'row',
    gap: 6,
  },
  btnWaterAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  btnSunAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  btnHarvestAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  btnPlantAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  btnNpcAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  btnActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  idlePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  idlePromptText: {
    fontSize: 12,
    color: '#64748B',
  },
  controllerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dpad: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dpadBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  dpadUp: {
    marginBottom: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dpadDown: {
    marginTop: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dpadLeft: {
    marginRight: 2,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  dpadRight: {
    marginLeft: 2,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  dpadCenter: {
    width: 36,
    height: 36,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterText: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: '800',
  },
  quickExploreBox: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  quickExploreTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B4332',
    marginTop: 4,
  },
  quickExploreSub: {
    fontSize: 11,
    color: '#40916C',
    marginTop: 2,
  },
});
