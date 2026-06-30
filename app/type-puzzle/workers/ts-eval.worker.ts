import ts from 'typescript';
import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN } from '@typescript/vfs';
import { WorkerRequest, WorkerResponse } from '../lib/types';

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  strict: true,
  skipLibCheck: true,
};

let fsMap: Map<string, string> | null = null;
let cachedEnv: ReturnType<typeof createVirtualTypeScriptEnvironment> | null = null;

function formatType(checker: ts.TypeChecker, type: ts.Type): string {
  const flags =
    ts.TypeFormatFlags.NoTruncation |
    ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType;

  if (type.isUnion()) {
    return type.types.map(t => checker.typeToString(t, undefined, flags)).join(' | ');
  }

  return checker.typeToString(type, undefined, flags);
}

async function evaluate(source: string): Promise<{ displayString: string; errors: string[]; nodeResults: Record<string, string> }> {
  if (!fsMap) {
    fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, false, ts);
  }

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
