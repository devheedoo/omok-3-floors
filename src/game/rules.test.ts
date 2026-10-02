import { describe, expect, it } from 'vitest';
import { CENTER, toKey, type CellKey } from './board';
import {
  applyAction,
  canPlace,
  checkWin,
  createGame,
  moveTargets,
  type GameState,
  type Player,
  type Stack,
} from './rules';

const k = (q: number, r: number): CellKey => toKey({ q, r });

/** 기본 배치를 끝낸 뒤, 판을 원하는 모양으로 덮어쓴 진행 중 상태 */
function playState(board: Record<CellKey, Stack>, turn: Player = 'black'): GameState {
  return { ...createGame(), phase: 'play', openingIndex: 6, turn, board };
}

describe('기본 배치', () => {
  it('흑1 → 백2 → 흑2 → 백1 순서 후 흑부터 본 게임을 시작한다', () => {
    let s = createGame();
    const order: Player[] = [];
    const spots = [k(-4, 0), k(4, 0), k(4, -2), k(-4, 2), k(0, 4), k(0, -4)];
    for (const at of spots) {
      order.push(s.turn);
      s = applyAction(s, { type: 'place', at });
    }
    expect(order).toEqual(['black', 'white', 'white', 'black', 'black', 'white']);
    expect(s.phase).toBe('play');
    expect(s.turn).toBe('black');
    expect(s.reserves).toEqual({ black: 22, white: 22 });
  });

  it('정중앙과 자신의 돌에 인접한 칸에는 둘 수 없다', () => {
    let s = createGame();
    expect(canPlace(s, CENTER)).toBe(false);
    s = applyAction(s, { type: 'place', at: k(2, 0) }); // 흑
    s = applyAction(s, { type: 'place', at: k(-2, 0) }); // 백
    expect(canPlace(s, k(-3, 0))).toBe(false); // 백 자신의 돌 옆
    expect(canPlace(s, k(3, 0))).toBe(true); // 상대 돌 옆은 가능
  });

  it('기본 배치 중에는 돌을 이동할 수 없다', () => {
    const s = applyAction(createGame(), { type: 'place', at: k(2, 0) });
    expect(moveTargets(s, k(2, 0))).toEqual([]);
  });
});

describe('돌 이동', () => {
  it('맨 위 돌이 자신의 것일 때만 옮길 수 있다', () => {
    const s = playState({ [k(0, 0)]: ['black', 'white'] });
    expect(moveTargets(s, k(0, 0))).toEqual([]);
    expect(moveTargets({ ...s, turn: 'white' }, k(0, 0))).toHaveLength(6);
  });

  it('출발 더미보다 높은 더미 위로는 올라갈 수 없고, 3층 위로는 쌓을 수 없다', () => {
    const s = playState({
      [k(0, 0)]: ['black', 'black'], // 출발: 2층
      [k(1, 0)]: ['white', 'white'], // 2층 → 3층으로 쌓기 가능
      [k(-1, 0)]: ['white', 'white', 'white'], // 이미 3층 → 불가
      [k(0, 1)]: ['white'], // 1층 → 가능
    });
    const targets = moveTargets(s, k(0, 0));
    expect(targets).toContain(k(1, 0));
    expect(targets).toContain(k(0, 1));
    expect(targets).not.toContain(k(-1, 0));

    const low = playState({ [k(0, 0)]: ['black'], [k(1, 0)]: ['white', 'white'] });
    expect(moveTargets(low, k(0, 0))).not.toContain(k(1, 0));
  });

  it('이동하면 아래에 있던 돌이 드러난다', () => {
    const s = applyAction(playState({ [k(0, 0)]: ['white', 'black'] }), {
      type: 'move',
      from: k(0, 0),
      to: k(1, 0),
    });
    expect(s.board[k(0, 0)]).toEqual(['white']);
    expect(s.board[k(1, 0)]).toEqual(['black']);
    expect(s.reserves.black).toBe(25); // 이동은 보유 돌을 소모하지 않는다
  });
});

describe('승리 판정', () => {
  const row = (n: number, player: Player): Record<CellKey, Stack> =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [k(i - 2, 0), [player]]));

  it('위에서 봤을 때 정확히 5개 연속이면 승리', () => {
    expect(checkWin(playState(row(5, 'black')), 'black')?.reason).toBe('five-in-a-row');
  });

  it('6목 이상은 인정하지 않는다', () => {
    expect(checkWin(playState(row(6, 'black')), 'black')).toBeNull();
  });

  it('맨 위 돌만 센다 (아래 깔린 돌은 무시)', () => {
    const board = row(5, 'black');
    board[k(0, 0)] = ['black', 'white'];
    expect(checkWin(playState(board), 'black')).toBeNull();
  });

  it('3층에 내 돌 5개면 승리', () => {
    const board: Record<CellKey, Stack> = {};
    for (const [q, r] of [[-4, 0], [-2, 0], [0, 0], [2, 0], [4, 0]] as const) {
      board[k(q, r)] = ['white', 'white', 'black'];
    }
    expect(checkWin(playState(board), 'black')?.reason).toBe('five-on-third-floor');
  });

  it('3층에서 인접한 3칸이 내 돌이면 승리', () => {
    const third: Stack = ['white', 'white', 'black'];
    const board = { [k(0, 0)]: third, [k(1, 0)]: third, [k(0, 1)]: third };
    expect(checkWin(playState(board), 'black')).toMatchObject({
      reason: 'three-adjacent-on-third-floor',
    });
  });

  it('이동으로 상대 조건이 드러나면 상대가 승리한다', () => {
    const board = row(5, 'white');
    board[k(0, 0)] = ['white', 'black'];
    const s = applyAction(playState(board), { type: 'move', from: k(0, 0), to: k(0, 1) });
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('white');
  });

  it('둘 다 조건을 만족하면 이번 차례 플레이어가 승리한다', () => {
    // 백 오목이 이미 판에 있는 상태에서 흑이 오목을 완성
    const board: Record<CellKey, Stack> = {
      ...Object.fromEntries([-2, -1, 0, 1, 2].map((q) => [k(q, -3), ['white']])),
      ...Object.fromEntries([-2, -1, 1, 2].map((q) => [k(q, 3), ['black']])),
    };
    const s = applyAction(playState(board), { type: 'place', at: k(0, 3) });
    expect(s.winner).toBe('black');
    expect(s.winReason).toBe('five-in-a-row');
  });
});
