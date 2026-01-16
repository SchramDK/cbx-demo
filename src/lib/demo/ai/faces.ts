

// Face metadata helpers (offline index)
// Loads public/demo/ai/stock-faces.json and exposes fast lookups

import fs from 'fs';
import path from 'path';

export type FaceBox = {
  box: { x: number; y: number; w: number; h: number };
  score: number;
};

export type FacesIndex = {
  meta: {
    generatedAt?: string;
    model?: string;
    assets?: number;
    detectedAssets?: number;
    skippedRemote?: number;
    missingFiles?: number;
  };
  faces: Record<string, FaceBox[]>;
};

function loadFacesIndex(): FacesIndex {
  try {
    const filePath = path.join(process.cwd(), 'public', 'demo', 'ai', 'stock-faces.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as FacesIndex;
  } catch {
    return { meta: {}, faces: {} };
  }
}

const index: FacesIndex = loadFacesIndex();

// Map: assetId -> facesCount
export const facesCountById = new Map<string, number>(
  Object.entries(index.faces ?? {}).map(([id, boxes]) => [id, boxes.length])
);

// Helpers
export function getFacesCount(assetId: string | number): number {
  return facesCountById.get(String(assetId)) ?? 0;
}

export function hasFaces(assetId: string | number): boolean {
  return getFacesCount(assetId) > 0;
}

// Very lightweight intent detection for search boosting
export function detectFaceIntent(query: string) {
  const q = query.toLowerCase();
  const wantsPeople = /(person|people|portrait|family|team|man|woman|child|children)/i.test(q);
  const wantsGroup = /(group|team|family)/i.test(q);
  const wantsNoPeople = /(landscape|nature|empty|no people|without people)/i.test(q);
  return { wantsPeople, wantsGroup, wantsNoPeople };
}

// Apply a small face-based score adjustment
export function applyFaceBoost(baseScore: number, assetId: string | number, query: string): number {
  let score = baseScore;
  const facesCount = getFacesCount(assetId);
  const { wantsPeople, wantsGroup, wantsNoPeople } = detectFaceIntent(query);

  if (wantsPeople && facesCount > 0) score += 0.08;
  if (wantsGroup && facesCount >= 2) score += 0.06;
  if (wantsNoPeople && facesCount > 0) score -= 0.05;

  return score;
}