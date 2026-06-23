import React from 'react';

// Rendu Markdown léger (gras **x**, italique *x*, code `x`, listes - / *).
// Construit des éléments React (aucune injection HTML).
function renderInline(s: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  while ((m = regex.exec(s))) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<em key={key++}>{m[3]}</em>);
    else if (m[4] !== undefined) nodes.push(<code key={key++} style={{ background: 'var(--soft2)', borderRadius: 4, padding: '1px 5px', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.92em' }}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return nodes;
}

export function MarkdownText({ text, style }: { text: string; style?: React.CSSProperties }) {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0; let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} style={{ margin: '4px 0', paddingLeft: 20 }}>
          {items.map((it, j) => <li key={j} style={{ marginBottom: 2 }}>{renderInline(it)}</li>)}
        </ul>
      );
    } else {
      blocks.push(<div key={key++} style={{ minHeight: line.trim() ? undefined : '1em' }}>{renderInline(line)}</div>);
      i++;
    }
  }
  return <div style={style}>{blocks}</div>;
}
