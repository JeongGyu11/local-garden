import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PetId } from '../types';
import { getPetDefinition } from '../data/petData';
import { PetCharacter, PetFace } from './PetCharacter';

interface UndergroundMazeModalProps {
  visible: boolean;
  money: number;
  petId?: PetId;
  initialFloor?: number;
  onClose: () => void;
  onSpendGold?: (amount: number) => void;
  onClaimReward: () => Promise<boolean>;
  onUnlockElevator?: () => void;
  hasClaimedDungeonReward?: boolean;
  hasUnlockedElevator?: boolean;
}

type TileType = 'WALL' | 'PATH' | 'LADDER' | 'BAT' | 'TRAP';

interface MazeCell {
  x: number;
  y: number;
  type: TileType;
}

export const UndergroundMazeModal: React.FC<UndergroundMazeModalProps> = ({
  visible,
  petId,
  initialFloor = 1,
  onClose,
  onClaimReward,
  onUnlockElevator,
  hasClaimedDungeonReward = false,
  hasUnlockedElevator = false,
}) => {
  const petDef = getPetDefinition(petId ?? 'meerkat');
  const [currentFloor, setCurrentFloor] = useState(initialFloor);
  const [timeLeft, setTimeLeft] = useState(30);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 1, y: 1 });
  const [mazeGrid, setMazeGrid] = useState<MazeCell[][]>([]);
  const [gridSize, setGridSize] = useState(7);
  const [gameResult, setGameResult] = useState<'CLEAR' | 'FAIL_TIME' | 'FAIL_BAT' | 'VICTORY_ALL' | null>(null);
  const rewardClaimInProgressRef = useRef(false);

  // 미로 생성 함수 (층별 격자 생성)
  const generateMaze = (floor: number) => {
    let size = 7;
    if (floor >= 4 && floor <= 6) size = 9;
    if (floor >= 7 && floor <= 9) size = 11;
    if (floor >= 10 && floor <= 12) size = 13;
    if (floor >= 13) size = 15;

    setGridSize(size);
    const grid: MazeCell[][] = [];

    for (let r = 0; r < size; r++) {
      const row: MazeCell[] = [];
      for (let c = 0; c < size; c++) {
        const isBorder = r === 0 || r === size - 1 || c === 0 || c === size - 1;
        row.push({
          x: c,
          y: r,
          type: isBorder ? 'WALL' : 'PATH',
        });
      }
      grid.push(row);
    }

    // 벽 장애물 랜덤 생성
    for (let r = 1; r < size - 1; r++) {
      for (let c = 1; c < size - 1; c++) {
        if ((r % 2 === 0 && c % 2 === 0) || Math.random() < 0.22) {
          if (!(r === 1 && c === 1)) {
            grid[r][c].type = 'WALL';
          }
        }
      }
    }

    // 출발점
    grid[1][1].type = 'PATH';
    setPlayerPos({ x: 1, y: 1 });

    // 목적지 사다리 (우측 하단)
    const ladderX = size - 2;
    const ladderY = size - 2;
    grid[ladderY][ladderX].type = 'LADDER';

    // 100% 미로 탈출 가능 경로 보장 (BFS 검증 및 길 개척)
    const hasPath = (g: MazeCell[][]): boolean => {
      const visited = Array.from({ length: size }, () => Array(size).fill(false));
      const queue: Array<[number, number]> = [[1, 1]];
      visited[1][1] = true;
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      while (queue.length > 0) {
        const [x, y] = queue.shift()!;
        if (x === ladderX && y === ladderY) return true;

        for (const [dx, dy] of dirs) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 1 && nx < size - 1 &&
            ny >= 1 && ny < size - 1 &&
            !visited[ny][nx] &&
            g[ny][nx].type !== 'WALL'
          ) {
            visited[ny][nx] = true;
            queue.push([nx, ny]);
          }
        }
      }
      return false;
    };

    // 경로가 없다면 목적지까지 뚫어 100% 완주 가능한 미로로 보장
    if (!hasPath(grid)) {
      let cx = 1;
      let cy = 1;
      while (cx !== ladderX || cy !== ladderY) {
        if (Math.random() < 0.5 && cx !== ladderX) {
          cx += cx < ladderX ? 1 : -1;
        } else if (cy !== ladderY) {
          cy += cy < ladderY ? 1 : -1;
        } else if (cx !== ladderX) {
          cx += cx < ladderX ? 1 : -1;
        }
        if (grid[cy][cx].type === 'WALL') {
          grid[cy][cx].type = 'PATH';
        }
      }
    }

    // 사다리와 출발지 무조건 통행 보장
    grid[1][1].type = 'PATH';
    grid[ladderY][ladderX].type = 'LADDER';
    if (grid[ladderY - 1][ladderX].type === 'WALL' && grid[ladderY][ladderX - 1].type === 'WALL') {
      grid[ladderY - 1][ladderX].type = 'PATH';
    }

    // 박쥐 (B4F 이상 등장, 가시 함정 TRAP은 제거)
    if (floor >= 4) {
      grid[2][size - 2].type = 'BAT';
    }

    setMazeGrid(grid);
    setGameResult(null);

    let baseTime = 30; // B1F~B3F: 30s
    if (floor >= 4 && floor <= 9) baseTime = 40; // B4F~B9F: 40s
    if (floor >= 10) baseTime = 60; // B10F~B15F: 60s
    setTimeLeft(baseTime);
  };

  // 모달이 켜질 때 지정된 층으로 생성
  useEffect(() => {
    if (visible) {
      rewardClaimInProgressRef.current = false;
      const startF = initialFloor ?? 1;
      setCurrentFloor(startF);
      generateMaze(startF);
      if (startF >= 10 && !hasUnlockedElevator) {
        onUnlockElevator?.();
      }
    }
  }, [visible, initialFloor]);

  // 타이머 카운트다운
  useEffect(() => {
    if (!visible || gameResult) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameResult('FAIL_TIME');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, gameResult]);

  // 플레이어 이동 처리
  const movePlayer = async (dx: number, dy: number) => {
    if (gameResult || rewardClaimInProgressRef.current) return;

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    if (newX < 0 || newX >= gridSize || newY < 0 || newY >= gridSize) return;

    const targetCell = mazeGrid[newY][newX];

    // 벽으로 이동 시 차단
    if (targetCell.type === 'WALL') {
      return;
    }

    // 박쥐 피격 시 즉시 게임 오버 및 펫 알림
    if (targetCell.type === 'BAT') {
      setGameResult('FAIL_BAT');
      return;
    }

    // 사다리 도달 & 층 클리어
    if (targetCell.type === 'LADDER') {
      if (currentFloor >= 15) {
        setGameResult('VICTORY_ALL');
        if (!hasClaimedDungeonReward && !rewardClaimInProgressRef.current) {
          rewardClaimInProgressRef.current = true;
          const rewardSaved = await onClaimReward();
          if (!rewardSaved) {
            rewardClaimInProgressRef.current = false;
            setGameResult(null);
            Alert.alert(
              '보상 저장 실패',
              '보상을 안전하게 저장하지 못했습니다. 네트워크 연결을 확인한 뒤 사다리에 다시 도달해주세요.'
            );
            return;
          }
        }
      } else {
        setGameResult('CLEAR');
      }
    }

    setPlayerPos({ x: newX, y: newY });
  };

  // 다음 층으로 이동
  const handleNextFloor = () => {
    const nextF = currentFloor + 1;
    setCurrentFloor(nextF);
    generateMaze(nextF);
    if (nextF >= 10) {
      if (!hasUnlockedElevator) {
        onUnlockElevator?.();
        if (nextF === 10) {
          Alert.alert(
            '🛗 엘리베이터 해금!',
            '지하 10층에 도달했습니다! 이제부터 500G로 지하 10층 직행 엘리베이터를 이용할 수 있습니다. 🛗'
          );
        }
      }
    }
  };

  // 던전 포기/종료 후 귀환
  const handleExitRun = () => {
    setGameResult(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* 모달 상단 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="compass" size={22} color="#FFE57F" />
              <View>
                <Text style={styles.headerTitle}>지하 15층 미로 던전</Text>
                <Text style={styles.headerSubtitle}>지하 B{currentFloor}F 미로</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleExitRun}>
              <Ionicons name="close" size={20} color="#FFF7D6" />
            </TouchableOpacity>
          </View>

          {/* 미로 게임 화면 */}
          <View style={styles.gameContainer}>
            {/* 게임 HUD */}
            <View style={styles.gameHud}>
              <Text style={styles.gameHudText}>B{currentFloor}F</Text>
              <Text style={styles.gameHudText}>🎯 🪜 사다리 탈출</Text>
              <Text style={styles.gameHudText}>⏱️ {timeLeft}초</Text>
            </View>

            {/* 미로 격자 맵 (Grid Map) */}
            <View style={styles.mazeBoard}>
              {mazeGrid.map((row, r) => (
                <View key={`row-${r}`} style={styles.mazeRow}>
                  {row.map((cell, c) => {
                    const isPlayer = playerPos.x === c && playerPos.y === r;
                    const dx = Math.abs(c - playerPos.x);
                    const dy = Math.abs(r - playerPos.y);

                    let isDark = false;
                    if (currentFloor >= 1 && currentFloor <= 3) {
                      // B1F ~ B3F: 입문 층 - 시야 전부 노출
                      isDark = false;
                    } else if (currentFloor >= 4 && currentFloor <= 9) {
                      // B4F ~ B9F: 앞/뒤/옆/대각선 포함 1칸 (3x3 박스 시야)
                      isDark = dx > 1 || dy > 1;
                    } else if (currentFloor >= 10) {
                      // B10F ~ B15F: 심연/대형 층 - 상/하/좌/우 십자 형태 1칸 시야
                      isDark = !((dx === 0 && dy <= 1) || (dy === 0 && dx <= 1));
                    }

                    return (
                      <View
                        key={`cell-${r}-${c}`}
                        style={[
                          styles.cell,
                          cell.type === 'WALL' && styles.cellWall,
                          isDark && styles.cellDark,
                        ]}
                      >
                        {isPlayer ? (
                          <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                            <PetFace petId={petId ?? 'meerkat'} size={20} />
                          </View>
                        ) : isDark ? null : cell.type === 'LADDER' ? (
                          <Text style={styles.cellEmoji}>🪜</Text>
                        ) : cell.type === 'BAT' ? (
                          <Text style={styles.cellEmoji}>🦇</Text>
                        ) : cell.type === 'TRAP' ? (
                          <Text style={styles.cellEmoji}>💥</Text>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* D-Pad 방향키 조작반 */}
            <View style={styles.dpadArea}>
              <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(0, -1)}>
                <Ionicons name="chevron-up" size={24} color="#FFF7D6" />
              </TouchableOpacity>
              <View style={styles.dpadRow}>
                <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(-1, 0)}>
                  <Ionicons name="chevron-back" size={24} color="#FFF7D6" />
                </TouchableOpacity>
                <View style={styles.dpadCenter}>
                  <Text style={styles.dpadCenterText}>MOVE</Text>
                </View>
                <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(1, 0)}>
                  <Ionicons name="chevron-forward" size={24} color="#FFF7D6" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.dpadBtn} onPress={() => movePlayer(0, 1)}>
                <Ionicons name="chevron-down" size={24} color="#FFF7D6" />
              </TouchableOpacity>
            </View>

            {/* 결과 모달 */}
            {gameResult && (
              <View style={styles.resultBanner}>
                {gameResult === 'CLEAR' && (
                  <>
                    <Text style={styles.resultTitle}>🎉 B{currentFloor}F 탐험 성공!</Text>
                    <TouchableOpacity style={styles.resultActionBtn} onPress={handleNextFloor}>
                      <Text style={styles.resultActionText}>B{currentFloor + 1}F 다음 층으로 하강 🪜</Text>
                    </TouchableOpacity>
                  </>
                )}
                {gameResult === 'VICTORY_ALL' && (
                  <>
                    <Text style={styles.resultTitle}>🏆 지하 15층 완전 정복 완료!</Text>
                    <Text style={styles.resultSub}>
                      {hasClaimedDungeonReward
                        ? '이미 최초 정복 보상을 수령하여 추가 보상이 없습니다.'
                        : '5,000G + 무지개씨앗x2 + 다이아몬드x2 + 자수정x2 지급!'}
                    </Text>
                    <TouchableOpacity style={styles.resultActionBtn} onPress={handleExitRun}>
                      <Text style={styles.resultActionText}>농장으로 귀환 🌾</Text>
                    </TouchableOpacity>
                  </>
                )}
                {gameResult === 'FAIL_BAT' && (
                  <>
                    <Text style={styles.resultTitle}>🦇 박쥐 습격!</Text>
                    <Text style={styles.resultSub}>{petDef.name}은(는) 박쥐를 싫어한답니다! 🦇</Text>
                    <TouchableOpacity style={styles.resultActionBtn} onPress={handleExitRun}>
                      <Text style={styles.resultActionText}>농장으로 귀환 🌾</Text>
                    </TouchableOpacity>
                  </>
                )}
                {gameResult === 'FAIL_TIME' && (
                  <>
                    <Text style={styles.resultTitle}>⏱️ 제한 시간 종료!</Text>
                    <Text style={styles.resultSub}>탈출에 실패했습니다. 다시 도전해보세요!</Text>
                    <TouchableOpacity style={styles.resultActionBtn} onPress={handleExitRun}>
                      <Text style={styles.resultActionText}>농장으로 귀환 🌾</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: '#334155',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: '#FFF7D6',
    fontSize: 16,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameContainer: {
    padding: 12,
    alignItems: 'center',
  },
  gameHud: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  gameHudText: {
    color: '#FFF7D6',
    fontSize: 12,
    fontWeight: '900',
  },
  mazeBoard: {
    backgroundColor: '#0F172A',
    padding: 4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#334155',
  },
  mazeRow: {
    flexDirection: 'row',
  },
  cell: {
    width: 24,
    height: 24,
    backgroundColor: '#334155',
    margin: 1,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellWall: {
    backgroundColor: '#0F172A',
  },
  cellDark: {
    backgroundColor: '#020617',
  },
  cellEmoji: {
    fontSize: 13,
  },
  dpadArea: {
    marginTop: 12,
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dpadBtn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#64748B',
  },
  dpadCenter: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterText: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '900',
  },
  resultBanner: {
    position: 'absolute',
    top: 60,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#F59E0B',
    padding: 16,
    alignItems: 'center',
  },
  resultTitle: {
    color: '#FFF7D6',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  resultSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginBottom: 12,
  },
  resultActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resultActionText: {
    color: '#FFF7D6',
    fontSize: 13,
    fontWeight: '900',
  },
});
