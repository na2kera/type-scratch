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
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '120px',
        border: `2.5px dashed ${isOver ? '#2563eb' : '#cbd5e1'}`,
        borderRadius: '16px',
        background: isOver ? 'rgba(37,99,235,0.05)' : 'rgba(255,255,255,0.6)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}>⊞</div>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setShowPalette(s => !s)}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: 'none',
              background: isOver ? '#2563eb' : '#f1f5f9',
              color: isOver ? 'white' : '#64748b',
              fontFamily: 'Nunito, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {isOver ? 'ここにドロップ' : '+ ルートブロックを選ぶ'}
          </button>
          {showPalette && (
            <BlockPalette
              onSelect={onSet}
              onClose={() => setShowPalette(false)}
              refNames={refNames}
            />
          )}
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'Nunito, sans-serif' }}>
          またはパレットからドラッグ
        </div>
      </div>
    </div>
  );
}
