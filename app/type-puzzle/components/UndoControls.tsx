'use client';

interface Props {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  hasRoot: boolean;
}

const btnBase: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: '8px',
  border: '1.5px solid #e2e8f0',
  background: 'white',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '12px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.1s',
  color: '#64748b',
};

const btnDisabled: React.CSSProperties = {
  ...btnBase,
  opacity: 0.35,
  cursor: 'not-allowed',
};

export default function UndoControls({ onUndo, onRedo, canUndo, canRedo, onReset, hasRoot }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="元に戻す (Ctrl+Z)"
        style={canUndo ? btnBase : btnDisabled}
      >
        ↩ Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="やり直す (Ctrl+Shift+Z)"
        style={canRedo ? btnBase : btnDisabled}
      >
        ↪ Redo
      </button>
      {hasRoot && (
        <button
          onClick={onReset}
          style={{
            ...btnBase,
            border: '1.5px solid #fecaca',
            color: '#ef4444',
            background: '#fff5f5',
          }}
        >
          リセット
        </button>
      )}
    </div>
  );
}
