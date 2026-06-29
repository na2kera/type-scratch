'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'type-puzzle-progress';

export function useProgress() {
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSolved(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, []);

  function markSolved(id: string) {
    setSolved(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  return { solved, markSolved };
}
