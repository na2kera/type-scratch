'use client';

import { useReducer, useCallback, Reducer } from 'react';

const MAX_HISTORY = 50;

type HistoryState<T> = { past: T[]; present: T; future: T[] };

type HistoryAction<T> =
  | { type: 'SET'; value: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; value: T };

function historyReducer<T>(state: HistoryState<T>, action: HistoryAction<T>): HistoryState<T> {
  switch (action.type) {
    case 'SET':
      return {
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.present],
        present: action.value,
        future: [],
      };
    case 'UNDO':
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      };
    case 'REDO':
      if (state.future.length === 0) return state;
      return {
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1),
      };
    case 'RESET':
      return { past: [], present: action.value, future: [] };
  }
}

export function useUndoable<T>(initial: T) {
  const [state, dispatch] = useReducer(
    historyReducer as Reducer<HistoryState<T>, HistoryAction<T>>,
    { past: [], present: initial, future: [] },
  );

  const set = useCallback((value: T) => dispatch({ type: 'SET', value }), []);
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const reset = useCallback((value: T) => dispatch({ type: 'RESET', value }), []);

  return {
    present: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
