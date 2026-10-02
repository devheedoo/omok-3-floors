import { Board } from './components/Board';
import { StatusPanel } from './components/StatusPanel';
import { useGame } from './useGame';

export function App() {
  const { game, selected, targets, canUndo, click, undo, reset } = useGame();

  return (
    <main className="app">
      <h1>3층 오목</h1>
      <div className="layout">
        <Board game={game} selected={selected} targets={targets} onCellClick={click} />
        <StatusPanel game={game} canUndo={canUndo} onUndo={undo} onReset={reset} />
      </div>
    </main>
  );
}
