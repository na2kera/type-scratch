'use client';

import { useState } from 'react';
import { TypeNode } from '../lib/types';
import { serializeSlotRef } from '../lib/tree-ops';
import BlockPalette from './BlockPalette';
import { useDroppable } from '@dnd-kit/core';

interface Props {
  onSet: (n: TypeNode) => void;
  refNames: string[];
}

export default function RootDropZone({ onSet, refNames }: Props) {
  const [showPalette, setShowPalette] = useState(false);
  const slotId = serializeSlotRef({ kind: 'root' });
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div ref={setNodeRef} className={`relative flex items-center justify-center h-24 border-2 border-dashed rounded-xl transition-colors ${isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
      <div className="relative">
        <button
          onClick={() => setShowPalette(s => !s)}
          className="px-4 py-2 text-sm text-gray-400 hover:text-blue-500"
        >
          + ルートブロックを選ぶ
        </button>
        {showPalette && (
          <BlockPalette
            onSelect={onSet}
            onClose={() => setShowPalette(false)}
            refNames={refNames}
          />
        )}
      </div>
    </div>
  );
}
