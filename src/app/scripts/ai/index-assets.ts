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
};

async function embed(text: string): Promise<number[]> {
  // TEMP: deterministic fake embedding for demo/testing
  const hash = Array.from(text).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return Array.from({ length: 64 }, (_, i) => Math.sin(hash + i));
}

function buildDocument(asset: any): string {
  return [
    asset.title,
    asset.description,
    ...(asset.keywords ?? []),
    ...(asset.tags ?? []),
    asset.category,
  ]
    .filter(Boolean)
    .join(' ');
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

  const out: IndexedAsset[] = [];

  for (const asset of STOCK_ASSETS) {
    const document = buildDocument(asset);
    const embedding = await embed(document);

    out.push({
      id: asset.id,
      title: asset.title,
      category: asset.category,
      preview: asset.preview,
      document,
      embedding,
    });
  }

  const outDir = path.join(process.cwd(), 'public/demo/ai');
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'stock-index.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2) + '\n', 'utf-8');

  // eslint-disable-next-line no-console
  console.log(`[ai-index] Output dir: ${outDir}`);
  // eslint-disable-next-line no-console
  console.log(`[ai-index] Wrote file: ${outFile} (${fs.statSync(outFile).size} bytes)`);
  // eslint-disable-next-line no-console
  console.log(`[ai-index] Indexed: ${out.length} assets`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[ai-index] Failed to generate stock index');
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
