/*
  MVP AI indexing script for demo stock assets
  ------------------------------------------------
  - Builds a semantic index for search (text embeddings)
  - Safe to run locally (no runtime dependency in app)
  - Output is a static JSON file used by the frontend

  Run from repo root (cbx-demo):
    pnpm ts-node src/app/scripts/ai/index-assets.ts

  Output:
    public/demo/ai/stock-index.json
*/

import fs from 'fs';
import path from 'path';

// NOTE: use relative import (ts-node does not resolve @/ aliases by default)
import { STOCK_ASSETS } from '../../../lib/demo/stock-assets';

type IndexedAsset = {
  id: string;
  title: string;
  category?: string;
  preview: string;
  document: string;
  embedding: number[];
  tokens: string[];
};

type VocabEntry = {
  term: string;
  df: number;
  idf: number;
};

const DIM = 192;
const NGRAM_MIN = 3;
const NGRAM_MAX = 5;
const OUT_INDEX = 'stock-index.json';
const OUT_VOCAB = 'stock-vocab.json';
const CONCURRENCY = 8;

function normalizeText(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(s: string): string[] {
  const parts = normalizeText(s)
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of parts) {
    if (t.length < 2) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function charNgrams(s: string, minN = NGRAM_MIN, maxN = NGRAM_MAX): string[] {
  const clean = ` ${normalizeText(s)} `;
  const grams: string[] = [];
  for (let n = minN; n <= maxN; n++) {
    if (clean.length < n) continue;
    for (let i = 0; i <= clean.length - n; i++) grams.push(clean.slice(i, i + n));
  }
  return grams;
}

function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

async function embed(text: string): Promise<number[]> {
  const vec = new Array<number>(DIM).fill(0);
  const grams = charNgrams(text);

  for (const g of grams) {
    const h = fnv1a32(g);
    const idx = h % DIM;
    const sign = (h & 1) === 1 ? 1 : -1;
    vec[idx] += sign;
  }

  return l2Normalize(vec);
}

function buildDocument(asset: any): { document: string; tokens: string[] } {
  const title = normalizeText(asset.title);
  const desc = normalizeText(asset.description ?? '');
  const cat = normalizeText(asset.category ?? '');

  const kw = Array.isArray(asset.keywords) ? asset.keywords.map(normalizeText) : [];
  const tags = Array.isArray(asset.tags) ? asset.tags.map(normalizeText) : [];

  const raw = [title, title, desc, kw.join(' '), tags.join(' '), cat]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = tokenizeText(raw);
  return { document: raw.slice(0, 1400), tokens };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return out;
}

async function run() {
  // eslint-disable-next-line no-console
  console.log(`[ai-index] CWD: ${process.cwd()}`);

  if (!Array.isArray(STOCK_ASSETS) || STOCK_ASSETS.length === 0) {
    // eslint-disable-next-line no-console
    console.error(
      '[ai-index] STOCK_ASSETS is empty — index will not be generated. Check import path / build.'
    );
    process.exit(1);
  }

  const docs = STOCK_ASSETS.map((asset) => {
    const built = buildDocument(asset);
    return { asset, document: built.document, tokens: built.tokens };
  });

  const out: IndexedAsset[] = await mapPool(docs, CONCURRENCY, async (d) => {
    const embedding = await embed(d.document);
    return {
      id: String(d.asset.id),
      title: String(d.asset.title ?? ''),
      category: d.asset.category,
      preview: String(d.asset.preview ?? ''),
      document: d.document,
      embedding,
      tokens: d.tokens,
    };
  });

  const df = new Map<string, number>();
  for (const item of out) {
    const seen = new Set<string>();
    for (const t of item.tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  const N = Math.max(1, out.length);
  const vocab: VocabEntry[] = Array.from(df.entries())
    .map(([term, count]) => ({ term, df: count, idf: Math.log(1 + N / (1 + count)) }))
    .sort((a, b) => b.idf - a.idf);

  const meta = {
    generatedAt: new Date().toISOString(),
    dim: DIM,
    ngramMin: NGRAM_MIN,
    ngramMax: NGRAM_MAX,
    assets: out.length,
    vocabSize: vocab.length,
  };

  const outDir = path.join(process.cwd(), 'public/demo/ai');
  fs.mkdirSync(outDir, { recursive: true });

  const indexFile = path.join(outDir, OUT_INDEX);
  fs.writeFileSync(indexFile, JSON.stringify(out, null, 2) + '\n', 'utf-8');

  const vocabFile = path.join(outDir, OUT_VOCAB);
  fs.writeFileSync(vocabFile, JSON.stringify({ meta, vocab }, null, 2) + '\n', 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`[ai-index] Output dir: ${outDir}`);
  // eslint-disable-next-line no-console
  console.log(`[ai-index] Wrote index: ${indexFile} (${fs.statSync(indexFile).size} bytes)`);
  // eslint-disable-next-line no-console
  console.log(`[ai-index] Wrote vocab: ${vocabFile} (${fs.statSync(vocabFile).size} bytes)`);
  // eslint-disable-next-line no-console
  console.log(`[ai-index] Indexed: ${out.length} assets`);
  // eslint-disable-next-line no-console
  console.log(`[ai-index] Vocab: ${vocab.length} terms (dim=${DIM}, ngrams=${NGRAM_MIN}-${NGRAM_MAX})`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[ai-index] Failed to generate stock index');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
