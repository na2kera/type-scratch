'use client';

import { createContext, useContext } from 'react';
import { SlotRef } from '../lib/types';

export type DropValidity = 'valid-empty' | 'valid-swap' | 'invalid' | 'inactive';

interface DragContextValue {
  isDragging: boolean;
  isDraggingFromTree: boolean;
  checkValidity: (slotRef: SlotRef, hasNode: boolean) => DropValidity;
}

export const DragStateContext = createContext<DragContextValue>({
  isDragging: false,
  isDraggingFromTree: false,
  checkValidity: () => 'inactive',
});

export function useDragState() {
  return useContext(DragStateContext);
}
