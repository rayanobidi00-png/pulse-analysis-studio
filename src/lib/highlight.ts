// Tiny syntax highlighter for R, SQL and TypeScript snippets (escapes HTML first).
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const KW: Record<string, string[]> = {
  r: ['function', 'if', 'else', 'for', 'in', 'TRUE', 'FALSE', 'NULL', 'NA', 'library', 'return'],
  sql: ['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'ORDER', 'AS', 'AND', 'OR', 'COUNT', 'AVG', 'SUM', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'CREATE', 'TABLE', 'INSERT', 'INTO', 'VALUES', 'LIMIT', 'DESC', 'ASC', 'HAVING', 'ROUND', 'IS', 'NULL', 'NOT', 'DISTINCT', 'INTEGER', 'TEXT', 'REAL', 'MIN', 'MAX', 'ALTER', 'ADD', 'COLUMN', 'UPDATE', 'SET', 'DROP', 'IF', 'EXISTS', 'OFFSET', 'LIKE', 'IN', 'ON', 'JOIN'],
  ts: ['export', 'function', 'const', 'let', 'return', 'for', 'if', 'else', 'of', 'new', 'import', 'from', 'type', 'interface', 'number', 'string', 'readonly', 'true', 'false'],
};

export function highlight(code: string, lang: 'r' | 'sql' | 'ts'): string {
  const comment = lang === 'r' ? /#.*$/ : lang === 'sql' ? /--.*$/ : /\/\/.*$|\/\*[\s\S]*?\*\//;
  const token = new RegExp(
    `(${comment.source})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\`)|(\\b\\d+(?:\\.\\d+)?(?:e-?\\d+)?\\b)|(\\b[A-Za-z_][\\w.]*(?=\\())|(\\b[A-Za-z_]\\w*\\b)`,
    'gm' + (lang === 'sql' ? 'i' : ''),
  );
  const kws = new Set(KW[lang].map((k) => (lang === 'sql' ? k.toUpperCase() : k)));
  let out = '';
  let last = 0;
  for (const m of code.matchAll(token)) {
    out += esc(code.slice(last, m.index));
    const [t, c, s, n, f, w] = m;
    if (c) out += `<span style="color:var(--code-c)">${esc(t)}</span>`;
    else if (s) out += `<span style="color:var(--code-s)">${esc(t)}</span>`;
    else if (n) out += `<span style="color:var(--code-n)">${esc(t)}</span>`;
    else if (f) out += `<span style="color:var(--code-f)">${esc(t)}</span>`;
    else if (w && kws.has(lang === 'sql' ? w.toUpperCase() : w)) out += `<span style="color:var(--code-k)">${esc(t)}</span>`;
    else out += esc(t);
    last = (m.index ?? 0) + t.length;
  }
  return out + esc(code.slice(last));
}
