import { useMemo } from 'react';
import { LINE_AXES, allCells, fromKey, isInside, toKey, type CellKey } from '../game/board';
import { canPlace, type GameState, type Player } from '../game/rules';

const SPACING = 44;
const STONE_R = SPACING * 0.38;
/** 아래층 돌이 살짝 비쳐 보이도록 하는 세로 오프셋 */
const FLOOR_OFFSET = 4;
const PADDING = SPACING;

const toPixel = (key: CellKey) => {
  const { q, r } = fromKey(key);
  return { x: SPACING * (q + r / 2), y: SPACING * (Math.sqrt(3) / 2) * r };
};

interface BoardProps {
  game: GameState;
  selected: CellKey | null;
  targets: CellKey[];
  onCellClick: (cell: CellKey) => void;
}

const PLAYER_LABEL: Record<Player, string> = { black: '흑', white: '백' };

export function Board({ game, selected, targets, onCellClick }: BoardProps) {
  const { radius } = game.config;
  const cells = useMemo(() => allCells(radius), [radius]);

  const lines = useMemo(
    () =>
      cells.flatMap((key) => {
        const { q, r } = fromKey(key);
        return LINE_AXES.map((d) => ({ q: q + d.q, r: r + d.r }))
          .filter((n) => isInside(n, radius))
          .map((n) => [toPixel(key), toPixel(toKey(n))] as const);
      }),
    [cells, radius],
  );

  const extent = SPACING * radius + PADDING;
  const extentY = SPACING * (Math.sqrt(3) / 2) * radius + PADDING;
  const targetSet = new Set(targets);
  const winSet = new Set(game.winCells);
  const last = game.lastAction;
  const lastCell = last ? (last.type === 'place' ? last.at : last.to) : null;

  return (
    <svg
      className="board"
      viewBox={`${-extent} ${-extentY} ${extent * 2} ${extentY * 2}`}
      role="grid"
      aria-label="3층 오목 게임판"
    >
      <g className="board-lines">
        {lines.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>

      {cells.map((key) => {
        const { x, y } = toPixel(key);
        const stack = game.board[key] ?? [];
        const height = stack.length;
        const top = stack.at(-1);
        const placeable = canPlace(game, key);
        const classes = [
          'cell',
          placeable && 'placeable',
          placeable && `ghost-${game.turn}`,
          selected === key && 'selected',
          targetSet.has(key) && 'target',
          winSet.has(key) && 'win',
          lastCell === key && 'last',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <g
            key={key}
            className={classes}
            transform={`translate(${x} ${y})`}
            onClick={() => onCellClick(key)}
            role="gridcell"
            aria-label={top ? `${PLAYER_LABEL[top]} ${height}층` : '빈 칸'}
          >
            <circle className="hit" r={SPACING / 2} />
            {/* 아래층은 색을 감추고 높이만 보여준다(암기 요소) */}
            {stack.slice(0, -1).map((_, i) => (
              <circle
                key={i}
                className="stone under"
                r={STONE_R}
                cy={(height - 1 - i) * FLOOR_OFFSET}
              />
            ))}
            {top ? (
              <>
                <circle className={`stone ${top} floor-${height}`} r={STONE_R} />
                {height > 1 && (
                  <text className={`floor-label ${top}`} dy="0.35em">
                    {height}
                  </text>
                )}
              </>
            ) : (
              <circle className="ghost" r={STONE_R} />
            )}
            {targetSet.has(key) && <circle className="target-dot" r={5} />}
          </g>
        );
      })}
    </svg>
  );
}
