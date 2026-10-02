import { OPENING_ORDER, type GameState, type Player, type WinReason } from '../game/rules';

const NAME: Record<Player, string> = { black: '흑', white: '백' };

const WIN_REASON: Record<WinReason, string> = {
  'five-in-a-row': '오목 완성',
  'five-on-third-floor': '3층에 돌 5개',
  'three-adjacent-on-third-floor': '3층에 인접한 돌 3개',
};

interface StatusPanelProps {
  game: GameState;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
}

function statusMessage(game: GameState): string {
  if (game.phase === 'over') {
    return game.winner ? `${NAME[game.winner]} 승리! (${WIN_REASON[game.winReason!]})` : '무승부';
  }
  if (game.phase === 'opening') {
    const left = OPENING_ORDER.slice(game.openingIndex).findIndex((p) => p !== game.turn);
    const count = left === -1 ? OPENING_ORDER.length - game.openingIndex : left;
    return `기본 배치 · ${NAME[game.turn]} ${count}개 더 놓기`;
  }
  return `${NAME[game.turn]} 차례 · 빈 칸에 놓거나 내 돌을 선택해 이동`;
}

export function StatusPanel({ game, canUndo, onUndo, onReset }: StatusPanelProps) {
  return (
    <aside className="panel">
      <p className={`status ${game.phase === 'over' ? 'over' : ''}`}>
        <span className={`dot ${game.winner ?? game.turn}`} />
        {statusMessage(game)}
      </p>

      <dl className="reserves">
        {(['black', 'white'] as const).map((p) => (
          <div key={p} className={game.phase !== 'over' && game.turn === p ? 'active' : ''}>
            <dt>
              <span className={`dot ${p}`} />
              {NAME[p]}
            </dt>
            <dd>남은 돌 {game.reserves[p]}</dd>
          </div>
        ))}
      </dl>

      <div className="actions">
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          되돌리기
        </button>
        <button type="button" onClick={onReset}>
          새 게임
        </button>
      </div>

      <details className="rules">
        <summary>규칙</summary>
        <ul>
          <li>기본 배치: 흑 1 → 백 2 → 흑 2 → 백 1. 정중앙과 내 돌 옆에는 둘 수 없음</li>
          <li>매 차례 <b>돌 놓기</b>(빈 칸) 또는 <b>돌 이동</b>(내 돌이 맨 위인 더미의 맨 위 돌을 인접 칸으로) 중 하나</li>
          <li>최대 3층까지 쌓을 수 있고, 출발 더미보다 높은 더미로는 이동 불가</li>
          <li>아래층 돌의 색은 보이지 않음 — 기억해야 함</li>
          <li>
            승리(위에서 본 맨 위 돌 기준): 정확히 5개 일직선 / 3층에 내 돌 5개 / 3층에 인접한 내 돌 3개
          </li>
          <li>양쪽이 동시에 조건을 만족하면 이번 차례 플레이어 승리</li>
        </ul>
      </details>
    </aside>
  );
}
