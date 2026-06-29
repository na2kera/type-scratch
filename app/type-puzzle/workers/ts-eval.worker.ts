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

async function evaluate(source: string): Promise<{ displayString: string; errors: string[] }> {
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
  const statements = sourceFile.statements;
  for (let i = statements.length - 1; i >= 0; i--) {
    const stmt = statements[i];
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === '__Output') {
      const type = checker.getTypeAtLocation(stmt.name);
      displayString = checker.typeToString(type, undefined, ts.TypeFormatFlags.NoTruncation);
      break;
    }
  }

  return { displayString, errors };
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
