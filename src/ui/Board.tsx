import { GameState } from '@/game/state';
import { Foundations } from './Foundations';
import { StockTalon } from './StockTalon';
import { Tableau } from './Tableau';
import { TopBar } from './TopBar';
import './Board.css';

export function Board({ state }: { state: GameState }) {
  const elapsedSec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
  return (
    <div className="board">
      <TopBar elapsedSec={elapsedSec} moves={state.movesMade} />
      <div className="board__top">
        <StockTalon stock={state.stock} talon={state.talon} />
        <Foundations piles={state.foundations} />
      </div>
      <Tableau columns={state.tableau} />
    </div>
  );
}
