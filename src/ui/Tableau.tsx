import { Card } from '@/game/card';
import { TableauColumn } from './TableauColumn';
import './Tableau.css';

export function Tableau({ columns }: { columns: Card[][] }) {
  return (
    <div className="tableau">
      {columns.map((col, i) => (
        <TableauColumn key={i} cards={col} column={i} />
      ))}
    </div>
  );
}
