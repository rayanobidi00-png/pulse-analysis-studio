// Pulls a single exported function out of a TypeScript source file (imported with ?raw)
// so each step can show the exact code that produced its numbers.
export function extractFn(src: string, name: string): string {
  const re = new RegExp(`(/\\*\\*[\\s\\S]*?\\*/\\n)?export function ${name}\\b`);
  const m = re.exec(src);
  if (!m) return src;
  const start = m.index;
  const open = src.indexOf('{', src.indexOf(')', start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return src.slice(start);
}
