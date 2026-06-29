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

export function getAllIds(node: TypeNode): Set<NodeId> {
  const ids = new Set<NodeId>([node.id]);
  switch (node.kind) {
    case 'object':
      node.props.forEach(p => getAllIds(p.value).forEach(id => ids.add(id)));
      break;
    case 'union':
      node.members.forEach(m => getAllIds(m).forEach(id => ids.add(id)));
      break;
    case 'tuple':
      node.elements.forEach(e => getAllIds(e).forEach(id => ids.add(id)));
      break;
    case 'array':
      getAllIds(node.element).forEach(id => ids.add(id));
      break;
    case 'keyof':
      getAllIds(node.target).forEach(id => ids.add(id));
      break;
    case 'indexedAccess':
      getAllIds(node.target).forEach(id => ids.add(id));
      getAllIds(node.key).forEach(id => ids.add(id));
      break;
    case 'mappedType':
      getAllIds(node.keys).forEach(id => ids.add(id));
      getAllIds(node.source).forEach(id => ids.add(id));
      break;
    case 'conditional':
      getAllIds(node.check).forEach(id => ids.add(id));
      getAllIds(node.extends).forEach(id => ids.add(id));
      getAllIds(node.trueBranch).forEach(id => ids.add(id));
      getAllIds(node.falseBranch).forEach(id => ids.add(id));
      break;
    case 'templateLiteral':
      node.parts.forEach(p => {
        if (typeof p !== 'string') getAllIds(p).forEach(id => ids.add(id));
      });
      break;
  }
  return ids;
}

export function collectInferNamesInExtends(node: TypeNode): string[] {
  const names: string[] = [];
  function walk(n: TypeNode) {
    if (n.kind === 'infer') { names.push(n.name); return; }
    switch (n.kind) {
      case 'union': n.members.forEach(walk); break;
      case 'tuple': n.elements.forEach(walk); break;
      case 'array': walk(n.element); break;
      case 'object': n.props.forEach(p => walk(p.value)); break;
      case 'templateLiteral': n.parts.forEach(p => { if (typeof p !== 'string') walk(p); }); break;
    }
  }
  walk(node);
  return names;
}
