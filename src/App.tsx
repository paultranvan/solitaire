import { useState } from 'react';
import { createInitialState } from '@/game/state';
import { Board } from '@/ui/Board';
import './ui/theme.css';

export default function App() {
  const [initial] = useState(() => createInitialState({ drawCount: 1, seed: 'dev-seed-001' }));
  return <Board initial={initial} />;
}
