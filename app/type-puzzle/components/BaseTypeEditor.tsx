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

  const preview = `type T = { ${rows.map(r => `${r.key}: ${r.type}`).join('; ')} }`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="text-sm font-semibold text-gray-700 mb-2">ベースの型 T</div>
      <div className="font-mono text-xs text-gray-500 bg-gray-50 rounded p-2 mb-2">{preview}</div>
      <div className="space-y-1">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.key}
              onChange={e => updateRow(i, { key: e.target.value })}
              className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-28 font-mono"
              placeholder="key"
            />
            <span className="text-gray-400 text-xs">:</span>
            <select
              value={row.type}
              onChange={e => updateRow(i, { type: e.target.value as PrimitiveTypeName })}
              className="text-xs border border-gray-200 rounded px-1 py-0.5"
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
            </select>
            <button onClick={() => removeRow(i)} className="text-xs text-red-300 hover:text-red-500">×</button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="mt-2 text-xs text-blue-500 hover:text-blue-700">+ プロパティ追加</button>
    </div>
  );
}
