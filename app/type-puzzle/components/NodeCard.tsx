'use client';

import { useState, useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { TypeNode, NodeId, SlotRef, TypeResultMap } from '../lib/types';
import { newId, collectInferNamesInExtends } from '../lib/nodes';
import { serializeSlotRef } from '../lib/tree-ops';
import BlockPalette from './BlockPalette';
import { useDragState } from './DragStateContext';

interface SlotProps {
  slotRef: SlotRef;
  node: TypeNode | null;
  label?: string;
  onSet: (node: TypeNode) => void;
  onRemove?: () => void;
  rootNode: TypeNode | null;
  inferNames?: string[];
  refNames?: string[];
  insideExtends?: boolean;
  typeResult?: TypeResultMap;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
}

function Slot({ slotRef, node, label, onSet, onRemove, rootNode, inferNames = [], refNames = [], insideExtends = false, typeResult, onNodeUpdate }: SlotProps) {
  const [showPalette, setShowPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const slotId = serializeSlotRef(slotRef);

  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: slotId });
  const { isDragging, checkValidity } = useDragState();
  const validity = isDragging ? checkValidity(slotRef, !!node) : 'inactive';

  // クラスの計算
  const wrapperClass = (() => {
    if (!isDragging) return 'relative';
    const base = 'relative rounded transition-all duration-150';
    if (isOver) {
      if (validity === 'valid-empty') return `${base} ring-2 ring-blue-500 bg-blue-50 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]`;
      if (validity === 'valid-swap') return `${base} ring-2 ring-amber-400 bg-amber-50 shadow-[0_0_0_4px_rgba(251,191,36,0.15)]`;
      if (validity === 'invalid')   return `${base} ring-2 ring-red-400 bg-red-50`;
    }
    // ドラッグ中だがhoverしていない: 有効スロットをうっすら示す
    if (validity === 'valid-empty' || validity === 'valid-swap') return `${base} ring-1 ring-blue-200`;
    return base;
  })();

  if (node) {
    return (
      <div ref={setDropRef} className={wrapperClass}>
        {isOver && validity === 'valid-swap' && (
          <div className="absolute -top-4 left-0 z-10 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-300 rounded px-1 py-0.5 whitespace-nowrap">
            ↔ 入れ替え
          </div>
        )}
        {isOver && validity === 'invalid' && (
          <div className="absolute -top-4 left-0 z-10 text-xs text-red-600 bg-red-50 border border-red-300 rounded px-1 py-0.5 whitespace-nowrap">
            × ドロップ不可
          </div>
        )}
        {label && <span className="text-xs text-gray-400 mr-1">{label}:</span>}
        <NodeCard
          node={node}
          rootNode={rootNode}
          onRemove={onRemove}
          inferNames={inferNames}
          refNames={refNames}
          insideExtends={insideExtends}
          typeResult={typeResult}
          onNodeUpdate={onNodeUpdate}
          onSet={onSet}
        />
      </div>
    );
  }

  // 空スロット
  const emptyButtonClass = (() => {
    if (isOver && validity === 'valid-empty')
      return 'px-2 py-1 text-xs border-2 border-blue-500 rounded text-blue-600 bg-blue-50 font-medium';
    if (isDragging && (validity === 'valid-empty' || validity === 'valid-swap'))
      return 'px-2 py-1 text-xs border border-dashed border-blue-300 rounded text-blue-400 bg-blue-50/50';
    return 'px-2 py-1 text-xs border border-dashed border-gray-300 rounded text-gray-400 hover:border-blue-400 hover:text-blue-500 bg-gray-50';
  })();

  return (
    <div ref={setDropRef} className={`${wrapperClass} inline-block`}>
      {label && <span className="text-xs text-gray-400 mr-1">{label}:</span>}
      <div className="relative">
        <button
          onClick={() => setShowPalette(s => !s)}
          className={emptyButtonClass}
        >
          {isOver && validity === 'valid-empty' ? 'ここにドロップ' : '+ ブロックを選ぶ'}
        </button>
        {showPalette && (
          <div ref={paletteRef}>
            <BlockPalette
              onSelect={onSet}
              onClose={() => setShowPalette(false)}
              inferNames={inferNames}
              refNames={refNames}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface NodeCardProps {
  node: TypeNode;
  rootNode: TypeNode | null;
  onRemove?: () => void;
  inferNames?: string[];
  refNames?: string[];
  insideExtends?: boolean;
  typeResult?: TypeResultMap;
  onNodeUpdate: (id: NodeId, updater: (node: TypeNode) => TypeNode) => void;
  onSet?: (node: TypeNode) => void;
  isRoot?: boolean;
}

const KIND_COLORS: Record<string, string> = {
  object: 'bg-amber-50 border-amber-200',
  primitive: 'bg-green-50 border-green-200',
  literal: 'bg-lime-50 border-lime-200',
  union: 'bg-purple-50 border-purple-200',
  intersection: 'bg-fuchsia-50 border-fuchsia-200',
  tuple: 'bg-indigo-50 border-indigo-200',
  array: 'bg-cyan-50 border-cyan-200',
  keyof: 'bg-sky-50 border-sky-200',
  indexedAccess: 'bg-teal-50 border-teal-200',
  mappedType: 'bg-orange-50 border-orange-200',
  conditional: 'bg-rose-50 border-rose-200',
  infer: 'bg-violet-50 border-violet-200',
  templateLiteral: 'bg-pink-50 border-pink-200',
  ref: 'bg-blue-50 border-blue-200',
};

export default function NodeCard({ node, rootNode, onRemove, inferNames = [], refNames = [], insideExtends = false, typeResult, onNodeUpdate, onSet, isRoot = false }: NodeCardProps) {
  const colorClass = KIND_COLORS[node.kind] ?? 'bg-gray-50 border-gray-200';
  const result = typeResult?.[node.id];

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.id,
    disabled: isRoot,
  });

  function makeSlotProps(slotRef: SlotRef, child: TypeNode | null, label?: string, removeChild?: () => void, opts?: { insideExtends?: boolean; inferNamesOverride?: string[] }): SlotProps {
    return {
      slotRef,
      node: child,
      label,
      onSet: (n) => onNodeUpdate(node.id, (cur) => setSlot(cur, slotRef, n)),
      onRemove: removeChild,
      rootNode,
      inferNames: opts?.inferNamesOverride ?? inferNames,
      refNames,
      insideExtends: opts?.insideExtends ?? insideExtends,
      typeResult,
      onNodeUpdate,
    };
  }

  function setSlot(cur: TypeNode, slotRef: SlotRef, newNode: TypeNode): TypeNode {
    if (slotRef.kind === 'single') {
      return { ...cur, [slotRef.slot]: newNode } as TypeNode;
    }
    return cur;
  }

  const cardStyle = `relative border rounded-lg p-2 mb-1 ${colorClass}`;

  function renderContent() {
    switch (node.kind) {
      case 'primitive':
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-green-700">Primitive</span>
            <select
              value={node.name}
              onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, name: e.target.value } as TypeNode))}
              className="text-xs border border-green-200 rounded px-1 bg-white"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="never">never</option>
              <option value="any">any</option>
              <option value="unknown">unknown</option>
            </select>
          </div>
        );

      case 'literal':
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-lime-700">Literal</span>
            <input
              value={String(node.value)}
              onChange={e => {
                let v: string | number | boolean = e.target.value;
                if (v === 'true') v = true;
                else if (v === 'false') v = false;
                else if (!isNaN(Number(v)) && v !== '') v = Number(v);
                onNodeUpdate(node.id, cur => ({ ...cur, value: v } as TypeNode));
              }}
              className="text-xs border border-lime-200 rounded px-1 w-24 bg-white font-mono"
            />
          </div>
        );

      case 'object':
        return (
          <div>
            <div className="text-xs font-semibold text-amber-700 mb-1">Object</div>
            {node.props.map((prop, i) => (
              <div key={i} className="flex items-start gap-1 mb-1 ml-2">
                <div className="flex items-center gap-1 mt-1">
                  <input
                    value={prop.key}
                    onChange={e => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'object') return cur;
                      const props = [...cur.props];
                      props[i] = { ...props[i], key: e.target.value };
                      return { ...cur, props };
                    })}
                    className="text-xs border border-amber-200 rounded px-1 w-20 bg-white font-mono"
                  />
                  <label className="text-xs flex items-center gap-0.5">
                    <input type="checkbox" checked={!!prop.optional} onChange={e => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'object') return cur;
                      const props = [...cur.props];
                      props[i] = { ...props[i], optional: e.target.checked };
                      return { ...cur, props };
                    })} className="w-3 h-3" />
                    <span className="text-amber-600">?</span>
                  </label>
                  <span className="text-xs text-gray-400">:</span>
                </div>
                <Slot
                  {...makeSlotProps(
                    { kind: 'list', parentId: node.id, slot: 'props', index: i },
                    prop.value,
                    undefined,
                    () => onNodeUpdate(node.id, cur => {
                      if (cur.kind !== 'object') return cur;
                      return { ...cur, props: cur.props.filter((_, j) => j !== i) };
                    })
                  )}
                />
              </div>
            ))}
            <button
              onClick={() => onNodeUpdate(node.id, cur => {
                if (cur.kind !== 'object') return cur;
                return { ...cur, props: [...cur.props, { key: 'key', value: { id: newId(), kind: 'primitive', name: 'string' } }] };
              })}
              className="text-xs text-amber-600 hover:text-amber-800 ml-2"
            >
              + プロパティ追加
            </button>
          </div>
        );

      case 'union':
        return (
          <div>
            <div className="text-xs font-semibold text-purple-700 mb-1">Union (|)</div>
            <div className="ml-2 flex flex-wrap gap-1 items-center">
              {node.members.map((m, i) => (
                <div key={m.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-purple-400 font-bold">|</span>}
                  <Slot
                    {...makeSlotProps(
                      { kind: 'list', parentId: node.id, slot: 'members', index: i },
                      m,
                      undefined,
                      () => onNodeUpdate(node.id, cur => {
                        if (cur.kind !== 'union') return cur;
                        return { ...cur, members: cur.members.filter((_, j) => j !== i) };
                      })
                    )}
                  />
                </div>
              ))}
              <Slot
                {...makeSlotProps(
                  { kind: 'listAppend', parentId: node.id, slot: 'members' },
                  null,
                  undefined,
                  undefined
                )}
              />
            </div>
          </div>
        );

      case 'intersection':
        return (
          <div>
            <div className="text-xs font-semibold text-fuchsia-700 mb-1">Intersection (&)</div>
            <div className="ml-2 flex flex-wrap gap-1 items-center">
              {node.members.map((m, i) => (
                <div key={m.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-fuchsia-400 font-bold">&</span>}
                  <Slot
                    {...makeSlotProps(
                      { kind: 'list', parentId: node.id, slot: 'members', index: i },
                      m,
                      undefined,
                      () => onNodeUpdate(node.id, cur => {
                        if (cur.kind !== 'intersection') return cur;
                        return { ...cur, members: cur.members.filter((_, j) => j !== i) };
                      })
                    )}
                  />
                </div>
              ))}
              <Slot
                {...makeSlotProps(
                  { kind: 'listAppend', parentId: node.id, slot: 'members' },
                  null,
                  undefined,
                  undefined
                )}
              />
            </div>
          </div>
        );

      case 'tuple':
        return (
          <div>
            <div className="text-xs font-semibold text-indigo-700 mb-1">Tuple</div>
            <div className="ml-2 flex flex-wrap gap-1 items-center">
              {node.elements.map((e, i) => (
                <div key={e.id} className="flex items-center gap-1">
                  {i > 0 && <span className="text-indigo-300">,</span>}
                  <Slot
                    {...makeSlotProps(
                      { kind: 'list', parentId: node.id, slot: 'elements', index: i },
                      e,
                      undefined,
                      () => onNodeUpdate(node.id, cur => {
                        if (cur.kind !== 'tuple') return cur;
                        return { ...cur, elements: cur.elements.filter((_, j) => j !== i) };
                      })
                    )}
                  />
                </div>
              ))}
              <Slot
                {...makeSlotProps(
                  { kind: 'listAppend', parentId: node.id, slot: 'elements' },
                  null
                )}
              />
            </div>
          </div>
        );

      case 'array':
        return (
          <div>
            <div className="text-xs font-semibold text-cyan-700 mb-1">Array (T[])</div>
            <div className="ml-2 flex items-center gap-1">
              <Slot
                {...makeSlotProps(
                  { kind: 'single', parentId: node.id, slot: 'element' },
                  node.element,
                  '要素',
                  () => onNodeUpdate(node.id, cur => ({ ...cur, element: null } as unknown as TypeNode))
                )}
              />
              <span className="text-cyan-500 font-mono text-sm">[]</span>
            </div>
          </div>
        );

      case 'keyof':
        return (
          <div>
            <div className="text-xs font-semibold text-sky-700 mb-1">keyof</div>
            <div className="ml-2">
              <Slot
                {...makeSlotProps(
                  { kind: 'single', parentId: node.id, slot: 'target' },
                  node.target,
                  '対象',
                  () => onNodeUpdate(node.id, cur => ({ ...cur, target: null } as unknown as TypeNode))
                )}
              />
            </div>
          </div>
        );

      case 'indexedAccess':
        return (
          <div>
            <div className="text-xs font-semibold text-teal-700 mb-1">T[K]</div>
            <div className="ml-2 flex flex-wrap gap-2">
              <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'target' }, node.target, '対象')} />
              <span className="text-teal-500 font-mono">[</span>
              <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'key' }, node.key, 'キー')} />
              <span className="text-teal-500 font-mono">]</span>
            </div>
          </div>
        );

      case 'mappedType':
        return (
          <div>
            <div className="text-xs font-semibold text-orange-700 mb-1">Mapped Type</div>
            <div className="ml-2 space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">キー集合:</span>
                <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'keys' }, node.keys)} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">元のobject:</span>
                <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'source' }, node.source)} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">変換:</span>
                <select
                  value={node.transform}
                  onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, transform: e.target.value } as TypeNode))}
                  className="text-xs border border-orange-200 rounded px-1 bg-white"
                >
                  <option value="keep">そのまま</option>
                  <option value="array">配列化</option>
                  <option value="optional">optional化</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'conditional': {
        const extendsInferNames = collectInferNamesInExtends(node.extends);
        const allInferNames = [...inferNames, ...extendsInferNames];
        return (
          <div>
            <div className="text-xs font-semibold text-rose-700 mb-1">Conditional Type</div>
            <div className="ml-2 space-y-1">
              <div className="flex items-center gap-1 flex-wrap">
                <Slot {...makeSlotProps({ kind: 'single', parentId: node.id, slot: 'check' }, node.check, 'check')} />
                <span className="text-xs text-rose-500 font-mono">extends</span>
                <Slot {...makeSlotProps(
                  { kind: 'single', parentId: node.id, slot: 'extends' },
                  node.extends,
                  'extends',
                  undefined,
                  { insideExtends: true }
                )} />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-rose-500 font-mono">?</span>
                <Slot {...makeSlotProps(
                  { kind: 'single', parentId: node.id, slot: 'trueBranch' },
                  node.trueBranch,
                  'true',
                  undefined,
                  { inferNamesOverride: allInferNames }
                )} />
                <span className="text-xs text-rose-500 font-mono">:</span>
                <Slot {...makeSlotProps(
                  { kind: 'single', parentId: node.id, slot: 'falseBranch' },
                  node.falseBranch,
                  'false',
                  undefined,
                  { inferNamesOverride: allInferNames }
                )} />
              </div>
            </div>
          </div>
        );
      }

      case 'infer':
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-violet-700">infer</span>
            {insideExtends ? (
              <input
                value={node.name}
                onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, name: e.target.value } as TypeNode))}
                className="text-xs border border-violet-200 rounded px-1 w-16 bg-white font-mono"
                placeholder="R"
              />
            ) : (
              <select
                value={node.name}
                onChange={e => onNodeUpdate(node.id, cur => ({ ...cur, name: e.target.value } as TypeNode))}
                className="text-xs border border-violet-200 rounded px-1 bg-white font-mono"
              >
                {inferNames.length === 0 && <option value={node.name}>{node.name}</option>}
                {inferNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
        );

      case 'templateLiteral':
        return (
          <div>
            <div className="text-xs font-semibold text-pink-700 mb-1">Template Literal</div>
            <div className="ml-2 flex flex-wrap gap-1 items-center">
              <span className="text-pink-400 font-mono">`</span>
              {node.parts.map((part, i) => (
                <div key={i} className="flex items-center gap-1">
                  {typeof part === 'string' ? (
                    <input
                      value={part}
                      onChange={e => onNodeUpdate(node.id, cur => {
                        if (cur.kind !== 'templateLiteral') return cur;
                        const parts = [...cur.parts];
                        parts[i] = e.target.value;
                        return { ...cur, parts };
                      })}
                      className="text-xs border border-pink-200 rounded px-1 w-16 bg-white font-mono"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-pink-400 font-mono">{'${'}</span>
                      <Slot
                        {...makeSlotProps(
                          { kind: 'list', parentId: node.id, slot: 'parts', index: i },
                          part,
                          undefined,
                          () => onNodeUpdate(node.id, cur => {
                            if (cur.kind !== 'templateLiteral') return cur;
                            return { ...cur, parts: cur.parts.filter((_, j) => j !== i) };
                          })
                        )}
                      />
                      <span className="text-pink-400 font-mono">{'}'}</span>
                    </div>
                  )}
                </div>
              ))}
              <span className="text-pink-400 font-mono">`</span>
              <div className="flex gap-1">
                <button onClick={() => onNodeUpdate(node.id, cur => {
                  if (cur.kind !== 'templateLiteral') return cur;
                  return { ...cur, parts: [...cur.parts, ''] };
                })} className="text-xs text-pink-600 hover:text-pink-800">+文字</button>
                <button onClick={() => onNodeUpdate(node.id, cur => {
                  if (cur.kind !== 'templateLiteral') return cur;
                  return { ...cur, parts: [...cur.parts, { id: newId(), kind: 'primitive', name: 'string' }] };
                })} className="text-xs text-pink-600 hover:text-pink-800">+型</button>
              </div>
            </div>
          </div>
        );

      case 'ref':
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-700">ref</span>
            <span className="text-xs font-mono text-blue-600">{node.name}</span>
          </div>
        );

      default:
        return <div className="text-xs text-gray-400">unknown</div>;
    }
  }

  return (
    <div ref={setDragRef} className={cardStyle} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isRoot && (
            <button
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-1 touch-none"
              title="ドラッグして移動"
            >
              ≡
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="text-gray-300 hover:text-red-400 px-1" title="削除">×</button>
          )}
        </div>
      </div>
      {!insideExtends && result && (
        result.errors.length > 0 ? (
          <div className="relative group mt-1">
            <div className="flex items-center gap-1 text-xs font-mono rounded px-1 py-0.5 bg-red-50 text-red-500 cursor-help">
              <span className="font-bold shrink-0 text-red-600">!</span>
              <span className="truncate">{result.errors[0].split('\n')[0]}</span>
            </div>
            <div className="absolute left-0 top-full mt-1 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-80 max-h-48 overflow-y-auto bg-gray-900 text-red-300 text-xs font-mono rounded-lg p-3 shadow-xl whitespace-pre-wrap break-all pointer-events-none">
              {result.errors.join('\n\n')}
            </div>
          </div>
        ) : (
          <div className="relative group mt-1">
            <div className="text-xs font-mono rounded px-1 py-0.5 bg-white text-gray-500 border border-gray-100 truncate cursor-default">
              <span className="text-gray-400">→</span> {result.displayString}
            </div>
            {result.displayString.length > 30 && (
              <div className="absolute left-0 top-full mt-1 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-150 w-80 max-h-48 overflow-y-auto bg-gray-900 text-green-300 text-xs font-mono rounded-lg p-3 shadow-xl whitespace-pre-wrap break-all pointer-events-none">
                {result.displayString}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
