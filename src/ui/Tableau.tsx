import { Card } from '@/game/card';
import { AutoMoveSource } from '@/game/auto';
import { TableauColumn } from './TableauColumn';
import { HintState } from './hints';
import './Tableau.css';

export function Tableau({
  columns,
  hint,
  onAutoMove,
}: {
  columns: Card[][];
  hint: HintState;
  onAutoMove: (source: AutoMoveSource) => void;
}) {
  return (
    <div className="tableau">
      {columns.map((col, i) => (
        <TableauColumn
          key={i}
          cards={col}
          column={i}
          hint={hint}
          onAutoMove={() => onAutoMove({ kind: 'tableauTop', column: i })}
        />
      ))}
    </div>
  );
}
