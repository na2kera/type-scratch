'use client';

import { useDroppable } from '@dnd-kit/core';
import { useDragState } from './DragStateContext';

export const TRASH_DROPPABLE_ID = '__trash__';

export default function TrashDropZone() {
  const { isDraggingFromTree } = useDragState();
  const { isOver, setNodeRef } = useDroppable({ id: TRASH_DROPPABLE_ID });

  if (!isDraggingFromTree) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: `translateX(-50%) scale(${isOver ? 1.12 : 1})`,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 28px',
        borderRadius: '40px',
        border: `2.5px ${isOver ? 'solid' : 'dashed'} ${isOver ? '#ef4444' : '#fca5a5'}`,
        background: isOver ? '#fee2e2' : 'white',
        color: isOver ? '#dc2626' : '#f87171',
        boxShadow: isOver ? '0 8px 32px rgba(239,68,68,0.3)' : '0 4px 16px rgba(0,0,0,0.12)',
        transition: 'all 0.15s',
        userSelect: 'none',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 800,
        fontSize: '14px',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
      {isOver ? 'ドロップして削除' : 'ここにドロップで削除'}
    </div>
  );
}
