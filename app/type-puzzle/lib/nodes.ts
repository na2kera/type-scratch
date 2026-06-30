import { TypeNode, NodeId } from './types';

let counter = 0;
export function newId(): NodeId {
  return `node_${++counter}_${Math.random().toString(36).slice(2, 7)}`;
}

export function renderExpression(node: TypeNode, visit: (n: TypeNode) => string): string {
  switch (node.kind) {
    case 'object': {
      const props = node.props.map(p => {
        const opt = p.optional ? '?' : '';
        return `${p.key}${opt}: ${visit(p.value)}`;
      });
      return `{ ${props.join('; ')} }`;
    }
    case 'primitive':
      return node.name;
    case 'literal': {
      if (typeof node.value === 'string') return `'${node.value}'`;
      return String(node.value);
    }
    case 'union':
      return node.members.map(visit).join(' | ');
    case 'intersection':
      return node.members.map(visit).join(' & ');
    case 'tuple':
      return `[${node.elements.map(visit).join(', ')}]`;
    case 'array':
      return `${visit(node.element)}[]`;
    case 'keyof':
      return `keyof ${visit(node.target)}`;
    case 'indexedAccess':
      return `${visit(node.target)}[${visit(node.key)}]`;
    case 'mappedType': {
      const suffix = node.transform === 'array' ? '[]' : '';
      const opt = node.transform === 'optional' ? '?' : '';
      return `{ [K in ${visit(node.keys)}]${opt}: ${visit(node.source)}[K]${suffix} }`;
    }
    case 'conditional':
      return `${visit(node.check)} extends ${visit(node.extends)} ? ${visit(node.trueBranch)} : ${visit(node.falseBranch)}`;
    case 'infer':
      return node.name;
    case 'templateLiteral': {
      const parts = node.parts.map(p =>
        typeof p === 'string' ? p : `\${${visit(p)}}`
      ).join('');
      return `\`${parts}\``;
    }
    case 'ref':
      return node.name;
  }
}

export function walkChildren(node: TypeNode, fn: (child: TypeNode) => void): void {
  if (!node) return;
  switch (node.kind) {
    case 'object': node.props.forEach(p => { if (p.value) fn(p.value); }); break;
    case 'union': node.members.forEach(fn); break;
    case 'intersection': node.members.forEach(fn); break;
    case 'tuple': node.elements.forEach(fn); break;
    case 'array': if (node.element) fn(node.element); break;
    case 'keyof': if (node.target) fn(node.target); break;
    case 'indexedAccess': if (node.target) fn(node.target); if (node.key) fn(node.key); break;
    case 'mappedType': if (node.keys) fn(node.keys); if (node.source) fn(node.source); break;
    case 'conditional': if (node.check) fn(node.check); if (node.extends) fn(node.extends); if (node.trueBranch) fn(node.trueBranch); if (node.falseBranch) fn(node.falseBranch); break;
    case 'templateLiteral': node.parts.forEach(p => { if (typeof p !== 'string') fn(p); }); break;
  }
}

export function mapChildren(node: TypeNode, fn: (child: TypeNode) => TypeNode): TypeNode {
  if (!node) return node;
  switch (node.kind) {
    case 'object': return { ...node, props: node.props.map(p => ({ ...p, value: p.value ? fn(p.value) : p.value })) };
    case 'union': return { ...node, members: node.members.map(fn) };
    case 'intersection': return { ...node, members: node.members.map(fn) };
    case 'tuple': return { ...node, elements: node.elements.map(fn) };
    case 'array': return { ...node, element: node.element ? fn(node.element) : node.element };
    case 'keyof': return { ...node, target: node.target ? fn(node.target) : node.target };
    case 'indexedAccess': return { ...node, target: node.target ? fn(node.target) : node.target, key: node.key ? fn(node.key) : node.key };
    case 'mappedType': return { ...node, keys: node.keys ? fn(node.keys) : node.keys, source: node.source ? fn(node.source) : node.source };
    case 'conditional': return { ...node, check: node.check ? fn(node.check) : node.check, extends: node.extends ? fn(node.extends) : node.extends, trueBranch: node.trueBranch ? fn(node.trueBranch) : node.trueBranch, falseBranch: node.falseBranch ? fn(node.falseBranch) : node.falseBranch };
    case 'templateLiteral': return { ...node, parts: node.parts.map(p => typeof p === 'string' ? p : (p ? fn(p) : p)) };
  }
  return node;
}

export function getAllIds(node: TypeNode): Set<NodeId> {
  const ids = new Set<NodeId>([node.id]);
  walkChildren(node, child => getAllIds(child).forEach(id => ids.add(id)));
  return ids;
}

export function collectInferNamesInExtends(node: TypeNode): string[] {
  const names: string[] = [];
  function walk(n: TypeNode) {
    if (n.kind === 'infer') { names.push(n.name); return; }
    walkChildren(n, walk);
  }
  walk(node);
  return names;
}
