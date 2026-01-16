// src/lib/ai/stockAiSearch.ts
export type AiStockItem = {
    id: string;
    title: string;
    category: string;
    preview: string;
    document: string;
    embedding: number[];
  };
  
  type LoadedItem = AiStockItem & {
    // normalized embedding for cosine similarity
    _norm: number[];
  };
  
  let _indexPromise: Promise<LoadedItem[] | null> | null = null;
  
  function normalize(vec: number[]): number[] {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
    const denom = Math.sqrt(sumSq) || 1;
    const out = new Array(vec.length);
    for (let i = 0; i < vec.length; i++) out[i] = vec[i] / denom;
    return out;
  }
  
  function dot(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    let s = 0;
    for (let i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  }
  
  async function loadIndex(): Promise<LoadedItem[] | null> {
    // Client-side fetch of static file
    try {
      const res = await fetch("/demo/ai/stock-index.json", { cache: "force-cache" });
      if (!res.ok) return null;
      const raw = (await res.json()) as AiStockItem[];
      return raw.map((it) => ({ ...it, _norm: normalize(it.embedding) }));
    } catch {
      return null;
    }
  }
  
  // Optional: super simple “query embedding”.
  // For now we approximate semantic match by embedding-free text scoring on `document`
  // AND allow a hook for real query-embedding later.
  function simpleTextScore(query: string, doc: string): number {
    const q = query.trim().toLowerCase();
    if (!q) return 0;
    const hay = doc.toLowerCase();
  
    // tiny scoring: exact phrase gets a bigger bump, token matches smaller bumps
    let score = 0;
    if (hay.includes(q)) score += 5;
  
    const tokens = q.split(/\s+/).filter(Boolean);
    for (const t of tokens) {
      if (t.length < 2) continue;
      if (hay.includes(t)) score += 1;
    }
    return score;
  }
  
  /**
   * AI search (v1):
   * - Uses text scoring now (document/title/category)
   * - Supports swapping in real query embeddings later without changing call sites
   */
  export async function aiSearchStock(query: string, opts?: { limit?: number }) {
    const limit = opts?.limit ?? 40;
    const q = query.trim();
    if (!q) return [];
  
    if (!_indexPromise) _indexPromise = loadIndex();
    const index = await _indexPromise;
    if (!index) return [];
  
    // v1: text-based scoring (fast + surprisingly good for your enriched "document")
    const scored = index
      .map((it) => {
        const score =
          simpleTextScore(q, it.title) * 2 +
          simpleTextScore(q, it.category) * 1 +
          simpleTextScore(q, it.document) * 3;
  
        return { it, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.it);
  
    return scored;
  }
  
  /**
   * AI search (v2-ready):
   * If/when you add query embeddings, you can implement:
   * - getQueryEmbedding(query) -> number[]
   * - cosine similarity vs it._norm
   * and combine cosine + textScore.
   */