'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TypeNode, NodeId, BaseRow, TypeResultMap, NodeTypeResult } from './lib/types';
import { mapChildren } from './lib/nodes';
import { generateSource, generateCheckSource } from './lib/codegen';
import { puzzles } from './lib/puzzles';
import { evaluateType } from './workers/worker-client';
import { useUndoable } from './lib/useUndoable';
import { useProgress } from './lib/useProgress';
import { useTutorial } from './lib/useTutorial';
import ModeToggle from './components/ModeToggle';
import SandboxPanel from './components/SandboxPanel';
import PuzzlePanel from './components/PuzzlePanel';
import Tutorial from './components/Tutorial';

function updateNodeInTree(root: TypeNode | null, id: NodeId, updater: (node: TypeNode) => TypeNode): TypeNode | null {
  if (!root) return null;
  function update(node: TypeNode): TypeNode {
    if (node.id === id) return updater(node);
    return mapChildren(node, update);
  }
  return update(root);
}

export default function TypePuzzleApp() {
  const [mode, setMode] = useState<'sandbox' | 'puzzle'>('sandbox');

  const sandbox = useUndoable<TypeNode | null>(null);
  const [baseRows, setBaseRows] = useState<BaseRow[]>([
    { key: 'name', type: 'string' },
    { key: 'age', type: 'number' },
  ]);

  const puzzle = useUndoable<TypeNode | null>(null);
  const [currentPuzzleId, setCurrentPuzzleId] = useState(puzzles[0].id);
  const [judgeResult, setJudgeResult] = useState<boolean | null>(null);
  const { solved, markSolved } = useProgress();
  const { show: showTutorial, dismiss: dismissTutorial, open: openTutorial } = useTutorial();
  const puzzleRootsRef = useRef<Record<string, TypeNode | null>>({});

  const [typeResult, setTypeResult] = useState<TypeResultMap>({});
  const [outputResult, setOutputResult] = useState<NodeTypeResult | undefined>(undefined);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = mode === 'sandbox' ? sandbox : puzzle;

  function applyPuzzleRoot(root: TypeNode | null) {
    puzzle.set(root);
    puzzleRootsRef.current[currentPuzzleId] = root;
    setJudgeResult(null);
  }

  function setCurrentRoot(root: TypeNode | null) {
    if (mode === 'sandbox') {
      sandbox.set(root);
    } else {
      applyPuzzleRoot(root);
    }
  }

  function getBaseTypeSource(): string {
    if (mode === 'sandbox') {
      const props = baseRows.map(r => `${r.key}: ${r.type}`).join('; ');
      return `type T = { ${props} };`;
    } else {
      const p = puzzles.find(p => p.id === currentPuzzleId) ?? puzzles[0];
      return p.baseTypeSource;
    }
  }

  const handleNodeUpdate = useCallback((id: NodeId, updater: (node: TypeNode) => TypeNode) => {
    if (mode === 'sandbox') {
      sandbox.set(updateNodeInTree(sandbox.present, id, updater));
    } else {
      applyPuzzleRoot(updateNodeInTree(puzzle.present, id, updater));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, currentPuzzleId, sandbox.present, puzzle.present]);

  function handlePuzzleChange(id: string) {
    puzzleRootsRef.current[currentPuzzleId] = puzzle.present;
    const savedRoot = puzzleRootsRef.current[id] ?? null;
    puzzle.reset(savedRoot);
    setCurrentPuzzleId(id);
    setJudgeResult(null);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        current.undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        current.redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [current.undo, current.redo]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!current.present) {
        setTypeResult({});
        setOutputResult(undefined);
        return;
      }
      try {
        const source = generateSource(getBaseTypeSource(), current.present);
        const result = await evaluateType(source);
        setOutputResult(result);

        const newTypeResult: TypeResultMap = {};
        for (const [nodeId, displayString] of Object.entries(result.nodeResults)) {
          newTypeResult[nodeId] = { displayString, errors: [] };
        }
        newTypeResult[current.present.id] = { displayString: result.displayString, errors: result.errors };
        setTypeResult(newTypeResult);
      } catch (e) {
        console.error('Evaluation error:', e);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.present, baseRows, mode, currentPuzzleId]);

  async function handleJudge(): Promise<boolean> {
    const root = puzzle.present;
    if (!root) { setJudgeResult(false); return false; }
    const p = puzzles.find(p => p.id === currentPuzzleId) ?? puzzles[0];
    const source = generateCheckSource(p.baseTypeSource, root, p.targetTypeSource);
    try {
      const result = await evaluateType(source);
      const passed = result.errors.length === 0;
      setJudgeResult(passed);
      if (passed) markSolved(currentPuzzleId);
      return passed;
    } catch {
      setJudgeResult(false);
      return false;
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#eef2f7' }}>
      {showTutorial && <Tutorial onDismiss={dismissTutorial} />}

      <header style={{ background: '#2563eb', boxShadow: '0 3px 12px rgba(37,99,235,0.35)' }}>
        <div style={{ maxWidth: '1280px' }} className="mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div style={{ background: 'white', borderRadius: '8px', padding: '4px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
              <span style={{ color: '#2563eb', fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.5px' }}>TS</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-fredoka), sans-serif', color: 'white', fontWeight: 700, fontSize: '22px', letterSpacing: '0.01em', margin: 0 }}>
              type-scratch
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openTutorial}
              style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', background: 'none', border: 'none', cursor: 'pointer' }}
              className="hover:text-white transition-colors"
            >
              ? ヘルプ
            </button>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1280px' }} className="mx-auto px-5 py-5">
        {mode === 'sandbox' ? (
          <SandboxPanel
            typeResult={typeResult}
            root={sandbox.present}
            onRootChange={r => sandbox.set(r)}
            baseRows={baseRows}
            onBaseRowsChange={setBaseRows}
            onNodeUpdate={handleNodeUpdate}
            outputResult={outputResult}
            onUndo={current.undo}
            onRedo={current.redo}
            canUndo={current.canUndo}
            canRedo={current.canRedo}
          />
        ) : (
          <PuzzlePanel
            typeResult={typeResult}
            root={puzzle.present}
            onRootChange={setCurrentRoot}
            currentPuzzleId={currentPuzzleId}
            onPuzzleChange={handlePuzzleChange}
            onNodeUpdate={handleNodeUpdate}
            onJudge={handleJudge}
            judgeResult={judgeResult}
            solved={solved}
            onUndo={current.undo}
            onRedo={current.redo}
            canUndo={current.canUndo}
            canRedo={current.canRedo}
          />
        )}
      </main>
    </div>
  );
}
