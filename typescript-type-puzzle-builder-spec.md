# TypeScript型パズル ビジュアルビルダー 仕様書

## 1. 概要

ブロックを組み合わせてTypeScriptの型レベル操作(`keyof`、`Mapped Type`、`Conditional Type`など)を学べる、ビジュアルプログラミング風の学習ツール。

- **サンドボックスモード**: 自由にベースの型とブロックを組み合わせて、結果をリアルタイムで確認する
- **パズルモード**: 提示された目標の型と一致する組み合わせを探す、出題形式のモード

最大の特徴は、自作の簡易型評価エンジンではなく **実際の `typescript` パッケージ(本物のコンパイラ)をブラウザ上で動かして型評価する** こと。これにより、分配条件型・`infer`・テンプレートリテラル型など、TypeScriptの本来の挙動を100%正確に再現する。

## 2. ゴール / ノンゴール

**ゴール**
- ブロックの組み合わせから実際にコンパイル可能なTSコードを生成する
- 生成したコードを本物のコンパイラに渡し、最終的な型の文字列表現を取得する
- パズルモードで「目標の型と一致しているか」を本物のコンパイラの型システムで判定する
- `object` / `primitive` / `literal` / `union` / `tuple` / `array` / `keyof` / `indexedAccess` / `mappedType` / `conditional` / `infer` / `templateLiteral` の12種のブロックを、任意の深さで入れ子にして組み立てられること
- 既存ノードをドラッグ&ドロップで別スロットへ移動・並べ替えできること(詳細は12章)

**ノンゴール(v1では対応しない)**
- JSへのコード出力(emit)機能
- `infer`による束縛/参照以外の、ノード間の汎用的な参照・再利用(複数の箇所から同じ部分木を使い回すこと)
- パズルの保存・共有(URL発行、DB永続化)は将来拡張として後述するが、v1ではローカル状態のみ
- ログイン/ユーザー管理

## 3. 技術スタック

| 項目 | 選定 | 補足 |
|---|---|---|
| フレームワーク | Next.js (App Router) | 将来のAPI Routes追加を見据えて選定済み |
| 言語 | TypeScript | |
| 型評価エンジン | `typescript` (npm, 本物のコンパイラ) | クライアントのみで動作させる |
| 仮想ファイルシステム | `@typescript/vfs` | TS Playground/Twoslashと同じ仕組み。Node.jsの実ファイルシステムなしでブラウザ上に`Program`を構築できる |
| ドラッグ&ドロップ | `@dnd-kit/core` (+ `@dnd-kit/utilities`) | 木構造のスロット移動UI(12章)。リスト内並べ替えは `@dnd-kit/sortable` を使わず、スロット単位の droppable で統一 |
| スタイリング | 未確定(Tailwind CSS推奨) | 必須要件ではないため実装時に決めてよい |
| ホスティング | 未確定 | 静的書き出し(`next export`相当)も選択肢。サーバー機能を使わないなら検討 |

`typescript` と `@typescript/vfs` はどちらも完全にクライアントサイドで動かす。Next.jsのサーバーバンドルに混入させないよう、該当処理はすべて `'use client'` コンポーネント内、かつ可能であれば後述のWeb Worker内に閉じ込める。

## 4. アーキテクチャ概要

```
[ツリーの状態 (React State, TypeNode)]
        ↓ コード生成 (generateSource)
[TypeScriptソースコード文字列]
        ↓ @typescript/vfs 経由でコンパイル
[ts.Program / TypeChecker]
        ↓ checker.typeToString()
[画面表示用の型の文字列]
```

処理の重さを考慮し、上記の「コード生成〜コンパイル〜文字列化」はメインスレッドをブロックしないよう **Web Worker内で実行する** ことを推奨する(詳細は8章)。Reactコンポーネント側はWorkerにソースコードをpostMessageし、結果を受け取って表示するだけにする。

## 5. データモデル

型の組み立てはすべて、再帰的な木構造(`TypeNode`)として表現する。「直前のステップの出力を使う1本のチェーン」だった設計から、「任意の深さで入れ子にできる式ツリー」への変更。これにより、実際のTypeScriptの型がそうであるように、`Pick<User, keyof Other>`のような「式の中に式が入っている」表現を自然に組み立てられる。

```ts
type NodeId = string;

type NodeKind =
  | 'object' | 'primitive' | 'literal' | 'union' | 'tuple' | 'array'
  | 'keyof' | 'indexedAccess' | 'mappedType' | 'conditional' | 'infer' | 'templateLiteral';

type TypeNode =
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
  | { id: NodeId; kind: 'templateLiteral'; parts: Array<string | TypeNode> };
```

各kindの「子(スロット)」の数と意味:

| kind | 子の数/形 | 備考 |
|---|---|---|
| `object` | キーごとに1つの子(可変長) | `optional`でプロパティを省略可にする |
| `primitive` | 0(葉) | `string` / `number` / `boolean` |
| `literal` | 0(葉) | 文字列・数値・真偽値リテラル |
| `union` | N個(可変長、2個以上推奨) | |
| `tuple` | N個(可変長、順序を保持) | v1ではoptional要素・rest要素は非対応 |
| `array` | 1個(要素の型) | |
| `keyof` | 1個(対象) | |
| `indexedAccess` | 2個(対象 / キー) | キーが複数キーのUnionなら結果もUnion |
| `mappedType` | 2個(キー集合 / 元のobject) + `transform`列挙 | `transform`で`keep`/`array`/`optional`を選ぶ。キー集合を絞ることで`Pick`相当を再現できる |
| `conditional` | 4個(check / extends / trueBranch / falseBranch) | `check`がUnionなら自動的に分配される(分配条件型) |
| `infer` | 0(葉、ただし特殊) | 下記参照 |
| `templateLiteral` | 可変長(文字列セグメントとノードの混在配列) | |

**`infer` の特殊な扱い**

実際のTypeScriptでも`infer R`は「conditional typeの`extends`句の中でしか型を束縛できない」という構文上の制約がある。これをそのままモデルに反映する。

- `conditional`ノードの`extends`の子(またはその子孫、`union`/`tuple`/`array`/`object`などに入れ子にされた位置)に置かれた`infer`ノード → **束縛**。コード生成時は`infer ${name}`という形で出力する
- それ以外の位置(典型的には同じ`conditional`の`trueBranch`/`falseBranch`)に置かれた、同じ`name`を持つ`infer`ノード → **参照**。コード生成時は単に`${name}`という識別子として出力する
- UI上、`trueBranch`/`falseBranch`のスロットで`infer`を選んだ場合は自由入力ではなく「現在の`extends`句内で束縛済みの名前」からの選択にする。束縛されていない名前を参照してしまった場合の検出は本物のコンパイラの`Cannot find name`エラーに委ねればよく、独自の検証ロジックは不要

**ベースの型への参照**

ある型(サンドボックスでは`T`、パズルでは`User`など)を、ツリーの複数の場所から参照したいケースがある(例: `keyof User`と`User['name']`を両方作る)。これは木構造の「子は1つの親しか持てない」という制約と相性が悪いため、`TypeNode`の12種別とは別に、実装上は内部的な参照用ノード(例: `{ id; kind: 'ref'; name: string }`)を用意し、各スロットの選択肢に「新しいブロックを組み立てる」と「ベースの型(または束縛済みの`infer`名)を参照する」の両方を出せるようにする。これはユーザーに見せる12種類のブロックパレットには含めない、内部実装の話。

```ts
type PrimitiveTypeName = 'string' | 'number' | 'boolean';

interface BaseRow {
  key: string;
  type: PrimitiveTypeName;
}

// パズル定義
interface Puzzle {
  id: string;
  title: string;
  description: string;
  /** User側に見せる目標コードの表示用文字列(コメント表示用) */
  targetCodeDisplay: string;
  /** 正誤判定に使う、実際にコンパイルする目標の型定義コード */
  targetTypeSource: string; // 例: "type __Target = keyof User;"
  baseTypeSource: string; // 例: "type User = { name: string; age: number; ... };"
}
```

`object`/`union`/`tuple`などをトップレベルで自由に組み立てられるようになったが、サンドボックスでもパズルでも「ベースの型」を別枠で持つ設計は維持する(同じ型を何度も再構築する手間を避けるため)。

## 6. コード生成ロジック

ツリーを実際のTSソースに変換する。基本方針は「`infer`を除く全ノードを個別の`type`エイリアスとしてホイスト(巻き上げ)し、子は子のエイリアス名で参照する」こと。これにより、ツリーの途中のどのノードについても`checker.typeToString()`で型を取得・表示でき、各ノードの評価結果をUI上に出せる。

```ts
function generateSource(baseTypeSource: string, root: TypeNode): string {
  const lines = [baseTypeSource];
  const insideExtends = new Set<NodeId>();
  markExtendsSubtree(root, insideExtends); // conditionalのextends配下のノードidを収集

  function visit(node: TypeNode): string {
    if (node.kind === 'infer') {
      return insideExtends.has(node.id) ? `infer ${node.name}` : node.name;
    }
    if (node.kind === 'ref') {
      return node.name; // ベースの型 or 束縛済みinfer名への参照
    }
    const expr = renderExpression(node, visit);
    // conditionalのextends配下は丸ごとインラインで書く
    // (エイリアスに切り出すとinferの束縛が外れてしまうため)
    if (insideExtends.has(node.id)) return expr;
    const alias = `N_${node.id}`;
    lines.push(`type ${alias} = ${expr};`);
    return alias;
  }

  const rootRef = visit(root);
  lines.push(`type __Output = ${rootRef};`);
  return lines.join('\n');
}
```

`renderExpression`はkindごとに以下のような文字列を組み立てる(子は`visit(child)`の戻り値、つまり子のエイリアス名かインライン式):

| kind | 生成されるTS式 |
|---|---|
| `object` | `{ key1: <value1>; key2?: <value2> }` |
| `primitive` | `string` / `number` / `boolean` |
| `literal` | `'value'` / `123` / `true` |
| `union` | `<m1> \| <m2> \| ...` |
| `tuple` | `[<e1>, <e2>, ...]` |
| `array` | `<element>[]` |
| `keyof` | `keyof <target>` |
| `indexedAccess` | `<target>[<key>]` |
| `mappedType` | `{ [K in <keys>]: <source>[K] }` (transformで`?`や`[]`が付く) |
| `conditional` | `<check> extends <extends> ? <trueBranch> : <falseBranch>` |
| `templateLiteral` | 文字列セグメントはそのまま、ノードのセグメントは`${...}`で展開してバックティック文字列にする |

最後に`type __Output = ...;`を必ず追加し、評価対象を一意に特定する(9章のパズル判定もこの名前に依存する)。

## 7. 型評価エンジン (`@typescript/vfs` 連携)

```ts
import ts from 'typescript';
import { createSystem, createVirtualTypeScriptEnvironment, createDefaultMapFromCDN } from '@typescript/vfs';

const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2020,
  strict: true,
  skipLibCheck: true,
};

// 初回のみ: lib.d.ts群をCDNから取得し、localStorageにキャッシュ(@typescript/vfsが対応)
const fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, true, ts);
fsMap.set('index.ts', generatedSource);

const system = createSystem(fsMap);
const env = createVirtualTypeScriptEnvironment(system, ['index.ts'], ts, compilerOptions);

const program = env.languageService.getProgram()!;
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile('index.ts')!;

// __Output の型を文字列化
const outputNode = findTypeAliasNode(sourceFile, '__Output');
const outputType = checker.getTypeAtLocation(outputNode);
const displayString = checker.typeToString(outputType, undefined, ts.TypeFormatFlags.NoTruncation);

// コンパイルエラーがあれば収集
const diagnostics = ts.getPreEmitDiagnostics(program);
const errorMessages = diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
```

ブロックの変更があるたびに `env.updateFile('index.ts', newSource)` で差分更新し、`getProgram()` を再取得する(`createVirtualTypeScriptEnvironment` はファイル更新APIを持っているため、毎回 `Program` を作り直す必要はない)。

## 8. パフォーマンス方針: Web Worker化

- `typescript` 本体とlib.d.ts群は数百KB〜1.5MB程度になるため、初期化をメインスレッドで行うとUIがブロックされる
- 7章の処理一式は **Web Worker内に隔離**し、メインスレッド(Reactコンポーネント)とは `postMessage` でやり取りする
- lib.d.ts群のキャッシュ(`createDefaultMapFromCDN`の `shouldCache` オプション)を有効化し、2回目以降のロードを高速化する
- ブロック変更時の再コンパイルは即時実行でも問題ない想定(対象コードが数十行程度のため)だが、入力欄(prefix/suffixなど)の変更は **debounce(300ms程度)** をかけて不要な再コンパイルを抑制する

## 9. パズルの正誤判定ロジック

`checker.typeToString()` の文字列同士を単純比較すると、Union要素の順序差などで誤判定するリスクがある。そこで **型の比較自体もTypeScriptコンパイラにやらせる** 方式を取る。

生成コードの末尾に以下を追加してコンパイルし、コンパイルエラーの有無だけを見る:

```ts
type __Assert<T, U> =
  (<V>() => V extends T ? 1 : 2) extends (<V>() => V extends U ? 1 : 2) ? true : never;

const __check: __Assert<__Output, __Target> = true;
```

- `__Output` と `__Target` が構造的に同一の型であれば `__Assert<...>` は `true` になり、代入はエラーなしでコンパイルが通る → **正解**
- 一致しない場合は `__Assert<...>` が `never` になり、`true` を代入する行で型エラーが発生する → **不正解**

この方式の利点は、Union要素の順序やオブジェクトのプロパティ順序の違いに影響されず、TypeScript自身の型同一性判定ルールに完全に依存できること。`isTypeIdenticalTo` のような非公開の内部APIに依存する必要がない。

## 10. ブロック一覧

| ブロック(kind) | UIラベル例 | 子(スロット) | 追加パラメータ |
|---|---|---|---|
| `object` | Object | プロパティごとに1つ(可変長) | プロパティ名、optional有無 |
| `primitive` | Primitive | なし(葉) | `string` / `number` / `boolean` |
| `literal` | Literal | なし(葉) | 値(文字列/数値/真偽値) |
| `union` | Union (`\|`) | 2個以上(可変長) | なし |
| `tuple` | Tuple | N個(可変長、順序固定) | なし |
| `array` | Array (`T[]`) | 1個 | なし |
| `keyof` | keyof | 1個(対象) | なし |
| `indexedAccess` | T[K] | 2個(対象 / キー) | なし |
| `mappedType` | Mapped Type | 2個(キー集合 / 元のobject) | 変換: そのまま / 配列化 / optional化 |
| `conditional` | Conditional Type | 4個(check / extends / true / false) | なし(`check`がUnionなら自動分配) |
| `infer` | infer | なし(葉、特殊。5章参照) | 束縛名(例: `R`) |
| `templateLiteral` | Template Literal | 可変長(文字列セグメント or ノードの混在) | 各セグメントの文字列入力 |

## 11. パズル定義(v1で用意する3問)

```ts
const BASE_USER = `type User = { name: string; age: number; email: string; isAdmin: boolean };`;

const puzzles: Puzzle[] = [
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
```

パズルはこの配列に追加するだけで増やせる構造にする(UI側のロジック変更は不要)。

## 12. UI要件

### 共通
- モード切り替え(サンドボックス / パズル)
- 各ノードは「ノードカード」として表示し、子を持つノードはカードの中にさらに子のノードカードを入れ子で表示する(再帰的なカードUI)。空のスロットには「+ ブロックを選ぶ」ボタンを表示し、押すと12種のブロックパレット(+ ベースの型/束縛済みinfer名への参照)が開く
- 各ノードカードに削除ボタンを表示する(削除するとその子孫もまとめて削除される)
- 各ノードカードに評価結果(型の文字列、またはエラーメッセージ)を表示する。ただし`conditional`の`extends`配下のノードは6章の理由により単体の評価結果を表示せず、`extends`句全体としての評価結果のみ表示する

### ドラッグ&ドロップ(v1)

**操作の範囲**
- **移動のみ**。ドラッグしたノードとその子孫をまとめて切り取り、別スロットへ配置する(コピーはしない)
- **ドラッグ可能**: ツリー内の既存ノード(`TypeNode` / 内部 `ref` ノード)。各ノードカードにドラッグハンドル(≡ アイコン等)を付ける
- **ドラッグ不可**: トップレベルのルートノード(親スロットがないため)。空のルートスロットへのドロップは可
- **パレットからのドラッグは v1 非対応**。新規ブロック追加は「+ ブロックを選ぶ」→ パレット選択のみ

**スロットの識別子(`SlotRef`)**

各ドロップ先は「どの親の、どのスロットか」を一意に表す `SlotRef` で識別する。

```ts
type SlotRef =
  | { kind: 'root' }
  | { kind: 'single'; parentId: NodeId; slot: 'target' | 'element' | 'key' | 'check' | 'extends' | 'trueBranch' | 'falseBranch' | 'keys' | 'source' }
  | { kind: 'list'; parentId: NodeId; slot: 'members' | 'elements' | 'props' | 'parts'; index: number }
  | { kind: 'listAppend'; parentId: NodeId; slot: 'members' | 'elements' | 'props' | 'parts' };
```

- `single`: 子が1つだけのスロット(`keyof.target` など)
- `list`: 可変長配列スロットの index 番目(`union.members[1]` など)
- `listAppend`: リスト末尾への追加用ゾーン(「+ ブロックを選ぶ」の横、またはリスト最下部)
- `root`: ルートが空(`null`)のときのみ有効

`@dnd-kit` の droppable id は `SlotRef` を JSON 直列化した文字列を使う。

**ドロップ時の挙動**

| ドロップ先 | 挙動 |
|---|---|
| 空の `single` / `root` | 切り取ったノードをそのスロットに配置 |
| 埋まっている `single` | **入れ替え(Swap)** — 切り取ったノードがターゲットに入り、 displaced ノードがドラッグ元スロットへ移る |
| 空の `list` index / `listAppend` | 切り取ったノードをその index に挿入(`listAppend` は末尾) |
| 埋まっている `list` index | **その index に挿入** — 既存要素以降が1つ後ろにずれる(並べ替え) |
| 同一リスト内の移動 | 上記と同じ。元 index より後ろへ挿入する場合は、先に取り除いてから挿入する( index ずれを補正) |

**無効なドロップ(拒否)**

- ドラッグ中ノード自身のスロットへドロップ( no-op )
- ドラッグ中ノードの**子孫スロット**へドロップ(循環防止)
- トップレベルルートノード自体をドラッグ開始

型の妥当性(`infer` の束縛位置など)は **ドロップ阻止しない**。不正配置は本物コンパイラのエラー表示に委ねる(5章の方針と同じ)。

**ドラッグ中の UI**

- 有効な droppable: 枠線ハイライト(例: 青)
- 無効(子孫スロット等): ハイライトなし、ドロップ不可
- ドラッグオーバーレイ: ノードカードの半透明プレビュー
- 削除ボタン・パレット起動ボタンはドラッグ開始トリガーにしない(ハンドルのみ)

**ツリー更新ロジック(`lib/tree-ops.ts`)**

UI から直接 state を書き換えず、次の純関数 API 経由で更新する。

```ts
/** ドロップ可能か(循環・同一スロットのみ判定。型妥当性は見ない) */
function canDrop(root: TypeNode | null, draggedId: NodeId, target: SlotRef): boolean;

/** ノードを切り取り、ターゲットスロットへ移動。新しい root を返す */
function moveNode(root: TypeNode | null, draggedId: NodeId, target: SlotRef): TypeNode | null;
```

内部処理の流れ:
1. `draggedId` の部分木を抽出(深いコピーではなく参照移動)
2. 元の親スロットから除去
3. `target` の種別に応じて insert / swap を実行
4. 新しい `root` を返す

**空スロットの扱い**: UI 状態では 12章共通要件どおり、単一スロットも `null`(未配置)になり得る。5章の `TypeNode` 型定義は「配置済み」の形であり、ランタイム state では各子スロットを `TypeNode | null` として保持する。単一スロットから swap なしで切り出した場合、元スロットは空になり親ノードは「+ ブロックを選ぶ」表示のまま残る(未完成ツリーはコンパイラエラーになる)。

`onDragEnd` で `canDrop` → `moveNode` → React state 更新。`DndContext` はツリー全体を包む1つに置く。

**`@dnd-kit` 構成**

```
DndContext (page or tree panel)
  └─ NodeCard (再帰)
       ├─ useDraggable({ id: node.id }) … ルート以外
       └─ 各スロット
            └─ useDroppable({ id: serializeSlotRef(ref) })
```

`@dnd-kit/sortable` は使わない。リスト並べ替えも `list` / `listAppend` の droppable で統一し、木を横断する移動と同一コードパスにする。

**既存操作との関係**
- 「+ ブロックを選ぶ」「削除」は D&D と併存。削除は従来どおり子孫ごと削除
- 「やり直す」はツリー全体リセット(D&D 履歴の undo は v1 非対応)

### サンドボックスモード
- ベースの型 `T` のプロパティ行をテキスト入力+型セレクトで自由に編集可能(追加・削除可)
- ツリーのルートに何を置くかも自由(12種のどのブロックから始めてもよい)
- 上部に `type T = { ... }` のライブプレビュー表示

### パズルモード
- 上部にパズル切り替えタブ(問題1/問題2/問題3)
- 問題文 + 目標コード(`targetCodeDisplay`)を表示
- 「判定する」ボタン押下で9章のロジックを実行し、正解/不正解をバナー表示
- 「やり直す」ボタンで現在のツリーをリセット(ルートを空スロットに戻す)

## 13. ディレクトリ構成(案)

```
app/
  type-puzzle/
    page.tsx                 // ルートページ(クライアントコンポーネントをmount)
    components/
      ModeToggle.tsx
      SandboxPanel.tsx
      PuzzlePanel.tsx
      NodeCard.tsx              // 再帰的なノード表示の本体
      BlockPalette.tsx           // スロットを埋めるブロック選択UI
      BaseTypeEditor.tsx
      TreeDndContext.tsx           // DndContext + onDragEnd ハンドラ
    lib/
      nodes.ts                   // TypeNode定義、renderExpression
      tree-ops.ts                  // canDrop, moveNode, SlotRef
      codegen.ts                   // generateSource
      puzzles.ts                    // パズル定義一覧
      types.ts                       // TypeNode, Puzzle などの型定義
    workers/
      ts-eval.worker.ts               // @typescript/vfsを使った評価処理本体
      worker-client.ts                 // メインスレッド側のWorker通信ラッパー
```

## 14. 非機能要件

- すべての型評価処理はクライアントサイドのみで完結させる(サーバーへソースコードを送らない)
- オフライン時の挙動: lib.d.ts群がキャッシュ済みであれば再訪問時はネットワーク不要。初回ロードはネットワーク必須
- 対応ブラウザは最新のChrome/Edge/Safari/Firefoxを想定(Web Worker + dynamic importが動く環境)

## 15. 将来拡張(v1スコープ外)

- パレットからスロットへ直接ドラッグして新規ブロックを追加
- D&D 操作の undo / redo
- `infer`による束縛/参照以外の、任意ノード間の汎用的な参照・再利用(例: `keyof User`の結果を2箇所で使い回す)
- `tuple`のoptional要素・rest要素(`[string, ...number[]]`のような可変長パターン)対応
- パズルをAPI Routes + DBで永続化し、共有URLを発行する
- 解説記事ページの追加(Next.jsのSSR/SSGを活かした展開)

## 16. 要確認事項(実装前に決めておくこと)

- スタイリング手法(Tailwind CSSか、別の方法か)
- ホスティング先(静的書き出しか、Vercelなどへのデプロイか)
- `typescript` のバージョン固定方針(lib.d.ts取得時にバージョンを指定するため)
