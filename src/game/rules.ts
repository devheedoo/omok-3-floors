import {
  CENTER,
  LINE_AXES,
  allCells,
  areAdjacent,
  fromKey,
  isInside,
  neighbors,
  toKey,
  type CellKey,
} from './board';

export type Player = 'black' | 'white';

/** 아래 → 위 순서의 돌 더미 */
export type Stack = readonly Player[];

export type WinReason = 'five-in-a-row' | 'five-on-third-floor' | 'three-adjacent-on-third-floor';

export type Action = { type: 'place'; at: CellKey } | { type: 'move'; from: CellKey; to: CellKey };

export interface GameConfig {
  /** 육각형 게임판의 반지름(중심에서 가장자리까지 칸 수) */
  radius: number;
  stonesPerPlayer: number;
}

export interface GameState {
  config: GameConfig;
  /** 돌이 있는 칸만 담는다 */
  board: Readonly<Record<CellKey, Stack>>;
  reserves: Readonly<Record<Player, number>>;
  phase: 'opening' | 'play' | 'over';
  turn: Player;
  /** 기본 배치 단계에서 OPENING_ORDER의 현재 위치 */
  openingIndex: number;
  winner: Player | null;
  winReason: WinReason | null;
  /** 승리를 만든 칸들(하이라이트용) */
  winCells: CellKey[];
  lastAction: Action | null;
}

export const MAX_FLOOR = 3;

/** 흑 1 → 백 2 → 흑 2 → 백 1 */
export const OPENING_ORDER: readonly Player[] = ['black', 'white', 'white', 'black', 'black', 'white'];

export const DEFAULT_CONFIG: GameConfig = { radius: 5, stonesPerPlayer: 25 };

export const opponent = (p: Player): Player => (p === 'black' ? 'white' : 'black');

export function createGame(config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    config,
    board: {},
    reserves: { black: config.stonesPerPlayer, white: config.stonesPerPlayer },
    phase: 'opening',
    turn: OPENING_ORDER[0]!,
    openingIndex: 0,
    winner: null,
    winReason: null,
    winCells: [],
    lastAction: null,
  };
}

export const heightAt = (state: GameState, key: CellKey): number => state.board[key]?.length ?? 0;

export const topAt = (state: GameState, key: CellKey): Player | undefined => state.board[key]?.at(-1);

// ---------------------------------------------------------------------------
// 합법 수 판정
// ---------------------------------------------------------------------------

export function canPlace(state: GameState, at: CellKey): boolean {
  if (state.phase === 'over') return false;
  if (!isInside(fromKey(at), state.config.radius)) return false;
  if (heightAt(state, at) > 0) return false;
  if (state.reserves[state.turn] <= 0) return false;

  if (state.phase === 'opening') {
    if (at === CENTER) return false;
    const touchesOwn = neighbors(at, state.config.radius).some((n) => topAt(state, n) === state.turn);
    if (touchesOwn) return false;
  }
  return true;
}

/**
 * 자신의 돌이 맨 위에 있는 더미에서 맨 위 돌 하나를 인접 칸으로 옮길 수 있다.
 * - 도착 칸의 높이는 3층 미만이어야 한다.
 * - 출발 더미보다 높은 더미 위로는 올라갈 수 없다.
 */
export function moveTargets(state: GameState, from: CellKey): CellKey[] {
  if (state.phase !== 'play') return [];
  if (topAt(state, from) !== state.turn) return [];
  const fromHeight = heightAt(state, from);
  return neighbors(from, state.config.radius).filter((to) => {
    const h = heightAt(state, to);
    return h < MAX_FLOOR && h <= fromHeight;
  });
}

export function canMove(state: GameState, from: CellKey, to: CellKey): boolean {
  return areAdjacent(from, to) && moveTargets(state, from).includes(to);
}

export function isLegal(state: GameState, action: Action): boolean {
  return action.type === 'place' ? canPlace(state, action.at) : canMove(state, action.from, action.to);
}

export function hasAnyLegalAction(state: GameState): boolean {
  const cells = allCells(state.config.radius);
  return cells.some((c) => canPlace(state, c) || moveTargets(state, c).length > 0);
}

// ---------------------------------------------------------------------------
// 승리 판정 (게임판을 위에서 본 모습 = 각 칸 맨 위 돌 기준)
// ---------------------------------------------------------------------------

export interface WinResult {
  reason: WinReason;
  cells: CellKey[];
}

/** 정확히 5개 연속(6목 이상은 인정하지 않음) */
function findFiveInARow(state: GameState, player: Player): CellKey[] | null {
  const { radius } = state.config;
  for (const axis of LINE_AXES) {
    for (const start of allCells(radius)) {
      const { q, r } = fromKey(start);
      const prev = { q: q - axis.q, r: r - axis.r };
      // 한 줄의 시작점(이전 칸이 내 돌이 아닌 곳)에서만 세어 중복을 피한다
      if (topAt(state, start) !== player) continue;
      if (isInside(prev, radius) && topAt(state, toKey(prev)) === player) continue;

      const run: CellKey[] = [];
      let cur = { q, r };
      while (isInside(cur, radius) && topAt(state, toKey(cur)) === player) {
        run.push(toKey(cur));
        cur = { q: cur.q + axis.q, r: cur.r + axis.r };
      }
      if (run.length === 5) return run;
    }
  }
  return null;
}

const thirdFloorCells = (state: GameState, player: Player): CellKey[] =>
  (Object.keys(state.board) as CellKey[]).filter(
    (k) => heightAt(state, k) === MAX_FLOOR && topAt(state, k) === player,
  );

/** 3층에 있는 내 돌들 중 서로 이어진 3칸 이상의 덩어리 */
function findThreeAdjacent(cells: CellKey[]): CellKey[] | null {
  const pool = new Set(cells);
  const seen = new Set<CellKey>();
  for (const start of cells) {
    if (seen.has(start)) continue;
    const group: CellKey[] = [];
    const queue = [start];
    seen.add(start);
    while (queue.length) {
      const cur = queue.shift()!;
      group.push(cur);
      for (const n of cells) {
        if (!seen.has(n) && pool.has(n) && areAdjacent(cur, n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    if (group.length >= 3) return group;
  }
  return null;
}

export function checkWin(state: GameState, player: Player): WinResult | null {
  const five = findFiveInARow(state, player);
  if (five) return { reason: 'five-in-a-row', cells: five };

  const third = thirdFloorCells(state, player);
  if (third.length >= 5) return { reason: 'five-on-third-floor', cells: third };

  const adjacent = findThreeAdjacent(third);
  if (adjacent) return { reason: 'three-adjacent-on-third-floor', cells: adjacent };

  return null;
}

// ---------------------------------------------------------------------------
// 상태 전이
// ---------------------------------------------------------------------------

export function applyAction(state: GameState, action: Action): GameState {
  if (!isLegal(state, action)) {
    throw new Error(`Illegal action: ${JSON.stringify(action)}`);
  }
  const mover = state.turn;
  const board: Record<CellKey, Stack> = { ...state.board };

  if (action.type === 'place') {
    board[action.at] = [mover];
  } else {
    const fromStack = board[action.from]!;
    const rest = fromStack.slice(0, -1);
    if (rest.length) board[action.from] = rest;
    else delete board[action.from];
    board[action.to] = [...(board[action.to] ?? []), mover];
  }

  const reserves = action.type === 'place' ? { ...state.reserves, [mover]: state.reserves[mover] - 1 } : state.reserves;

  const next: GameState = { ...state, board, reserves, lastAction: action };

  if (state.phase === 'opening') {
    const openingIndex = state.openingIndex + 1;
    const done = openingIndex >= OPENING_ORDER.length;
    return {
      ...next,
      openingIndex,
      phase: done ? 'play' : 'opening',
      turn: done ? OPENING_ORDER[0]! : OPENING_ORDER[openingIndex]!,
    };
  }

  // 둘 다 승리 조건을 만족하면 이번 차례를 진행한 플레이어가 승리한다.
  // 돌을 옮겨 아래 돌이 드러나면서 상대가 조건을 만족할 수도 있으므로 상대도 검사한다.
  for (const player of [mover, opponent(mover)]) {
    const result = checkWin(next, player);
    if (result) {
      return { ...next, phase: 'over', winner: player, winReason: result.reason, winCells: result.cells };
    }
  }

  const passed: GameState = { ...next, turn: opponent(mover) };
  if (!hasAnyLegalAction(passed)) {
    // 둘 수 있는 수가 없으면 무승부로 처리한다
    return { ...passed, phase: 'over' };
  }
  return passed;
}
