import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const COMPONENTS_DIR = 'src/components';

const tsxFiles = (): string[] => {
  const dir = join(process.cwd(), COMPONENTS_DIR);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .map((f) => join(dir, f));
};

const STRIP_LINE_PATTERNS = [
  /\/\/.*$/gm,
  /\/\*[\s\S]*?\*\//g,
  /style\s*=\s*\{\{[\s\S]*?\}\}/g,
  /aria-label\s*=\s*\{[^}]*\}/g,
  /data-testid\s*=\s*"[^"]*"/g,
  /role\s*=\s*"[^"]*"/g,
  /key\s*=\s*\{[^}]*\}/g,
  /import\s+[^;]+;/g,
  /\bt\(['"`][^'"`]+['"`][^)]*\)/g,
  /useTranslation\([^)]*\)/g,
];

const STRIP_PATTERNS_GLOBAL = STRIP_LINE_PATTERNS;

const stripIgnoreSyntax = (source: string): string => {
  let out = source;
  for (const re of STRIP_PATTERNS_GLOBAL) out = out.replace(re, '');
  return out;
};

const findRenderableTextLiterals = (source: string): string[] => {
  const cleaned = stripIgnoreSyntax(source);
  const offenders: string[] = [];
  const jsxText = />\s*([A-Za-z][A-Za-z ,.!?'’\-—…0-9]{2,})\s*</g;
  let m: RegExpExecArray | null;
  while ((m = jsxText.exec(cleaned)) !== null) {
    const text = m[1].trim();
    if (/^\d+$/.test(text)) continue;
    offenders.push(text);
  }
  return offenders;
};

describe('hardcoded UI strings', () => {
  it('no component file contains JSX text literals (everything must come from t())', () => {
    const violations: Array<{ file: string; offenders: string[] }> = [];
    for (const file of tsxFiles()) {
      const source = readFileSync(file, 'utf8');
      const offenders = findRenderableTextLiterals(source);
      if (offenders.length > 0) violations.push({ file, offenders });
    }
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
});
