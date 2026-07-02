import { TypeNode, NodeId, SlotRef } from './types';
import { getAllIds, mapChildren } from './nodes';

export function findNode(root: TypeNode | null, id: NodeId): TypeNode | null {
  // 単一スロット(array/keyofなど)の子は × ボタンや取り外しで null になりうる
  if (!root) return null;
  if (root.id === id) return root;
  switch (root.kind) {
    case 'object': for (const p of root.props) { const r = findNode(p.value, id); if (r) return r; } break;
    case 'union': for (const m of root.members) { const r = findNode(m, id); if (r) return r; } break;
    case 'intersection': for (const m of root.members) { const r = findNode(m, id); if (r) return r; } break;
    case 'tuple': for (const e of root.elements) { const r = findNode(e, id); if (r) return r; } break;
    case 'array': return findNode(root.element, id);
    case 'keyof': return findNode(root.target, id);
    case 'indexedAccess': { const r = findNode(root.target, id); if (r) return r; return findNode(root.key, id); }
    case 'mappedType': { const r = findNode(root.keys, id) || findNode(root.source, id); if (r) return r; return findNode(root.value ?? null, id); }
    case 'conditional': {
      const r = findNode(root.check, id) || findNode(root.extends, id) || findNode(root.trueBranch, id) || findNode(root.falseBranch, id);
      if (r) return r;
      break;
    }
    case 'templateLiteral': for (const p of root.parts) { if (typeof p !== 'string') { const r = findNode(p, id); if (r) return r; } } break;
    case 'rest': return findNode(root.target, id);
    case 'functionType': { const r = findNode(root.params, id); if (r) return r; return findNode(root.returnType, id); }
  }
  return null;
}

function removeNode(root: TypeNode, id: NodeId): [TypeNode | null, TypeNode | null] {
  // returns [newRoot, extracted]
  if (root.id === id) return [null, root];

  function clone(n: TypeNode): TypeNode {
    return JSON.parse(JSON.stringify(n));
  }

  let extracted: TypeNode | null = null;

  function remove(node: TypeNode): TypeNode | null {
    if (!node) return node;
    switch (node.kind) {
      case 'object': {
        const newProps = node.props.map(p => {
          if (p.value?.id === id) { extracted = p.value; return null; }
          const v = p.value ? remove(p.value) : p.value;
          return { ...p, value: v ?? p.value };
        }).filter((p): p is { key: string; value: TypeNode; optional?: boolean } => p !== null);
        return { ...node, props: newProps };
      }
      case 'union': {
        const members = node.members.map(m => {
          if (m.id === id) { extracted = m; return null; }
          return remove(m) ?? m;
        }).filter((m): m is TypeNode => m !== null);
        return { ...node, members };
      }
      case 'intersection': {
        const members = node.members.map(m => {
          if (m.id === id) { extracted = m; return null; }
          return remove(m) ?? m;
        }).filter((m): m is TypeNode => m !== null);
        return { ...node, members };
      }
      case 'tuple': {
        const elements = node.elements.map(e => {
          if (e.id === id) { extracted = e; return null; }
          return remove(e) ?? e;
        }).filter((e): e is TypeNode => e !== null);
        return { ...node, elements };
      }
      case 'array': {
        if (node.element?.id === id) { extracted = node.element; return { ...node, element: null as unknown as TypeNode }; }
        const el = node.element ? remove(node.element) : null; return el ? { ...node, element: el } : node;
      }
      case 'keyof': {
        if (node.target?.id === id) { extracted = node.target; return { ...node, target: null as unknown as TypeNode }; }
        const t = node.target ? remove(node.target) : null; return t ? { ...node, target: t } : node;
      }
      case 'indexedAccess': {
        if (node.target?.id === id) { extracted = node.target; return { ...node, target: null as unknown as TypeNode }; }
        if (node.key?.id === id) { extracted = node.key; return { ...node, key: null as unknown as TypeNode }; }
        const t = node.target ? remove(node.target) : null;
        const k = node.key ? remove(node.key) : null;
        return { ...node, target: t ?? node.target, key: k ?? node.key };
      }
      case 'mappedType': {
        if (node.keys?.id === id) { extracted = node.keys; return { ...node, keys: null as unknown as TypeNode }; }
        if (node.source?.id === id) { extracted = node.source; return { ...node, source: null }; }
        if (node.value?.id === id) { extracted = node.value; return { ...node, value: null }; }
        const keys = node.keys ? remove(node.keys) : null;
        const src = node.source ? remove(node.source) : null;
        const val = node.value ? remove(node.value) : null;
        return { ...node, keys: keys ?? node.keys, source: src ?? node.source, value: val ?? node.value };
      }
      case 'conditional': {
        const slots = ['check', 'extends', 'trueBranch', 'falseBranch'] as const;
        let updated: TypeNode = node;
        for (const slot of slots) {
          const child = (node as unknown as Record<string, TypeNode | null>)[slot];
          if (!child) continue;
          if (child.id === id) { extracted = child; updated = { ...updated, [slot]: null }; continue; }
          const r = remove(child);
          if (r) updated = { ...updated, [slot]: r };
        }
        return updated;
      }
      case 'templateLiteral': {
        const parts = node.parts.map(p => {
          if (!p || typeof p === 'string') return p;
          if (p.id === id) { extracted = p; return null; }
          return remove(p) ?? p;
        }).filter((p): p is string | TypeNode => p !== null);
        return { ...node, parts };
      }
      case 'rest': {
        if (node.target?.id === id) { extracted = node.target; return { ...node, target: null as unknown as TypeNode }; }
        const t = node.target ? remove(node.target) : null; return t ? { ...node, target: t } : node;
      }
      case 'functionType': {
        if (node.params?.id === id) { extracted = node.params; return { ...node, params: null as unknown as TypeNode }; }
        if (node.returnType?.id === id) { extracted = node.returnType; return { ...node, returnType: null as unknown as TypeNode }; }
        const p = node.params ? remove(node.params) : null;
        const rt = node.returnType ? remove(node.returnType) : null;
        return { ...node, params: p ?? node.params, returnType: rt ?? node.returnType };
      }
    }
    return node;
  }

  const newRoot = remove(clone(root));
  return [newRoot, extracted];
}

function insertAt(root: TypeNode | null, target: SlotRef, node: TypeNode, propKey?: string): [TypeNode | null, TypeNode | null] {
  // returns [newRoot, displaced] - displaced is non-null on swap
  if (target.kind === 'root') {
    return [node, root];
  }

  let displaced: TypeNode | null = null;

  function insert(n: TypeNode): TypeNode {
    if ((n as unknown) === null) return n;
    if (target.kind === 'single' && n.id === target.parentId) {
      const slot = target.slot;
      const existing = (n as unknown as Record<string, TypeNode>)[slot] as TypeNode | null;
      if (existing && existing.id) { displaced = existing; }
      return { ...n, [slot]: node };
    }
    if ((target.kind === 'list' || target.kind === 'listAppend') && n.id === target.parentId) {
      const slot = target.slot;
      if ((n.kind === 'union' || n.kind === 'intersection') && slot === 'members') {
        const arr = [...n.members];
        if (target.kind === 'listAppend') arr.push(node);
        else arr.splice(target.index, 0, node);
        return { ...n, members: arr };
      }
      if (n.kind === 'tuple' && slot === 'elements') {
        const arr = [...n.elements];
        if (target.kind === 'listAppend') arr.push(node);
        else arr.splice(target.index, 0, node);
        return { ...n, elements: arr };
      }
      if (n.kind === 'object' && slot === 'props') {
        const arr = [...n.props];
        const newProp = { key: propKey ?? 'newKey', value: node };
        if (target.kind === 'listAppend') arr.push(newProp);
        else arr.splice(target.index, 0, newProp);
        return { ...n, props: arr };
      }
      if (n.kind === 'templateLiteral' && slot === 'parts') {
        const arr = [...n.parts];
        if (target.kind === 'listAppend') arr.push(node);
        else arr.splice(target.index, 0, node);
        return { ...n, parts: arr };
      }
    }
    return mapChildren(n, insert);
  }

  const newRoot = root ? insert(JSON.parse(JSON.stringify(root))) : null;
  return [newRoot, displaced];
}

export function canDrop(root: TypeNode | null, draggedId: NodeId, target: SlotRef): boolean {
  if (!root) return target.kind === 'root';
  const dragged = findNode(root, draggedId);
  if (!dragged) return false;
  const descendantIds = getAllIds(dragged);

  if (target.kind === 'root') return true;
  if (descendantIds.has(target.parentId)) return false;

  // 単一スロットの現在の占有者が dragged の祖先の場合、追い出された占有者の
  // 戻し先(draggedの元位置)が占有者自身の中になり成立しないため禁止する
  if (target.kind === 'single') {
    const parent = findNode(root, target.parentId);
    if (parent) {
      const occupant = (parent as unknown as Record<string, TypeNode | null>)[target.slot] ?? null;
      if (occupant && occupant.id !== draggedId && getAllIds(occupant).has(draggedId)) return false;
    }
  }
  return true;
}

/** dragged が object のプロパティ値だった場合、そのキー名を返す */
function getPropKey(root: TypeNode, slot: SlotRef | null): string | undefined {
  if (!slot || slot.kind !== 'list' || slot.slot !== 'props') return undefined;
  const parent = findNode(root, slot.parentId);
  if (!parent || parent.kind !== 'object') return undefined;
  return parent.props[slot.index]?.key;
}

export function moveNode(root: TypeNode | null, draggedId: NodeId, target: SlotRef): TypeNode | null {
  if (!root) return null;

  const [afterRemove, extracted] = removeNode(root, draggedId);
  if (!extracted) return root;

  const originalSlot = findParentSlot(root, draggedId);
  const originalKey = getPropKey(root, originalSlot);
  const adjustedTarget = adjustTargetIndex(target, draggedId, root);
  const [newRoot, displaced] = insertAt(afterRemove, adjustedTarget, extracted, originalKey);

  if (!displaced) return newRoot;

  // put displaced back where dragged was - find original parent slot
  if (!originalSlot) return root; // 戻し先がない = displaced が消えるので移動をキャンセル

  const [finalRoot] = insertAt(newRoot, originalSlot, displaced, originalKey);
  // 戻し先が displaced 自身の内部だった等で復元できなかった場合も移動をキャンセル
  if (!finalRoot || !findNode(finalRoot, displaced.id)) return root;
  return finalRoot;
}

function adjustTargetIndex(target: SlotRef, draggedId: NodeId, root: TypeNode): SlotRef {
  if (target.kind !== 'list') return target;
  // When moving within the same list, if original index < target index, offset by -1
  const parentNode = findNode(root, target.parentId);
  if (!parentNode) return target;

  let originalIndex = -1;
  if ((parentNode.kind === 'union' || parentNode.kind === 'intersection') && target.slot === 'members') {
    originalIndex = parentNode.members.findIndex(m => m.id === draggedId);
  } else if (parentNode.kind === 'tuple' && target.slot === 'elements') {
    originalIndex = parentNode.elements.findIndex(e => e.id === draggedId);
  } else if (parentNode.kind === 'object' && target.slot === 'props') {
    originalIndex = parentNode.props.findIndex(p => p.value?.id === draggedId);
  } else if (parentNode.kind === 'templateLiteral' && target.slot === 'parts') {
    originalIndex = parentNode.parts.findIndex(p => typeof p !== 'string' && p?.id === draggedId);
  }

  if (originalIndex >= 0 && originalIndex < target.index) {
    return { ...target, index: target.index - 1 };
  }
  return target;
}

function findParentSlot(root: TypeNode, childId: NodeId): SlotRef | null {
  function search(node: TypeNode | null): SlotRef | null {
    if (!node) return null;
    switch (node.kind) {
      case 'object': {
        for (let i = 0; i < node.props.length; i++) {
          if (node.props[i].value?.id === childId) return { kind: 'list', parentId: node.id, slot: 'props', index: i };
          const r = search(node.props[i].value); if (r) return r;
        }
        break;
      }
      case 'union':
      case 'intersection': {
        for (let i = 0; i < node.members.length; i++) {
          if (node.members[i].id === childId) return { kind: 'list', parentId: node.id, slot: 'members', index: i };
          const r = search(node.members[i]); if (r) return r;
        }
        break;
      }
      case 'tuple': {
        for (let i = 0; i < node.elements.length; i++) {
          if (node.elements[i].id === childId) return { kind: 'list', parentId: node.id, slot: 'elements', index: i };
          const r = search(node.elements[i]); if (r) return r;
        }
        break;
      }
      case 'array': {
        if (node.element?.id === childId) return { kind: 'single', parentId: node.id, slot: 'element' };
        return search(node.element);
      }
      case 'keyof': {
        if (node.target?.id === childId) return { kind: 'single', parentId: node.id, slot: 'target' };
        return search(node.target);
      }
      case 'indexedAccess': {
        if (node.target?.id === childId) return { kind: 'single', parentId: node.id, slot: 'target' };
        if (node.key?.id === childId) return { kind: 'single', parentId: node.id, slot: 'key' };
        return search(node.target) || search(node.key);
      }
      case 'mappedType': {
        if (node.keys?.id === childId) return { kind: 'single', parentId: node.id, slot: 'keys' };
        if (node.source?.id === childId) return { kind: 'single', parentId: node.id, slot: 'source' };
        if (node.value?.id === childId) return { kind: 'single', parentId: node.id, slot: 'value' };
        return search(node.keys) || search(node.source) || search(node.value ?? null);
      }
      case 'conditional': {
        const slots = ['check', 'extends', 'trueBranch', 'falseBranch'] as const;
        for (const slot of slots) {
          const child = (node as unknown as Record<string, TypeNode | null>)[slot];
          if (child?.id === childId) return { kind: 'single', parentId: node.id, slot };
          const r = search(child); if (r) return r;
        }
        break;
      }
      case 'templateLiteral': {
        for (let i = 0; i < node.parts.length; i++) {
          const p = node.parts[i];
          if (p && typeof p !== 'string') {
            if (p.id === childId) return { kind: 'list', parentId: node.id, slot: 'parts', index: i };
            const r = search(p); if (r) return r;
          }
        }
        break;
      }
      case 'rest': {
        if (node.target?.id === childId) return { kind: 'single', parentId: node.id, slot: 'target' };
        return search(node.target);
      }
      case 'functionType': {
        if (node.params?.id === childId) return { kind: 'single', parentId: node.id, slot: 'params' };
        if (node.returnType?.id === childId) return { kind: 'single', parentId: node.id, slot: 'returnType' };
        return search(node.params) || search(node.returnType);
      }
    }
    return null;
  }
  return search(root);
}

export function deleteNode(root: TypeNode | null, id: NodeId): TypeNode | null {
  if (!root) return null;
  const [newRoot] = removeNode(root, id);
  return newRoot;
}

/** パレットからの新規ノードをスロットに配置する。既存ノードは上書き(破棄)。 */
export function placeNode(root: TypeNode | null, target: SlotRef, node: TypeNode): TypeNode | null {
  if (target.kind === 'root') return node;
  const [newRoot] = insertAt(root, target, node);
  return newRoot;
}

export function serializeSlotRef(ref: SlotRef): string {
  return JSON.stringify(ref);
}

export function deserializeSlotRef(s: string): SlotRef {
  return JSON.parse(s);
}
