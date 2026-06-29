'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TypeNode, NodeId, BaseRow } from './lib/types';
import { generateSource, generateCheckSource } from './lib/codegen';
import { puzzles } from './lib/puzzles';
import { evaluateType } from './workers/worker-client';
import ModeToggle from './components/ModeToggle';
import SandboxPanel from './components/SandboxPanel';
import PuzzlePanel from './components/PuzzlePanel';

function updateNodeInTree(root: TypeNode | null, id: NodeId, updater: (node: TypeNode) => TypeNode): TypeNode | null {
  if (!root) return null;
  if (root.id === id) return updater(root);
  function update(node: TypeNode): TypeNode {
    if (node.id === id) return updater(node);
    switch (node.kind) {
      case 'object': return { ...node, props: node.props.map(p => ({ ...p, value: update(p.value) })) };
      case 'union': return { ...node, members: node.members.map(update) };
      case 'tuple': return { ...node, elements: node.elements.map(update) };
      case 'array': return { ...node, element: update(node.element) };
      case 'keyof': return { ...node, target: update(node.target) };
      case 'indexedAccess': return { ...node, target: update(node.target), key: update(node.key) };
      case 'mappedType': return { ...node, keys: update(node.keys), source: update(node.source) };
      case 'conditional': return { ...node, check: update(node.check), extends: update(node.extends), trueBranch: update(node.trueBranch), falseBranch: update(node.falseBranch) };
      case 'templateLiteral': return { ...node, parts: node.parts.map(p => typeof p === 'string' ? p : update(p)) };
    }
    return node;
  }
  return update(root);
}

export default function TypePuzzleApp() {
  const [mode, setMode] = useState<'sandbox' | 'puzzle'>('sandbox');

  // Sandbox state
  const [sandboxRoot, setSandboxRoot] = useState<TypeNode | null>(null);
  const [baseRows, setBaseRows] = useState<BaseRow[]>([
    { key: 'name', type: 'string' },
    { key: 'age', type: 'number' },
  ]);

  // Puzzle state
  const [puzzleRoots, setPuzzleRoots] = useState<Record<string, TypeNode | null>>({});
  const [currentPuzzleId, setCurrentPuzzleId] = useState(puzzles[0].id);
  const [judgeResult, setJudgeResult] = useState<boolean | null>(null);

  // Type evaluation results
  const [typeResult, setTypeResult] = useState<Record<string, { displayString: string; errors: string[] }>>({});
  const [outputResult, setOutputResult] = useState<{ displayString: string; errors: string[] } | undefined>(undefined);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRoot = mode === 'sandbox' ? sandboxRoot : (puzzleRoots[currentPuzzleId] ?? null);

  function setCurrentRoot(root: TypeNode | null) {
    if (mode === 'sandbox') {
      setSandboxRoot(root);
    } else {
      setPuzzleRoots(prev => ({ ...prev, [currentPuzzleId]: root }));
      setJudgeResult(null);
    }
  }

  function getBaseTypeSource(): string {
    if (mode === 'sandbox') {
      const props = baseRows.map(r => `${r.key}: ${r.type}`).join('; ');
      return `type T = { ${props} };`;
    } else {
      const puzzle = puzzles.find(p => p.id === currentPuzzleId) ?? puzzles[0];
      return puzzle.baseTypeSource;
    }
  }

  const handleNodeUpdate = useCallback((id: NodeId, updater: (node: TypeNode) => TypeNode) => {
    if (mode === 'sandbox') {
      setSandboxRoot(prev => updateNodeInTree(prev, id, updater));
    } else {
      setPuzzleRoots(prev => ({
        ...prev,
        [currentPuzzleId]: updateNodeInTree(prev[currentPuzzleId] ?? null, id, updater),
      }));
      setJudgeResult(null);
    }
  }, [mode, currentPuzzleId]);

  // Debounced evaluation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!currentRoot) {
        setTypeResult({});
        setOutputResult(undefined);
        return;
      }
      try {
        const source = generateSource(getBaseTypeSource(), currentRoot);
        const result = await evaluateType(source);
        setOutputResult(result);

        // 各ノードの中間評価結果を展開
        const newTypeResult: Record<string, { displayString: string; errors: string[] }> = {};
        for (const [nodeId, displayString] of Object.entries(result.nodeResults)) {
          newTypeResult[nodeId] = { displayString, errors: [] };
        }
        // ルートノードにはコンパイルエラーも付与
        newTypeResult[currentRoot.id] = { displayString: result.displayString, errors: result.errors };
        setTypeResult(newTypeResult);
      } catch (e) {
        console.error('Evaluation error:', e);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoot, baseRows, mode, currentPuzzleId]);

  async function handleJudge(): Promise<boolean> {
    const root = puzzleRoots[currentPuzzleId] ?? null;
    if (!root) { setJudgeResult(false); return false; }
    const puzzle = puzzles.find(p => p.id === currentPuzzleId) ?? puzzles[0];
    const source = generateCheckSource(puzzle.baseTypeSource, root, puzzle.targetTypeSource);
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

  function handlePuzzleChange(id: string) {
    setCurrentPuzzleId(id);
    setJudgeResult(null);
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
            root={sandboxRoot}
            onRootChange={setSandboxRoot}
            baseRows={baseRows}
            onBaseRowsChange={setBaseRows}
            onNodeUpdate={handleNodeUpdate}
            outputResult={outputResult}
          />
        ) : (
          <PuzzlePanel
            typeResult={typeResult}
            root={puzzleRoots[currentPuzzleId] ?? null}
            onRootChange={setCurrentRoot}
            currentPuzzleId={currentPuzzleId}
            onPuzzleChange={handlePuzzleChange}
            onNodeUpdate={handleNodeUpdate}
            onJudge={handleJudge}
            judgeResult={judgeResult}
          />
        )}
      </main>
    </div>
  );
}
