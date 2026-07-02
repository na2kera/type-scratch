import { TypeNode, NodeId, Puzzle, TypeParam } from './types';
import { renderExpression, walkChildren, collectInferNamesInExtends, escapeStringLiteral, escapeTemplatePart } from './nodes';

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
      const v = typeof node.value === 'string' ? `'${escapeStringLiteral(node.value)}'` : String(node.value);
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
        typeof p === 'string' ? escapeTemplatePart(p) : `\${${renderReadable(p, insideExtends)[0]}}`
      ).join('');
      return [`\`${parts}\``, PREC.atom];
    }

    case 'union': {
      if (node.members.length === 0) return ['never', PREC.atom];
      const members = node.members.map(m => {
        const [expr, prec] = renderReadable(m, insideExtends);
        return wrap(expr, prec, PREC.union);
      });
      return [members.join(' | '), PREC.union];
    }

    case 'intersection': {
      if (node.members.length === 0) return ['unknown', PREC.atom];
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
      const ro = node.transform === 'readonly' ? 'readonly ' : '';
      const opt = node.transform === 'optional' ? '?' : '';
      const suffix = node.transform === 'array' ? '[]' : '';
      let valueExpr: string;
      if (node.value) {
        const [vExpr, vPrec] = renderReadable(node.value, insideExtends);
        valueExpr = wrap(vExpr, vPrec, PREC.postfix);
      } else {
        const [srcExpr, srcPrec] = node.source ? renderReadable(node.source, insideExtends) : ['/* ? */', PREC.atom];
        valueExpr = `${wrap(srcExpr, srcPrec, PREC.postfix)}[K]`;
      }
      return [`{ ${ro}[K in ${keysExpr}]${opt}: ${valueExpr}${suffix} }`, PREC.atom];
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

    case 'rest': {
      const [tExpr, tPrec] = node.target ? renderReadable(node.target, insideExtends) : ['/* ? */', PREC.atom];
      return [`...${wrap(tExpr, tPrec, PREC.postfix)}`, PREC.atom];
    }

    case 'functionType': {
      const [pExpr] = node.params ? renderReadable(node.params, insideExtends) : ['/* ? */', PREC.atom];
      const [rExpr] = node.returnType ? renderReadable(node.returnType, insideExtends) : ['/* ? */', PREC.atom];
      return [`(...args: ${pExpr}) => ${rExpr}`, PREC.conditional];
    }
  }
}

function formatTypeParams(typeParams: TypeParam[]): string {
  if (typeParams.length === 0) return '';
  return `<${typeParams.map(p => p.constraint ? `${p.name} extends ${p.constraint}` : p.name).join(', ')}>`;
}

export function generateReadableSource(
  baseTypeSource: string,
  root: TypeNode | null,
  resultName = 'Result',
  typeParams: TypeParam[] = []
): string {
  if (!root) return baseTypeSource;
  const insideExtends = new Set<NodeId>();
  markExtendsSubtree(root, insideExtends);
  const [expr] = renderReadable(root, insideExtends);
  return `${baseTypeSource}\n\ntype ${resultName}${formatTypeParams(typeParams)} = ${expr};`;
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

// conditional の分岐内などで infer 変数(や mapped type の K)を参照しているノードは、
// トップレベルの type エイリアスに巻き上げるとスコープ外参照になる。束縛されていない
// 自由変数名を含むノードの ID を集めて、インライン展開の対象にする。
function collectFreeVarIds(root: TypeNode): Set<NodeId> {
  const result = new Set<NodeId>();

  function visit(node: TypeNode): Set<string> {
    if (!node) return new Set();
    let free: Set<string>;
    if (node.kind === 'infer') {
      free = new Set([node.name]);
    } else if (node.kind === 'ref' && node.name === 'K') {
      // mapped type のイテレータ 'K' への参照。束縛元は mappedType の value スロット。
      free = new Set(['K']);
    } else if (node.kind === 'conditional') {
      free = node.check ? new Set(visit(node.check)) : new Set();
      if (node.extends) visit(node.extends);
      const declared = new Set(node.extends ? collectInferNamesInExtends(node.extends) : []);
      for (const branch of [node.trueBranch, node.falseBranch]) {
        if (!branch) continue;
        for (const name of visit(branch)) {
          if (!declared.has(name)) free.add(name);
        }
      }
    } else if (node.kind === 'mappedType') {
      free = node.keys ? new Set(visit(node.keys)) : new Set();
      if (node.source) visit(node.source);
      if (node.value) {
        // value サブツリー内の 'K' は mappedType 自身が束縛するので自由変数から除く
        for (const name of visit(node.value)) {
          if (name !== 'K') free.add(name);
        }
      }
    } else {
      const collected = new Set<string>();
      walkChildren(node, child => { visit(child).forEach(n => collected.add(n)); });
      free = collected;
    }
    if (free.size > 0) result.add(node.id);
    return free;
  }

  visit(root);
  return result;
}

export interface GenericContext {
  typeParams: TypeParam[];
  case0Args: string;
}

export function generateSource(baseTypeSource: string, root: TypeNode, ctx?: GenericContext): string {
  const lines = [baseTypeSource];
  const insideExtends = new Set<NodeId>();
  markExtendsSubtree(root, insideExtends);
  const freeVarIds = collectFreeVarIds(root);

  const paramDecl = ctx ? formatTypeParams(ctx.typeParams) : '';
  const paramArgs = ctx && ctx.typeParams.length > 0 ? `<${ctx.typeParams.map(p => p.name).join(', ')}>` : '';
  const instArgs = ctx && ctx.typeParams.length > 0 ? `<${ctx.case0Args}>` : '';

  function visit(node: TypeNode): string {
    if ((node as unknown) === null) return 'never';
    if (node.kind === 'infer') {
      return insideExtends.has(node.id) ? `infer ${node.name}` : node.name;
    }
    if (node.kind === 'ref') {
      return node.name;
    }
    const expr = renderExpression(node, visit);
    // `type X = ...T;` は不正な構文のため、rest ノードは単独のエイリアスに巻き上げず常にインライン展開する
    if (insideExtends.has(node.id) || freeVarIds.has(node.id) || node.kind === 'rest') return expr;
    const alias = `N_${node.id}`;
    lines.push(`type ${alias}${paramDecl} = ${expr};`);
    lines.push(`const __E_${node.id} = null as unknown as ${alias}${instArgs};`);
    return `${alias}${paramArgs}`;
  }

  const rootRef = visit(root);
  lines.push(`type __Output${paramDecl} = ${rootRef};`);
  lines.push(`const __E___output = null as unknown as __Output${instArgs};`);
  return lines.join('\n');
}

export function generateCheckSource(puzzle: Puzzle, root: TypeNode): string {
  const ctx: GenericContext | undefined = puzzle.typeParams.length > 0
    ? { typeParams: puzzle.typeParams, case0Args: puzzle.testCases[0]?.args ?? '' }
    : undefined;
  const base = generateSource(puzzle.baseTypeSource, root, ctx);
  const lines = [
    base,
    'type __Assert<T, U> =',
    '  (<V>() => V extends T ? 1 : 2) extends (<V>() => V extends U ? 1 : 2) ? true : never;',
  ];
  puzzle.testCases.forEach((tc, i) => {
    const outputRef = tc.args ? `__Output<${tc.args}>` : '__Output';
    lines.push(`type __Expected_${i} = ${tc.expected};`);
    lines.push(`const __check_${i}: __Assert<${outputRef}, __Expected_${i}> = true;`);
  });
  return lines.join('\n');
}
