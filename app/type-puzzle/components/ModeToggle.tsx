'use client';

interface Props {
  mode: 'sandbox' | 'puzzle';
  onChange: (mode: 'sandbox' | 'puzzle') => void;
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex gap-0.5 bg-zinc-800 rounded-md p-0.5">
      <button
        onClick={() => onChange('sandbox')}
        className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${mode === 'sandbox' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        sandbox
      </button>
      <button
        onClick={() => onChange('puzzle')}
        className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${mode === 'puzzle' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}
      >
        puzzle
      </button>
    </div>
  );
}
