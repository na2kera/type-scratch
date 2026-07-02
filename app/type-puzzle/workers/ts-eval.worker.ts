import ts from 'typescript';
import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN } from '@typescript/vfs';
import { WorkerRequest, WorkerResponse } from '../lib/types';

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  strict: true,
  skipLibCheck: true,
};

// Promise を共有することで、初回ロード中に複数リクエストが来ても lib の CDN 取得と
// 環境生成が二重に走らないようにする
let fsMapPromise: Promise<Map<string, string>> | null = null;
let cachedEnv: ReturnType<typeof createVirtualTypeScriptEnvironment> | null = null;

function stripAliasesDeep(checker: ts.TypeChecker, type: ts.Type, seen: Set<ts.Type>): void {
  if (!type || seen.has(type)) return;
  seen.add(type);

  (type as ts.Type & { aliasSymbol?: unknown; aliasTypeArguments?: unknown }).aliasSymbol = undefined;
  (type as ts.Type & { aliasTypeArguments?: unknown }).aliasTypeArguments = undefined;

  if (type.isUnionOrIntersection()) {
    type.types.forEach(t => stripAliasesDeep(checker, t, seen));
    return;
  }

  const typeArgs = checker.getTypeArguments(type as ts.TypeReference);
  typeArgs.forEach(t => stripAliasesDeep(checker, t, seen));

  if (
    type.flags & ts.TypeFlags.Object &&
    (type as ts.ObjectType).objectFlags & ts.ObjectFlags.Anonymous
  ) {
    for (const prop of checker.getPropertiesOfType(type)) {
      stripAliasesDeep(checker, checker.getTypeOfSymbol(prop), seen);
    }
  }
}

function formatType(checker: ts.TypeChecker, type: ts.Type): string {
  const flags =
    ts.TypeFormatFlags.NoTruncation |
    ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType;

  if (type.flags & ts.TypeFlags.Boolean) {
    return checker.typeToString(type, undefined, flags);
  }

  if (type.isUnion()) {
    // boolean は内部的に true | false の Union なので、メンバーを個別に文字列化すると
    // `string | false | true` のように分解されてしまう。両方揃っていたら boolean に戻す。
    const parts: string[] = [];
    let hasTrue = false;
    let hasFalse = false;
    for (const t of type.types) {
      if (t.flags & ts.TypeFlags.BooleanLiteral) {
        if (checker.typeToString(t, undefined, flags) === 'true') hasTrue = true;
        else hasFalse = true;
        continue;
      }
      parts.push(formatType(checker, t));
    }
    if (hasTrue && hasFalse) parts.push('boolean');
    else if (hasTrue) parts.push('true');
    else if (hasFalse) parts.push('false');
    return parts.join(' | ');
  }

  stripAliasesDeep(checker, type, new Set());
  return checker.typeToString(type, undefined, flags);
}

async function evaluate(source: string): Promise<{ displayString: string; errors: string[]; nodeResults: Record<string, string> }> {
  if (!fsMapPromise) {
    fsMapPromise = createDefaultMapFromCDN(compilerOptions, ts.version, false, ts);
  }
  const fsMap = await fsMapPromise;

  if (!cachedEnv) {
    fsMap.set('index.ts', source);
    const system = createSystem(fsMap);
    cachedEnv = createVirtualTypeScriptEnvironment(system, ['index.ts'], ts, compilerOptions);
  } else {
    cachedEnv.updateFile('index.ts', source);
  }

  const program = cachedEnv.languageService.getProgram()!;
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile('index.ts')!;

  const diagnostics = ts.getPreEmitDiagnostics(program);
  const errors = Array.from(diagnostics).map(d =>
    ts.flattenDiagnosticMessageText(d.messageText, '\n')
  );

  let displayString = '(error)';
  const nodeResults: Record<string, string> = {};

  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const name = decl.name.text;
      if (!name.startsWith('__E_')) continue;
      const type = checker.getTypeAtLocation(decl.name);
      const str = formatType(checker, type);
      if (name === '__E___output') {
        displayString = str;
      } else {
        nodeResults[name.slice(4)] = str;
      }
    }
  }

  return { displayString, errors, nodeResults };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    const result = await evaluate(req.source);
    const response: WorkerResponse = {
      type: 'result',
      requestId: req.requestId,
      displayString: result.displayString,
      errors: result.errors,
      nodeResults: result.nodeResults,
    };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      type: 'error',
      requestId: req.requestId,
      message: String(err),
    };
    self.postMessage(response);
  }
};
