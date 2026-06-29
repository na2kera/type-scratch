'use client';

interface Props {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  hasRoot: boolean;
}

export default function UndoControls({ onUndo, onRedo, canUndo, canRedo, onReset, hasRoot }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="元に戻す (Ctrl+Z)"
        className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ↩ Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="やり直す (Ctrl+Shift+Z)"
        className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ↪ Redo
      </button>
      {hasRoot && (
        <button onClick={onReset} className="text-xs text-gray-400 hover:text-red-400">
          全リセット
        </button>
      )}
    </div>
  );
}
