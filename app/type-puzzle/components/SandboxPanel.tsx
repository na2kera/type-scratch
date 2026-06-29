'use client';

import { TypeNode, NodeId, BaseRow, TypeResultMap, NodeTypeResult } from '../lib/types';
import BaseTypeEditor from './BaseTypeEditor';
import NodeCard from './NodeCard';
import TreeDndContext from './TreeDndContext';
import RootDropZone from './RootDropZone';
import UndoControls from './UndoControls';

interface Props {
  typeResult?: TypeResultMap;
  root: TypeNode | null;
  onRootChange: (root: TypeNode | null) => void;
  baseRows: BaseRow[];
  onBaseRowsChange: (rows: BaseRow[]) => void;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  outputResult?: NodeTypeResult;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export default function SandboxPanel({ typeResult, root, onRootChange, baseRows, onBaseRowsChange, onNodeUpdate, outputResult, onUndo, onRedo, canUndo, canRedo }: Props) {
  const refNames = ['T'];

  return (
    <div className="flex gap-4">
      <div className="w-72 shrink-0">
        <BaseTypeEditor rows={baseRows} onChange={onBaseRowsChange} />
      </div>
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">型ツリー</div>
          <UndoControls
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            onReset={() => onRootChange(null)}
            hasRoot={!!root}
          />
        </div>
        <TreeDndContext root={root} onRootChange={onRootChange} typeResult={typeResult} onNodeUpdate={onNodeUpdate} refNames={refNames}>
          {root ? (
            <NodeCard
              node={root}
              rootNode={root}
              onRemove={() => onRootChange(null)}
              refNames={refNames}
              typeResult={typeResult}
              onNodeUpdate={onNodeUpdate}
              isRoot
            />
          ) : (
            <RootDropZone onSet={onRootChange} refNames={refNames} />
          )}
        </TreeDndContext>
        {outputResult && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-mono ${outputResult.errors.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
            <div className="text-xs text-gray-500 mb-1">結果:</div>
            {outputResult.errors.length > 0 ? outputResult.errors[0] : outputResult.displayString}
          </div>
        )}
      </div>
    </div>
  );
}
