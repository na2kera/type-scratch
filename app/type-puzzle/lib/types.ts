export type NodeId = string;

export type NodeKind =
  | 'object' | 'primitive' | 'literal' | 'union' | 'tuple' | 'array'
  | 'keyof' | 'indexedAccess' | 'mappedType' | 'conditional' | 'infer' | 'templateLiteral'
  | 'ref';

export type TypeNode =
  | { id: NodeId; kind: 'object'; props: { key: string; value: TypeNode; optional?: boolean }[] }
  | { id: NodeId; kind: 'primitive'; name: 'string' | 'number' | 'boolean' }
  | { id: NodeId; kind: 'literal'; value: string | number | boolean }
  | { id: NodeId; kind: 'union'; members: TypeNode[] }
  | { id: NodeId; kind: 'tuple'; elements: TypeNode[] }
  | { id: NodeId; kind: 'array'; element: TypeNode }
  | { id: NodeId; kind: 'keyof'; target: TypeNode }
  | { id: NodeId; kind: 'indexedAccess'; target: TypeNode; key: TypeNode }
  | { id: NodeId; kind: 'mappedType'; keys: TypeNode; source: TypeNode; transform: 'keep' | 'array' | 'optional' }
  | { id: NodeId; kind: 'conditional'; check: TypeNode; extends: TypeNode; trueBranch: TypeNode; falseBranch: TypeNode }
  | { id: NodeId; kind: 'infer'; name: string }
  | { id: NodeId; kind: 'templateLiteral'; parts: Array<string | TypeNode> }
  | { id: NodeId; kind: 'ref'; name: string };

export type PrimitiveTypeName = 'string' | 'number' | 'boolean';

export interface BaseRow {
  key: string;
  type: PrimitiveTypeName;
}

export interface Puzzle {
  id: string;
  title: string;
  description: string;
  targetCodeDisplay: string;
  targetTypeSource: string;
  baseTypeSource: string;
}

export type SlotRef =
  | { kind: 'root' }
  | { kind: 'single'; parentId: NodeId; slot: 'target' | 'element' | 'key' | 'check' | 'extends' | 'trueBranch' | 'falseBranch' | 'keys' | 'source' }
  | { kind: 'list'; parentId: NodeId; slot: 'members' | 'elements' | 'props' | 'parts'; index: number }
  | { kind: 'listAppend'; parentId: NodeId; slot: 'members' | 'elements' | 'props' | 'parts' };

export type WorkerRequest =
  | { type: 'evaluate'; source: string; requestId: number }
  | { type: 'check'; source: string; requestId: number };

export type WorkerResponse =
  | { type: 'result'; requestId: number; displayString: string; errors: string[] }
  | { type: 'error'; requestId: number; message: string };
