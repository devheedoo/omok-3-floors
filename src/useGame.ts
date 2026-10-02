import { useReducer } from 'react';
import type { CellKey } from './game/board';
import { applyAction, canPlace, createGame, moveTargets, topAt, type Action, type GameState } from './game/rules';

interface UIState {
  /** 마지막 원소가 현재 상태. 되돌리기를 위해 이전 상태를 모두 보관한다. */
  history: GameState[];
  /** 이동하려고 선택한 내 돌 더미 */
  selected: CellKey | null;
}

type UIAction = { type: 'click'; cell: CellKey } | { type: 'undo' } | { type: 'reset' };

const initialState = (): UIState => ({ history: [createGame()], selected: null });

/** 칸 클릭을 게임 액션으로 해석한다. 아무 일도 없으면 null. */
function interpretClick(game: GameState, selected: CellKey | null, cell: CellKey): Action | 'select' | 'deselect' | null {
  if (selected) {
    if (cell === selected) return 'deselect';
    if (moveTargets(game, selected).includes(cell)) return { type: 'move', from: selected, to: cell };
  }
  if (canPlace(game, cell)) return { type: 'place', at: cell };
  if (game.phase === 'play' && topAt(game, cell) === game.turn && moveTargets(game, cell).length > 0) {
    return 'select';
  }
  return selected ? 'deselect' : null;
}

function reducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'reset':
      return initialState();
    case 'undo':
      return state.history.length > 1 ? { history: state.history.slice(0, -1), selected: null } : state;
    case 'click': {
      const game = state.history.at(-1)!;
      const result = interpretClick(game, state.selected, action.cell);
      if (result === null) return state;
      if (result === 'select') return { ...state, selected: action.cell };
      if (result === 'deselect') return { ...state, selected: null };
      return { history: [...state.history, applyAction(game, result)], selected: null };
    }
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const game = state.history.at(-1)!;
  return {
    game,
    selected: state.selected,
    targets: state.selected ? moveTargets(game, state.selected) : [],
    canUndo: state.history.length > 1,
    click: (cell: CellKey) => dispatch({ type: 'click', cell }),
    undo: () => dispatch({ type: 'undo' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
