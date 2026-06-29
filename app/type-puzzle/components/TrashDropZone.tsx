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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-full border-2 transition-all duration-150 select-none ${
        isOver
          ? 'bg-red-100 border-red-500 text-red-600 scale-110 shadow-xl'
          : 'bg-white border-dashed border-red-300 text-red-400 shadow-md'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
      <span className="text-sm font-medium">ドラッグして削除</span>
    </div>
  );
}
