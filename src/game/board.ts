/**
 * 삼각형 격자(각 교차점이 6방향으로 연결) 위의 육각형 게임판.
 * 축 좌표계(axial, q/r)를 사용하며 s = -q - r 이다.
 */

export type CellKey = `${number},${number}`;

export interface Coord {
  q: number;
  r: number;
}

/** 오목 판정용 직선 3방향. 반대 방향을 더하면 6방향 인접이 된다. */
export const LINE_AXES: readonly Coord[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: 1, r: -1 },
];

const NEIGHBOR_DIRS: readonly Coord[] = LINE_AXES.flatMap((d) => [d, { q: -d.q, r: -d.r }]);

export const toKey = ({ q, r }: Coord): CellKey => `${q},${r}`;

export const fromKey = (key: CellKey): Coord => {
  const [q, r] = key.split(',').map(Number) as [number, number];
  return { q, r };
};

export const CENTER: CellKey = toKey({ q: 0, r: 0 });

export const isInside = ({ q, r }: Coord, radius: number): boolean =>
  Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= radius;

export function allCells(radius: number): CellKey[] {
  const cells: CellKey[] = [];
  for (let r = -radius; r <= radius; r++) {
    for (let q = -radius; q <= radius; q++) {
      if (isInside({ q, r }, radius)) cells.push(toKey({ q, r }));
    }
  }
  return cells;
}

export function neighbors(key: CellKey, radius: number): CellKey[] {
  const { q, r } = fromKey(key);
  return NEIGHBOR_DIRS.map((d) => ({ q: q + d.q, r: r + d.r }))
    .filter((c) => isInside(c, radius))
    .map(toKey);
}

export function areAdjacent(a: CellKey, b: CellKey): boolean {
  const ca = fromKey(a);
  const cb = fromKey(b);
  const dq = ca.q - cb.q;
  const dr = ca.r - cb.r;
  return NEIGHBOR_DIRS.some((d) => d.q === dq && d.r === dr);
}
