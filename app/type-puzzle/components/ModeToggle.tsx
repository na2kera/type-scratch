'use client';

interface Props {
  mode: 'sandbox' | 'puzzle';
  onChange: (mode: 'sandbox' | 'puzzle') => void;
}

export default function ModeToggle({ mode, onChange }: Props) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '10px', padding: '3px', display: 'flex', gap: '2px' }}>
      {(['sandbox', 'puzzle'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: '5px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            fontFamily: 'Nunito, sans-serif',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: mode === m ? 'white' : 'transparent',
            color: mode === m ? '#2563eb' : 'rgba(255,255,255,0.8)',
            boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
