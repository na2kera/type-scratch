'use client';

import { useState } from 'react';

interface Props {
  onDismiss: () => void;
}

const STEPS = [
  {
    title: '型をビジュアルに組み立てよう',
    body: 'TypeScript の型はブロックの組み合わせで表現できます。このツールでドラッグ&ドロップしながら型の構造を学べます。',
    hint: null,
    code: null,
  },
  {
    title: 'ブロックを追加する',
    body: '点線エリアをクリックするとパレットが開きます。Union・Object・Array などブロックを選んでルートに配置します。パレットからスロットへドラッグして追加することもできます。',
    hint: '+ ルートブロックを選ぶ をクリック',
    code: null,
  },
  {
    title: 'スロットに入れ子にする',
    body: 'ブロックの中の点線枠（スロット）をクリックすると新たなブロックを追加できます。これで型を入れ子に組み立てられます。',
    hint: null,
    code: 'Array( keyof( T ) )',
  },
  {
    title: '移動・削除',
    body: 'ブロック右端の ≡ をドラッグして別のスロットへ移動できます。ドラッグ中に画面下に現れるゴミ箱へドロップすると削除できます。',
    hint: 'Ctrl+Z / Ctrl+Shift+Z で Undo/Redo',
    code: null,
  },
  {
    title: 'パズルに挑戦！',
    body: '右上の puzzle タブに切り替えると、出題された型と同じ型ツリーを組み立てる問題に挑戦できます。正解すると タブに ✓ が付いて進捗が保存されます。',
    hint: '「判定する」ボタンで答え合わせ',
    code: null,
  },
];

export default function Tutorial({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-zinc-900 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 border border-zinc-700 rounded px-1.5 py-0.5 leading-tight">TS</span>
            <span className="text-xs font-mono text-zinc-300 tracking-tight">type-puzzle — tutorial</span>
          </div>
          <button onClick={onDismiss} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">×</button>
        </div>

        <div className="px-6 py-6">
          <div className="text-xs font-mono text-zinc-400 mb-2">{step + 1} / {STEPS.length}</div>
          <h2 className="text-base font-semibold text-zinc-900 mb-3">{current.title}</h2>
          <p className="text-sm text-zinc-600 leading-relaxed mb-4">{current.body}</p>
          {current.code && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 font-mono text-sm text-zinc-700 mb-4">
              {current.code}
            </div>
          )}
          {current.hint && (
            <div className="text-xs text-zinc-400">
              <span className="text-zinc-300 mr-1">→</span>{current.hint}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-zinc-700' : 'bg-zinc-300 hover:bg-zinc-400'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700"
              >
                戻る
              </button>
            )}
            {isLast ? (
              <button
                onClick={onDismiss}
                className="px-4 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-700 transition-colors"
              >
                はじめる
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-4 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-md hover:bg-zinc-700 transition-colors"
              >
                次へ
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
