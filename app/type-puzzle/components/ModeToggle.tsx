'use client';

interface Props {
  mode: 'sandbox' | 'puzzle';
  onChange: (mode: 'sandbox' | 'puzzle') => void;
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => onChange('sandbox')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'sandbox' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        サンドボックス
      </button>
      <button
        onClick={() => onChange('puzzle')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'puzzle' ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
      >
        パズル
      </button>
    </div>
  );
}
