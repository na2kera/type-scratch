'use client';

import { serializeSlotRef } from '../lib/tree-ops';
import { useDroppable } from '@dnd-kit/core';

export default function RootDropZone() {
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
        <div style={{
          display: 'inline-flex',
          padding: '8px 20px',
          borderRadius: '10px',
          background: isOver ? '#2563eb' : '#f1f5f9',
          color: isOver ? 'white' : '#64748b',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          transition: 'all 0.15s',
        }}>
          {isOver ? 'ここにドロップ' : 'ルートブロックを置く'}
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
          下のブロック棚からドラッグしてください
        </div>
      </div>
    </div>
  );
}
