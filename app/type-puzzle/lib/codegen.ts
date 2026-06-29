import { TypeNode, NodeId } from './types';
import { renderExpression } from './nodes';

function markExtendsSubtree(root: TypeNode, out: Set<NodeId>): void {
  if (root.kind === 'conditional') {
    function markAll(n: TypeNode) {
      out.add(n.id);
      switch (n.kind) {
        case 'object': n.props.forEach(p => markAll(p.value)); break;
        case 'union': n.members.forEach(markAll); break;
        case 'tuple': n.elements.forEach(markAll); break;
        case 'array': markAll(n.element); break;
        case 'keyof': markAll(n.target); break;
        case 'indexedAccess': markAll(n.target); markAll(n.key); break;
        case 'mappedType': markAll(n.keys); markAll(n.source); break;
        case 'conditional': markAll(n.check); markAll(n.extends); markAll(n.trueBranch); markAll(n.falseBranch); break;
        case 'templateLiteral': n.parts.forEach(p => { if (typeof p !== 'string') markAll(p); }); break;
      }
    }
    markAll(root.extends);
    markExtendsSubtree(root.check, out);
    markExtendsSubtree(root.trueBranch, out);
    markExtendsSubtree(root.falseBranch, out);
    return;
  }
  switch (root.kind) {
    case 'object': root.props.forEach(p => markExtendsSubtree(p.value, out)); break;
    case 'union': root.members.forEach(m => markExtendsSubtree(m, out)); break;
    case 'tuple': root.elements.forEach(e => markExtendsSubtree(e, out)); break;
    case 'array': markExtendsSubtree(root.element, out); break;
    case 'keyof': markExtendsSubtree(root.target, out); break;
    case 'indexedAccess': markExtendsSubtree(root.target, out); markExtendsSubtree(root.key, out); break;
    case 'mappedType': markExtendsSubtree(root.keys, out); markExtendsSubtree(root.source, out); break;
    case 'templateLiteral': root.parts.forEach(p => { if (typeof p !== 'string') markExtendsSubtree(p, out); }); break;
  }
}

export function generateSource(baseTypeSource: string, root: TypeNode): string {
  const lines = [baseTypeSource];
  const insideExtends = new Set<NodeId>();
  markExtendsSubtree(root, insideExtends);

  function visit(node: TypeNode): string {
    if (node.kind === 'infer') {
      return insideExtends.has(node.id) ? `infer ${node.name}` : node.name;
    }
    if (node.kind === 'ref') {
      return node.name;
    }
    const expr = renderExpression(node, visit);
    if (insideExtends.has(node.id)) return expr;
    const alias = `N_${node.id}`;
    lines.push(`type ${alias} = ${expr};`);
    return alias;
  }

  const rootRef = visit(root);
  lines.push(`type __Output = ${rootRef};`);
  return lines.join('\n');
}

export function generateCheckSource(baseTypeSource: string, root: TypeNode, targetTypeSource: string): string {
  const base = generateSource(baseTypeSource, root);
  return `${base}
${targetTypeSource}
type __Assert<T, U> =
  (<V>() => V extends T ? 1 : 2) extends (<V>() => V extends U ? 1 : 2) ? true : never;
const __check: __Assert<__Output, __Target> = true;`;
}
