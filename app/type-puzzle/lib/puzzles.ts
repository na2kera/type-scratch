import { Puzzle } from './types';

const BASE_USER = `type User = { name: string; age: number; email: string; isAdmin: boolean };`;

export const puzzles: Puzzle[] = [
  {
    id: 'keyof-basic',
    title: '問題1: keyof',
    description: 'User型のキー名だけのUnion型を作ってください。',
    targetCodeDisplay: 'type Result = keyof User',
    targetTypeSource: 'type __Target = keyof User;',
    baseTypeSource: BASE_USER,
  },
  {
    id: 'pick-basic',
    title: '問題2: Pick',
    description: "User型から name と email だけを取り出した型を作ってください。",
    targetCodeDisplay: "type Result = Pick<User, 'name' | 'email'>",
    targetTypeSource: "type __Target = Pick<User, 'name' | 'email'>;",
    baseTypeSource: BASE_USER,
  },
  {
    id: 'template-literal-basic',
    title: '問題3: Template Literal',
    description: "User型のキー名の末尾に '-id' を付けたUnion型を作ってください。",
    targetCodeDisplay: 'type Result = `${keyof User}-id`',
    targetTypeSource: 'type __Target = `${keyof User}-id`;',
    baseTypeSource: BASE_USER,
  },
  {
    id: 'partial-basic',
    title: '問題4: Partial',
    description: 'User型の全フィールドをオプショナルにした型を作ってください。\nヒント: Mapped Type の「optional化」変換を使います。',
    targetCodeDisplay: 'type Result = { [K in keyof User]?: User[K] }',
    targetTypeSource: 'type __Target = { [K in keyof User]?: User[K] };',
    baseTypeSource: BASE_USER,
  },
  {
    id: 'conditional-basic',
    title: '問題5: Conditional Type',
    description: "User['isAdmin'] の型が boolean なら true、そうでなければ false を返す型を作ってください。\nヒント: Conditional Type と T[K] を組み合わせます。",
    targetCodeDisplay: "type Result = User['isAdmin'] extends boolean ? true : false",
    targetTypeSource: "type __Target = User['isAdmin'] extends boolean ? true : false;",
    baseTypeSource: BASE_USER,
  },
  {
    id: 'infer-basic',
    title: '問題6: infer',
    description: "タプル [string, number] の先頭要素の型を infer で取り出してください。\nヒント: Conditional Type の extends 句にタプルと infer を置きます。",
    targetCodeDisplay: 'type Result = [string, number] extends [infer First, number] ? First : never',
    targetTypeSource: 'type __Target = [string, number] extends [infer First, number] ? First : never;',
    baseTypeSource: BASE_USER,
  },
];
