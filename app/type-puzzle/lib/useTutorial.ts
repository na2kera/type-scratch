'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'type-puzzle-tutorial-seen';

export function useTutorial() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {}
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  function open() { setShow(true); }

  return { show, dismiss, open };
}
