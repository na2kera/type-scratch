export type NodeId = string;

export type NodeKind =
  | 'object' | 'primitive' | 'literal' | 'union' | 'intersection' | 'tuple' | 'array'
  | 'keyof' | 'indexedAccess' | 'mappedType' | 'conditional' | 'infer' | 'templateLiteral'
  | 'ref' | 'rest' | 'functionType';

export type TypeNode =
  | { id: NodeId; kind: 'object'; props: { key: string; value: TypeNode; optional?: boolean }[] }
  | { id: NodeId; kind: 'primitive'; name: 'string' | 'number' | 'boolean' | 'never' | 'any' | 'unknown' }
  | { id: NodeId; kind: 'literal'; value: string | number | boolean }
  | { id: NodeId; kind: 'union'; members: TypeNode[] }
  | { id: NodeId; kind: 'intersection'; members: TypeNode[] }
  | { id: NodeId; kind: 'tuple'; elements: TypeNode[] }
  | { id: NodeId; kind: 'array'; element: TypeNode }
  | { id: NodeId; kind: 'keyof'; target: TypeNode }
  | { id: NodeId; kind: 'indexedAccess'; target: TypeNode; key: TypeNode }
  | { id: NodeId; kind: 'mappedType'; keys: TypeNode; source: TypeNode | null; value?: TypeNode | null; transform: 'keep' | 'array' | 'optional' | 'readonly' }
  | { id: NodeId; kind: 'conditional'; check: TypeNode; extends: TypeNode; trueBranch: TypeNode; falseBranch: TypeNode }
  | { id: NodeId; kind: 'infer'; name: string }
  | { id: NodeId; kind: 'templateLiteral'; parts: Array<string | TypeNode> }
  | { id: NodeId; kind: 'ref'; name: string }
  | { id: NodeId; kind: 'rest'; target: TypeNode }
  | { id: NodeId; kind: 'functionType'; params: TypeNode; returnType: TypeNode };

export type PrimitiveTypeName = 'string' | 'number' | 'boolean' | 'never' | 'any' | 'unknown';

export interface BaseRow {
  key: string;
  type: PrimitiveTypeName;
}

export interface TypeParam {
  name: string;
  constraint?: string;
}

export interface TestCase {
  args: string;
  expected: string;
  label?: string;
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  targetCodeDisplay: string;
  baseTypeSource: string;
  typeParams: TypeParam[];
  testCases: TestCase[];
  refNames: string[];
}

export type SlotRef =
  | { kind: 'root' }
  | { kind: 'single'; parentId: NodeId; slot: 'target' | 'element' | 'key' | 'check' | 'extends' | 'trueBranch' | 'falseBranch' | 'keys' | 'source' | 'value' | 'params' | 'returnType' }
  | { kind: 'list'; parentId: NodeId; slot: 'members' | 'elements' | 'props' | 'parts'; index: number }
  | { kind: 'listAppend'; parentId: NodeId; slot: 'members' | 'elements' | 'props' | 'parts' };

export type NodeTypeResult = { displayString: string; errors: string[] };
export type TypeResultMap = Record<string, NodeTypeResult>;

/** テストケースの index -> そのケースのエラー一覧(空配列 = 合格) */
export type CaseResultMap = Record<number, string[]>;

export interface JudgeResult {
  passed: boolean;
  cases: boolean[];
  globalErrors: string[];
}

export type WorkerRequest = { type: 'evaluate'; source: string; requestId: number };

export type WorkerResponse =
  | {
      type: 'result';
      requestId: number;
      displayString: string;
      errors: string[];
      nodeResults: Record<string, string>;
      caseErrors: CaseResultMap;
      globalErrors: string[];
    }
  | { type: 'error'; requestId: number; message: string };
