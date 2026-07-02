'use client';

import { WorkerRequest, WorkerResponse, CaseResultMap } from '../lib/types';

type EvalResult = {
  displayString: string;
  errors: string[];
  nodeResults: Record<string, string>;
  caseErrors: CaseResultMap;
  globalErrors: string[];
};
type Resolver = { resolve: (v: EvalResult) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let requestId = 0;
const pending = new Map<number, Resolver>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./ts-eval.worker.ts', import.meta.url));
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const res = e.data;
      const p = pending.get(res.requestId);
      if (!p) return;
      pending.delete(res.requestId);
      if (res.type === 'result') {
        p.resolve({
          displayString: res.displayString,
          errors: res.errors,
          nodeResults: res.nodeResults,
          caseErrors: res.caseErrors,
          globalErrors: res.globalErrors,
        });
      } else {
        p.reject(new Error(res.message));
      }
    };
    worker.onerror = (e) => {
      console.error('Worker error', e);
      for (const [, { reject }] of pending) {
        reject(new Error('Worker error: ' + e.message));
      }
      pending.clear();
      worker = null;
    };
  }
  return worker;
}

export function evaluateType(source: string): Promise<EvalResult> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    const req: WorkerRequest = { type: 'evaluate', source, requestId: id };
    getWorker().postMessage(req);
  });
}
