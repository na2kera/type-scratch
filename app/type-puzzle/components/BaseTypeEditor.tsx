'use client';

import { BaseRow, PrimitiveTypeName } from '../lib/types';

interface Props {
  rows: BaseRow[];
  onChange: (rows: BaseRow[]) => void;
}

export default function BaseTypeEditor({ rows, onChange }: Props) {
  function addRow() {
    onChange([...rows, { key: 'field', type: 'string' }]);
  }

  function removeRow(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }

  function updateRow(i: number, patch: Partial<BaseRow>) {
    const next = [...rows];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  const preview = `type T = {\n  ${rows.map(r => `${r.key}: ${r.type}`).join('\n  ')}\n}`;

  return (
    <div style={{
      background: 'white',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1.5px solid #e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1.5px solid #e2e8f0',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: '8px',
          height: '20px',
          borderRadius: '3px',
          background: '#f59e0b',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'Fira Code, monospace',
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          base type T
        </span>
      </div>

      {/* Preview */}
      <div style={{
        background: '#1e293b',
        padding: '10px 14px',
        fontFamily: 'Fira Code, monospace',
        fontSize: '11px',
        color: '#94a3b8',
        whiteSpace: 'pre',
        borderBottom: '1.5px solid #e2e8f0',
        lineHeight: 1.6,
      }}>
        <span style={{ color: '#7c3aed' }}>type </span>
        <span style={{ color: '#f59e0b' }}>T</span>
        <span style={{ color: '#94a3b8' }}> = {'{'}</span>
        {rows.map((r, i) => (
          <span key={i}>
            {'\n  '}
            <span style={{ color: '#86efac' }}>{r.key}</span>
            <span style={{ color: '#94a3b8' }}>: </span>
            <span style={{ color: '#67e8f9' }}>{r.type}</span>
            {i < rows.length - 1 && <span style={{ color: '#94a3b8' }}>;</span>}
          </span>
        ))}
        {'\n'}
        <span style={{ color: '#94a3b8' }}>{'}'}</span>
      </div>

      {/* Editor rows */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                value={row.key}
                onChange={e => updateRow(i, { key: e.target.value })}
                style={{
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '7px',
                  padding: '4px 8px',
                  width: '90px',
                  color: '#1e293b',
                  background: 'white',
                  outline: 'none',
                }}
                placeholder="key"
              />
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 700 }}>:</span>
              <select
                value={row.type}
                onChange={e => updateRow(i, { type: e.target.value as PrimitiveTypeName })}
                style={{
                  fontFamily: 'Fira Code, monospace',
                  fontSize: '12px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '7px',
                  padding: '4px 6px',
                  color: '#1e293b',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
              </select>
              <button
                onClick={() => removeRow(i)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: '0 2px',
                  marginLeft: 'auto',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addRow}
          style={{
            marginTop: '10px',
            padding: '5px 12px',
            borderRadius: '8px',
            border: '1.5px dashed #cbd5e1',
            background: 'transparent',
            color: '#64748b',
            fontFamily: 'Nunito, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.1s',
          }}
        >
          + プロパティ追加
        </button>
      </div>
    </div>
  );
}
