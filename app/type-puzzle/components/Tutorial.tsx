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
    emoji: '🧩',
  },
  {
    title: 'ブロックを追加する',
    body: '点線エリアをクリックするとパレットが開きます。Union・Object・Array などブロックを選んでルートに配置します。パレットからスロットへドラッグして追加することもできます。',
    hint: '「+ ルートブロックを選ぶ」をクリック',
    code: null,
    emoji: '➕',
  },
  {
    title: 'スロットに入れ子にする',
    body: 'ブロックの中の点線枠（スロット）をクリックすると新たなブロックを追加できます。これで型を入れ子に組み立てられます。',
    hint: null,
    code: 'Array( keyof( T ) )',
    emoji: '🔗',
  },
  {
    title: '移動・削除',
    body: 'ブロック右端の ⠿ をドラッグして別のスロットへ移動できます。ドラッグ中に画面下に現れるゴミ箱へドロップすると削除できます。',
    hint: 'Ctrl+Z / Ctrl+Shift+Z で Undo/Redo',
    code: null,
    emoji: '↔️',
  },
  {
    title: 'パズルに挑戦！',
    body: '上の puzzle タブに切り替えると、出題された型と同じ型ツリーを組み立てる問題に挑戦できます。正解するとタブに ✓ が付いて進捗が保存されます。',
    hint: '「判定する」ボタンで答え合わせ',
    code: null,
    emoji: '🎯',
  },
];

export default function Tutorial({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(15,23,42,0.6)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: '440px',
        margin: '16px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: '#2563eb',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'white', borderRadius: '8px', padding: '4px 10px' }}>
              <span style={{ color: '#2563eb', fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', fontWeight: 700, fontSize: '12px' }}>TS</span>
            </div>
            <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '13px', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
              type-scratch — チュートリアル
            </span>
          </div>
          <button
            onClick={onDismiss}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ background: '#f8fafc', padding: '8px 20px', display: 'flex', gap: '6px', borderBottom: '1.5px solid #e2e8f0' }}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={s.title}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                border: 'none',
                background: i <= step ? '#2563eb' : '#e2e8f0',
                cursor: 'pointer',
                transition: 'background 0.2s',
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>{current.emoji}</div>
          <h2 style={{ fontFamily: 'var(--font-fredoka), sans-serif', fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
            {current.title}
          </h2>
          <p style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '14px', color: '#475569', lineHeight: 1.65, marginBottom: '14px' }}>
            {current.body}
          </p>
          {current.code && (
            <div style={{
              background: '#1e293b',
              borderRadius: '10px',
              padding: '12px 16px',
              fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
              fontSize: '13px',
              color: '#67e8f9',
              fontWeight: 600,
              marginBottom: '14px',
            }}>
              {current.code}
            </div>
          )}
          {current.hint && (
            <div style={{
              padding: '8px 14px',
              background: '#eff6ff',
              borderRadius: '8px',
              borderLeft: '3px solid #2563eb',
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
              fontSize: '12px',
              color: '#1d4ed8',
              fontWeight: 600,
            }}>
              💡 {current.hint}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div style={{ padding: '12px 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            {step + 1} / {STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  background: 'white',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                ← 戻る
              </button>
            )}
            {isLast ? (
              <button
                onClick={onDismiss}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                }}
              >
                🚀 はじめる
              </button>
            ) : (
              <button
                onClick={() => setStep(s => s + 1)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2563eb',
                  color: 'white',
                  fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
                }}
              >
                次へ →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
