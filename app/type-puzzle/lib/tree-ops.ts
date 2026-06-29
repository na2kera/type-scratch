import { TypeNode, NodeId, SlotRef } from './types';
import { getAllIds } from './nodes';

function findNode(root: TypeNode, id: NodeId): TypeNode | null {
  if (root.id === id) return root;
  switch (root.kind) {
    case 'object': for (const p of root.props) { const r = findNode(p.value, id); if (r) return r; } break;
    case 'union': for (const m of root.members) { const r = findNode(m, id); if (r) return r; } break;
    case 'tuple': for (const e of root.elements) { const r = findNode(e, id); if (r) return r; } break;
    case 'array': return findNode(root.element, id);
    case 'keyof': return findNode(root.target, id);
    case 'indexedAccess': { const r = findNode(root.target, id); if (r) return r; return findNode(root.key, id); }
    case 'mappedType': { const r = findNode(root.keys, id); if (r) return r; return findNode(root.source, id); }
    case 'conditional': {
      const r = findNode(root.check, id) || findNode(root.extends, id) || findNode(root.trueBranch, id) || findNode(root.falseBranch, id);
      if (r) return r;
      break;
    }
    case 'templateLiteral': for (const p of root.parts) { if (typeof p !== 'string') { const r = findNode(p, id); if (r) return r; } } break;
  }
  return null;
}

type MutableNode = TypeNode & Record<string, unknown>;

function removeNode(root: TypeNode, id: NodeId): [TypeNode | null, TypeNode | null] {
  // returns [newRoot, extracted]
  if (root.id === id) return [null, root];

  function clone(n: TypeNode): TypeNode {
    return JSON.parse(JSON.stringify(n));
  }

  let extracted: TypeNode | null = null;

  function remove(node: TypeNode): TypeNode | null {
    switch (node.kind) {
      case 'object': {
        const newProps = node.props.map(p => {
          if (p.value.id === id) { extracted = p.value; return { ...p, value: null as unknown as TypeNode }; }
          const v = remove(p.value);
          return { ...p, value: v ?? p.value };
        }).filter(p => p.value !== null);
        return { ...node, props: newProps as typeof node.props };
      }
      case 'union': {
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
        if (node.element.id === id) { extracted = node.element; return { ...node, element: null as unknown as TypeNode }; }
        const el = remove(node.element); return el ? { ...node, element: el } : node;
      }
      case 'keyof': {
        if (node.target.id === id) { extracted = node.target; return { ...node, target: null as unknown as TypeNode }; }
        const t = remove(node.target); return t ? { ...node, target: t } : node;
      }
      case 'indexedAccess': {
        if (node.target.id === id) { extracted = node.target; return { ...node, target: null as unknown as TypeNode }; }
        if (node.key.id === id) { extracted = node.key; return { ...node, key: null as unknown as TypeNode }; }
        const t = remove(node.target);
        const k = remove(node.key);
        return { ...node, target: t ?? node.target, key: k ?? node.key };
      }
      case 'mappedType': {
        if (node.keys.id === id) { extracted = node.keys; return { ...node, keys: null as unknown as TypeNode }; }
        if (node.source.id === id) { extracted = node.source; return { ...node, source: null as unknown as TypeNode }; }
        const keys = remove(node.keys);
        const src = remove(node.source);
        return { ...node, keys: keys ?? node.keys, source: src ?? node.source };
      }
      case 'conditional': {
        const slots = ['check', 'extends', 'trueBranch', 'falseBranch'] as const;
        let updated: TypeNode = node;
        for (const slot of slots) {
          const child = (node as unknown as Record<string, TypeNode>)[slot];
          if (child.id === id) { extracted = child; updated = { ...updated, [slot]: null }; continue; }
          const r = remove(child);
          if (r) updated = { ...updated, [slot]: r };
        }
        return updated;
      }
      case 'templateLiteral': {
        const parts = node.parts.map(p => {
          if (typeof p === 'string') return p;
          if (p.id === id) { extracted = p; return null; }
          return remove(p) ?? p;
        }).filter((p): p is string | TypeNode => p !== null);
        return { ...node, parts };
      }
    }
    return node;
  }

  const newRoot = remove(clone(root));
  return [newRoot, extracted];
}

function insertAt(root: TypeNode | null, target: SlotRef, node: TypeNode): [TypeNode | null, TypeNode | null] {
  // returns [newRoot, displaced] - displaced is non-null on swap
  if (target.kind === 'root') {
    return [node, root];
  }

  let displaced: TypeNode | null = null;

  function insert(n: TypeNode): TypeNode {
    if (target.kind === 'single' && n.id === target.parentId) {
      const slot = target.slot;
      const existing = (n as unknown as Record<string, TypeNode>)[slot] as TypeNode | null;
      if (existing && existing.id) { displaced = existing; }
      return { ...n, [slot]: node };
    }
    if ((target.kind === 'list' || target.kind === 'listAppend') && n.id === target.parentId) {
      const slot = target.slot;
      if (n.kind === 'union' && slot === 'members') {
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
        const newProp = { key: 'newKey', value: node };
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
    // recurse
    switch (n.kind) {
      case 'object': return { ...n, props: n.props.map(p => ({ ...p, value: insert(p.value) })) };
      case 'union': return { ...n, members: n.members.map(insert) };
      case 'tuple': return { ...n, elements: n.elements.map(insert) };
      case 'array': return { ...n, element: insert(n.element) };
      case 'keyof': return { ...n, target: insert(n.target) };
      case 'indexedAccess': return { ...n, target: insert(n.target), key: insert(n.key) };
      case 'mappedType': return { ...n, keys: insert(n.keys), source: insert(n.source) };
      case 'conditional': return { ...n, check: insert(n.check), extends: insert(n.extends), trueBranch: insert(n.trueBranch), falseBranch: insert(n.falseBranch) };
      case 'templateLiteral': return { ...n, parts: n.parts.map(p => typeof p === 'string' ? p : insert(p)) };
    }
    return n;
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
  return true;
}

export function moveNode(root: TypeNode | null, draggedId: NodeId, target: SlotRef): TypeNode | null {
  if (!root) return null;

  const isSameSlot = (t: SlotRef): boolean => {
    if (t.kind === 'root') return root?.id === draggedId;
    return false;
  };

  const [afterRemove, extracted] = removeNode(root, draggedId);
  if (!extracted) return root;

  const adjustedTarget = adjustTargetIndex(target, draggedId, root, target);
  const [newRoot, displaced] = insertAt(afterRemove, target, extracted);

  if (!displaced) return newRoot;

  // put displaced back where dragged was - find original parent slot
  const originalSlot = findParentSlot(root, draggedId);
  if (!originalSlot) return newRoot;

  const [finalRoot] = insertAt(newRoot, originalSlot, displaced);
  return finalRoot;
}

function adjustTargetIndex(target: SlotRef, draggedId: NodeId, root: TypeNode, _orig: SlotRef): SlotRef {
  if (target.kind !== 'list') return target;
  // When moving within the same list, if original index < target index, offset by -1
  const parentNode = findNode(root, target.parentId);
  if (!parentNode) return target;

  let originalIndex = -1;
  if (parentNode.kind === 'union' && target.slot === 'members') {
    originalIndex = parentNode.members.findIndex(m => m.id === draggedId);
  } else if (parentNode.kind === 'tuple' && target.slot === 'elements') {
    originalIndex = parentNode.elements.findIndex(e => e.id === draggedId);
  }

  if (originalIndex >= 0 && originalIndex < target.index) {
    return { ...target, index: target.index - 1 };
  }
  return target;
}

function findParentSlot(root: TypeNode, childId: NodeId): SlotRef | null {
  function search(node: TypeNode): SlotRef | null {
    switch (node.kind) {
      case 'object': {
        for (let i = 0; i < node.props.length; i++) {
          if (node.props[i].value.id === childId) return { kind: 'list', parentId: node.id, slot: 'props', index: i };
          const r = search(node.props[i].value); if (r) return r;
        }
        break;
      }
      case 'union': {
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
        if (node.element.id === childId) return { kind: 'single', parentId: node.id, slot: 'element' };
        return search(node.element);
      }
      case 'keyof': {
        if (node.target.id === childId) return { kind: 'single', parentId: node.id, slot: 'target' };
        return search(node.target);
      }
      case 'indexedAccess': {
        if (node.target.id === childId) return { kind: 'single', parentId: node.id, slot: 'target' };
        if (node.key.id === childId) return { kind: 'single', parentId: node.id, slot: 'key' };
        return search(node.target) || search(node.key);
      }
      case 'mappedType': {
        if (node.keys.id === childId) return { kind: 'single', parentId: node.id, slot: 'keys' };
        if (node.source.id === childId) return { kind: 'single', parentId: node.id, slot: 'source' };
        return search(node.keys) || search(node.source);
      }
      case 'conditional': {
        const slots = ['check', 'extends', 'trueBranch', 'falseBranch'] as const;
        for (const slot of slots) {
          const child = (node as unknown as Record<string, TypeNode>)[slot] as TypeNode;
          if (child.id === childId) return { kind: 'single', parentId: node.id, slot };
          const r = search(child); if (r) return r;
        }
        break;
      }
      case 'templateLiteral': {
        for (let i = 0; i < node.parts.length; i++) {
          const p = node.parts[i];
          if (typeof p !== 'string') {
            if (p.id === childId) return { kind: 'list', parentId: node.id, slot: 'parts', index: i };
            const r = search(p); if (r) return r;
          }
        }
        break;
      }
    }
    return null;
  }
  return search(root);
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
