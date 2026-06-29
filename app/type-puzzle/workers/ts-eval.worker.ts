import ts from 'typescript';
import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN } from '@typescript/vfs';
import { WorkerRequest, WorkerResponse } from '../lib/types';

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  strict: true,
  skipLibCheck: true,
};

let envPromise: Promise<ReturnType<typeof createVirtualTypeScriptEnvironment>> | null = null;
let fsMap: Map<string, string> | null = null;

async function getEnv(source: string) {
  if (!fsMap) {
    fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, true, ts);
  }
  fsMap.set('index.ts', source);
  const system = createSystem(fsMap);
  return createVirtualTypeScriptEnvironment(system, ['index.ts'], ts, compilerOptions);
}

let cachedEnv: ReturnType<typeof createVirtualTypeScriptEnvironment> | null = null;

async function evaluate(source: string): Promise<{ displayString: string; errors: string[]; nodeResults: Record<string, string> }> {
  if (!fsMap) {
    fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, true, ts);
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
    if (!ts.isTypeAliasDeclaration(stmt)) continue;
    const name = stmt.name.text;
    const type = checker.getTypeAtLocation(stmt.name);
    const str = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
    if (name === '__Output') {
      displayString = str;
    } else if (name.startsWith('N_')) {
      nodeResults[name.slice(2)] = str;
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
