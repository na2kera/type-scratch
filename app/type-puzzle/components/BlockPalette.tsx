'use client';

import { TypeNode, NodeKind } from '../lib/types';
import { newId } from '../lib/nodes';

interface Props {
  onSelect: (node: TypeNode) => void;
  onClose: () => void;
  inferNames?: string[];
  refNames?: string[];
}

const BLOCK_OPTIONS: { kind: NodeKind; label: string; description: string }[] = [
  { kind: 'primitive', label: 'Primitive', description: 'string / number / boolean' },
  { kind: 'literal', label: 'Literal', description: '文字列・数値・真偽値リテラル' },
  { kind: 'object', label: 'Object', description: '{ key: Type }' },
  { kind: 'union', label: 'Union (|)', description: 'A | B | ...' },
  { kind: 'tuple', label: 'Tuple', description: '[A, B, ...]' },
  { kind: 'array', label: 'Array (T[])', description: 'T[]' },
  { kind: 'keyof', label: 'keyof', description: 'keyof T' },
  { kind: 'indexedAccess', label: 'T[K]', description: 'インデックスアクセス型' },
  { kind: 'mappedType', label: 'Mapped Type', description: '{ [K in Keys]: ... }' },
  { kind: 'conditional', label: 'Conditional Type', description: 'T extends U ? A : B' },
  { kind: 'infer', label: 'infer', description: 'infer R (条件型のextends句内)' },
  { kind: 'templateLiteral', label: 'Template Literal', description: '`${T}-suffix`' },
];

function createDefaultNode(kind: NodeKind): TypeNode {
  const id = newId();
  switch (kind) {
    case 'primitive': return { id, kind: 'primitive', name: 'string' };
    case 'literal': return { id, kind: 'literal', value: 'value' };
    case 'object': return { id, kind: 'object', props: [] };
    case 'union': return { id, kind: 'union', members: [] };
    case 'tuple': return { id, kind: 'tuple', elements: [] };
    case 'array': return { id, kind: 'array', element: { id: newId(), kind: 'primitive', name: 'string' } };
    case 'keyof': return { id, kind: 'keyof', target: { id: newId(), kind: 'primitive', name: 'string' } };
    case 'indexedAccess': return {
      id, kind: 'indexedAccess',
      target: { id: newId(), kind: 'primitive', name: 'string' },
      key: { id: newId(), kind: 'primitive', name: 'string' },
    };
    case 'mappedType': return {
      id, kind: 'mappedType',
      keys: { id: newId(), kind: 'primitive', name: 'string' },
      source: { id: newId(), kind: 'object', props: [] },
      transform: 'keep',
    };
    case 'conditional': return {
      id, kind: 'conditional',
      check: { id: newId(), kind: 'primitive', name: 'string' },
      extends: { id: newId(), kind: 'primitive', name: 'string' },
      trueBranch: { id: newId(), kind: 'primitive', name: 'string' },
      falseBranch: { id: newId(), kind: 'primitive', name: 'never' as unknown as 'string' },
    };
    case 'infer': return { id, kind: 'infer', name: 'R' };
    case 'templateLiteral': return { id, kind: 'templateLiteral', parts: [''] };
    case 'ref': return { id, kind: 'ref', name: '' };
  }
}

export default function BlockPalette({ onSelect, onClose, inferNames = [], refNames = [] }: Props) {
  return (
    <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-3 min-w-64 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-700">ブロックを選ぶ</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      </div>

      {refNames.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">参照</div>
          {refNames.map(name => (
            <button
              key={`ref-${name}`}
              onClick={() => { onSelect({ id: newId(), kind: 'ref', name }); onClose(); }}
              className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-blue-50 text-blue-700 font-mono"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {inferNames.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-500 mb-1">束縛済み infer</div>
          {inferNames.map(name => (
            <button
              key={`infer-${name}`}
              onClick={() => { onSelect({ id: newId(), kind: 'infer', name }); onClose(); }}
              className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-purple-50 text-purple-700 font-mono"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500 mb-1">ブロック</div>
      {BLOCK_OPTIONS.map(opt => (
        <button
          key={opt.kind}
          onClick={() => { onSelect(createDefaultNode(opt.kind)); onClose(); }}
          className="block w-full text-left px-2 py-1.5 text-sm rounded hover:bg-gray-100"
        >
          <span className="font-mono text-blue-600">{opt.label}</span>
          <span className="text-gray-400 ml-2 text-xs">{opt.description}</span>
        </button>
      ))}
    </div>
  );
}
