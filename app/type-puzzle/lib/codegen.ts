import { TypeNode, NodeId } from './types';
import { renderExpression, walkChildren } from './nodes';

// ─── Readable code generator ────────────────────────────────────────────────

// Operator precedence (lower = looser binding)
const PREC = {
  conditional: 1,
  union: 2,
  intersection: 3,
  keyof: 4,
  postfix: 5, // array T[], indexedAccess T[K], mappedType
  atom: 6,    // object, primitive, literal, tuple, ref, infer, templateLiteral
} as const;

type Prec = typeof PREC[keyof typeof PREC];

function wrap(expr: string, childPrec: Prec, minPrec: Prec): string {
  return childPrec < minPrec ? `(${expr})` : expr;
}

function renderReadable(node: TypeNode, insideExtends: Set<NodeId>): [string, Prec] {
  if ((node as unknown) === null) return ['/* ? */', PREC.atom];

  switch (node.kind) {
    case 'primitive': return [node.name, PREC.atom];
    case 'ref':       return [node.name, PREC.atom];

    case 'infer':
      return [insideExtends.has(node.id) ? `infer ${node.name}` : node.name, PREC.atom];

    case 'literal': {
      const v = typeof node.value === 'string' ? `'${node.value}'` : String(node.value);
      return [v, PREC.atom];
    }

    case 'object': {
      const props = node.props.map(p => {
        const [valExpr] = p.value ? renderReadable(p.value, insideExtends) : ['/* ? */', PREC.atom];
        return `${p.key}${p.optional ? '?' : ''}: ${valExpr}`;
      });
      return [props.length === 0 ? '{}' : `{ ${props.join('; ')} }`, PREC.atom];
    }

    case 'tuple': {
      const elems = node.elements.map(e => renderReadable(e, insideExtends)[0]);
      return [`[${elems.join(', ')}]`, PREC.atom];
    }

    case 'templateLiteral': {
      const parts = node.parts.map(p =>
        typeof p === 'string' ? p : `\${${renderReadable(p, insideExtends)[0]}}`
      ).join('');
      return [`\`${parts}\``, PREC.atom];
    }

    case 'union': {
      const members = node.members.map(m => {
        const [expr, prec] = renderReadable(m, insideExtends);
        return wrap(expr, prec, PREC.union);
      });
      return [members.join(' | '), PREC.union];
    }

    case 'intersection': {
      const members = node.members.map(m => {
        const [expr, prec] = renderReadable(m, insideExtends);
        return wrap(expr, prec, PREC.intersection);
      });
      return [members.join(' & '), PREC.intersection];
    }

    case 'array': {
      const [tExpr, tPrec] = node.element ? renderReadable(node.element, insideExtends) : ['/* ? */', PREC.atom];
      return [`${wrap(tExpr, tPrec, PREC.postfix)}[]`, PREC.postfix];
    }

    case 'keyof': {
      const [tExpr, tPrec] = node.target ? renderReadable(node.target, insideExtends) : ['/* ? */', PREC.atom];
      return [`keyof ${wrap(tExpr, tPrec, PREC.keyof)}`, PREC.keyof];
    }

    case 'indexedAccess': {
      const [tExpr, tPrec] = node.target ? renderReadable(node.target, insideExtends) : ['/* ? */', PREC.atom];
      const [kExpr] = node.key ? renderReadable(node.key, insideExtends) : ['/* ? */', PREC.atom];
      return [`${wrap(tExpr, tPrec, PREC.postfix)}[${kExpr}]`, PREC.postfix];
    }

    case 'mappedType': {
      const [keysExpr] = node.keys ? renderReadable(node.keys, insideExtends) : ['/* ? */', PREC.atom];
      const [srcExpr, srcPrec] = node.source ? renderReadable(node.source, insideExtends) : ['/* ? */', PREC.atom];
      const opt = node.transform === 'optional' ? '?' : '';
      const suffix = node.transform === 'array' ? '[]' : '';
      const srcWrapped = wrap(srcExpr, srcPrec, PREC.postfix);
      return [`{ [K in ${keysExpr}]${opt}: ${srcWrapped}[K]${suffix} }`, PREC.atom];
    }

    case 'conditional': {
      const [checkExpr, checkPrec] = node.check ? renderReadable(node.check, insideExtends) : ['/* ? */', PREC.atom];
      const [extExpr, extPrec] = node.extends ? renderReadable(node.extends, insideExtends) : ['/* ? */', PREC.atom];
      const [trueExpr] = node.trueBranch ? renderReadable(node.trueBranch, insideExtends) : ['/* ? */', PREC.atom];
      const [falseExpr] = node.falseBranch ? renderReadable(node.falseBranch, insideExtends) : ['/* ? */', PREC.atom];
      const checkW = wrap(checkExpr, checkPrec, PREC.intersection);
      const extW = wrap(extExpr, extPrec, PREC.intersection);
      return [
        `${checkW} extends ${extW} ? ${trueExpr} : ${falseExpr}`,
        PREC.conditional,
      ];
    }
  }
}

export function generateReadableSource(
  baseTypeSource: string,
  root: TypeNode | null,
  resultName = 'Result'
): string {
  if (!root) return baseTypeSource;
  const insideExtends = new Set<NodeId>();
  markExtendsSubtree(root, insideExtends);
  const [expr] = renderReadable(root, insideExtends);
  return `${baseTypeSource}\n\ntype ${resultName} = ${expr};`;
}

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
