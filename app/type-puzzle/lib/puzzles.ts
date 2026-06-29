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
];
