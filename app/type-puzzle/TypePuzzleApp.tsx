'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TypeNode, NodeId, BaseRow, TypeResultMap, NodeTypeResult } from './lib/types';
import { mapChildren } from './lib/nodes';
import { generateSource, generateCheckSource } from './lib/codegen';
import { puzzles } from './lib/puzzles';
import { evaluateType } from './workers/worker-client';
import { useUndoable } from './lib/useUndoable';
import ModeToggle from './components/ModeToggle';
import SandboxPanel from './components/SandboxPanel';
import PuzzlePanel from './components/PuzzlePanel';

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

  // Sandbox state with undo/redo
  const sandbox = useUndoable<TypeNode | null>(null);
  const [baseRows, setBaseRows] = useState<BaseRow[]>([
    { key: 'name', type: 'string' },
    { key: 'age', type: 'number' },
  ]);

  // Puzzle state with undo/redo
  const puzzle = useUndoable<TypeNode | null>(null);
  const [currentPuzzleId, setCurrentPuzzleId] = useState(puzzles[0].id);
  const [judgeResult, setJudgeResult] = useState<boolean | null>(null);
  // puzzle tree を切り替え時に保持するためのマップ
  const puzzleRootsRef = useRef<Record<string, TypeNode | null>>({});

  // Type evaluation results
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

  // puzzle切り替え: 現在のtreeを保存し、切り替え先のtreeで履歴リセット
  function handlePuzzleChange(id: string) {
    puzzleRootsRef.current[currentPuzzleId] = puzzle.present;
    const savedRoot = puzzleRootsRef.current[id] ?? null;
    puzzle.reset(savedRoot);
    setCurrentPuzzleId(id);
    setJudgeResult(null);
  }

  // キーボードショートカット (Ctrl+Z / Ctrl+Shift+Z)
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

  // Debounced evaluation
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
      return passed;
    } catch {
      setJudgeResult(false);
      return false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">TypeScript 型パズル</h1>
            <p className="text-xs text-gray-500">ビジュアルビルダーで TypeScript の型を学ぼう</p>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
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
