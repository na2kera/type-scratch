'use client';

import { useState } from 'react';

interface Props {
  source: string;
}

// Token types and their colors
type TokenKind = 'keyword' | 'builtin' | 'typeName' | 'string' | 'punctuation' | 'plain';

const TOKEN_COLORS: Record<TokenKind, string> = {
  keyword:    '#c084fc', // purple  — type, keyof, extends, infer, in
  builtin:    '#67e8f9', // cyan    — string, number, boolean, never, any, unknown
  typeName:   '#fbbf24', // amber   — User, Result, T, K, R ...（大文字始まり）
  string:     '#86efac', // green   — 'name', 'email' ...
  punctuation:'#94a3b8', // gray    — { } [ ] ( ) = ; : | & ? .
  plain:      '#e2e8f0', // light   — その他
};

const KEYWORDS = new Set(['type', 'keyof', 'extends', 'infer', 'in', 'readonly']);
const BUILTINS = new Set(['string', 'number', 'boolean', 'never', 'any', 'unknown', 'void', 'null', 'undefined']);

type Token = { kind: TokenKind; text: string };

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Single-quoted string
    if (code[i] === "'") {
      let j = i + 1;
      while (j < code.length && code[j] !== "'") j++;
      tokens.push({ kind: 'string', text: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Backtick template literal (whole thing as string)
    if (code[i] === '`') {
      let j = i + 1;
      while (j < code.length && code[j] !== '`') j++;
      tokens.push({ kind: 'string', text: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Line comment
    if (code[i] === '/' && code[i + 1] === '/') {
      let j = i;
      while (j < code.length && code[j] !== '\n') j++;
      tokens.push({ kind: 'punctuation', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Placeholder /* ? */
    if (code[i] === '/' && code[i + 1] === '*') {
      let j = i + 2;
      while (j < code.length - 1 && !(code[j] === '*' && code[j + 1] === '/')) j++;
      tokens.push({ kind: 'punctuation', text: code.slice(i, j + 2) });
      i = j + 2;
      continue;
    }

    // Word (keyword / builtin / type name / identifier)
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i + 1;
      while (j < code.length && /[\w$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      let kind: TokenKind = 'plain';
      if (KEYWORDS.has(word)) kind = 'keyword';
      else if (BUILTINS.has(word)) kind = 'builtin';
      else if (/^[A-Z]/.test(word)) kind = 'typeName';
      tokens.push({ kind, text: word });
      i = j;
      continue;
    }

    // Whitespace — preserve as-is
    if (/\s/.test(code[i])) {
      let j = i + 1;
      while (j < code.length && /\s/.test(code[j]) && code[j] !== '\n') j++;
      tokens.push({ kind: 'plain', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Newline
    if (code[i] === '\n') {
      tokens.push({ kind: 'plain', text: '\n' });
      i++;
      continue;
    }

    // Punctuation / operators
    tokens.push({ kind: 'punctuation', text: code[i] });
    i++;
  }

  return tokens;
}

function HighlightedCode({ source }: { source: string }) {
  const tokens = tokenize(source);
  return (
    <>
      {tokens.map((tok, i) =>
        tok.text === '\n' ? (
          <br key={i} />
        ) : (
          <span key={i} style={{ color: TOKEN_COLORS[tok.kind] }}>
            {tok.text}
          </span>
        )
      )}
    </>
  );
}

export default function CodePreview({ source }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(source).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="code-preview" style={{
      marginTop: '16px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1.5px solid #334155',
    }}>
      {/* Header bar */}
      <div className="code-preview-header" style={{
        background: '#0f172a',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #1e293b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
          </div>
          <span style={{
            fontFamily: 'Menlo, var(--font-geist-mono), ui-monospace, monospace',
            fontSize: '11px',
            color: '#475569',
            marginLeft: '4px',
          }}>
            generated code
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="code-copy-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 10px',
            borderRadius: '6px',
            border: '1px solid #334155',
            background: copied ? '#166534' : '#1e293b',
            color: copied ? '#86efac' : '#94a3b8',
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ コピーしました' : '📋 コピー'}
        </button>
      </div>

      {/* Code body */}
      <div className="code-preview-body" style={{
        background: '#1e293b',
        padding: '14px 16px',
        fontFamily: 'Menlo, var(--font-geist-mono), ui-monospace, monospace',
        fontSize: '12px',
        lineHeight: 1.7,
        overflowX: 'auto',
      }}>
        <HighlightedCode source={source} />
      </div>
    </div>
  );
}
