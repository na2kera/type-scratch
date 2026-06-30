import { TypeNode, NodeId } from './types';
import { renderExpression, walkChildren } from './nodes';

function markExtendsSubtree(root: TypeNode, out: Set<NodeId>): void {
  if (!root) return;
  if (root.kind === 'conditional') {
    function markAll(n: TypeNode) {
      out.add(n.id);
      walkChildren(n, markAll);
    }
    markAll(root.extends);
    markExtendsSubtree(root.check, out);
    markExtendsSubtree(root.trueBranch, out);
    markExtendsSubtree(root.falseBranch, out);
    return;
  }
  walkChildren(root, child => markExtendsSubtree(child, out));
}

export function generateSource(baseTypeSource: string, root: TypeNode): string {
  const lines = [baseTypeSource];
  const insideExtends = new Set<NodeId>();
  markExtendsSubtree(root, insideExtends);

  function visit(node: TypeNode): string {
    if ((node as unknown) === null) return 'never';
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
    lines.push(`const __E_${node.id} = null as unknown as ${alias};`);
    return alias;
  }

  const rootRef = visit(root);
  lines.push(`type __Output = ${rootRef};`);
  lines.push(`const __E___output = null as unknown as __Output;`);
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
