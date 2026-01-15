// src/lib/demo/stock-assets.ts
export type StockAsset = {
  id: string;
  title: string;
  preview: string;
  category: StockCategory;
  description?: string;
  keywords?: string[];
  tags?: string[];
};

export type StockCategory = 'nature' | 'city' | 'lifestyle' | 'wildlife' | 'energy';

export const STOCK_CATEGORIES: { key: StockCategory; label: string }[] = [
  { key: 'nature', label: 'Nature' },
  { key: 'city', label: 'City' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'energy', label: 'Energy' },
];

export const STOCK_FEATURED_IDS = ['s-001', 's-004', 's-011', 's-012'] as const;

const uniqLower = (items?: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of items ?? []) {
    const v = (raw ?? '').toString().trim().toLowerCase();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
};

const defineStockAsset = (a: Omit<StockAsset, 'keywords' | 'tags'> & { keywords?: string[]; tags?: string[] }) => {
  const keywords = uniqLower(a.keywords);
  const tags = uniqLower([...(a.tags ?? []), a.category]);
  return {
    ...a,
    keywords: keywords.length ? keywords : undefined,
    tags: tags.length ? tags : undefined,
  };
};

const validateStockAssets = (assets: StockAsset[]) => {
  if (process.env.NODE_ENV === 'production') return;

  const ids = new Set<string>();
  for (const a of assets) {
    if (ids.has(a.id)) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Duplicate id detected: ${a.id}`);
    }
    ids.add(a.id);

    if (!a.preview || !a.preview.startsWith('/demo/stock/')) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Suspicious preview path for ${a.id}: ${a.preview}`);
    }
  }
};

export const STOCK_ASSETS: StockAsset[] = [
  defineStockAsset({
    id: "s-001",
    title: "Lofoten Islands fjords in winter",
    category: "nature",
    description: "Dramatic winter night landscape from the Lofoten Islands in Norway. Snow-covered mountains, icy fjords, and calm reflections under a Nordic sky. Ideal for travel, nature, and Scandinavian winter concepts.",
    keywords: ["lofoten", "norway", "fjord", "winter", "mountains", "snow", "scandinavia", "nature", "travel"],
    tags: ["nature", "winter", "scandinavia", "travel"],
    preview: "/demo/stock/COLOURBOX69824938.jpg",
  }),
  defineStockAsset({
    id: "s-002",
    title: "Painted lady butterfly on purple flower",
    category: "nature",
    description: "Painted lady butterfly resting on a purple flower with a bumblebee in the background. Close-up nature scene highlighting pollination, biodiversity, and summer wildlife.",
    keywords: ["butterfly", "painted lady", "flower", "purple flower", "bumblebee", "insect", "pollination", "nature", "wildlife", "summer"],
    tags: ["nature", "wildlife", "insects"],
    preview: "/demo/stock/COLOURBOX69347861.jpg",
  }),
  defineStockAsset({
    id: "s-003",
    title: "Wooden jetty at sunset on a Swedish lake",
    category: "nature",
    description: "Peaceful wooden jetty stretching into a calm Swedish lake at sunset. Warm evening light reflected in the water creates a tranquil Nordic summer atmosphere. Ideal for nature, travel, and outdoor concepts.",
    keywords: ["wooden jetty", "lake", "sunset", "sweden", "scandinavia", "reflection", "water", "nature", "travel", "summer"],
    tags: ["nature", "lake", "sunset", "scandinavia"],
    preview: "/demo/stock/COLOURBOX65929181.jpg",
  }),
  defineStockAsset({
    id: "s-004",
    title: "Aurora borealis over snowy Scandinavian mountains",
    category: "nature",
    description: "Northern lights dancing across a starry night sky above snow-covered mountains in Scandinavia. Dramatic winter landscape featuring aurora borealis, ice, and Arctic atmosphere.",
    keywords: ["aurora borealis", "northern lights", "scandinavia", "winter", "snow", "ice", "mountains", "night sky", "stars", "nature"],
    tags: ["nature", "winter", "aurora", "scandinavia"],
    preview: "/demo/stock/COLOURBOX62267472.jpg",
  }),
  defineStockAsset({
    id: "s-005",
    title: "Historic streets of Copenhagen old town",
    category: "city",
    description: "Scenic historic streets in the old town of Copenhagen, Denmark. Colorful buildings, cobblestone roads, and classic Nordic architecture capturing the charm of a European capital city.",
    keywords: ["copenhagen", "denmark", "old town", "historic streets", "city", "architecture", "europe", "travel", "urban", "scandinavia"],
    tags: ["city", "architecture", "travel", "scandinavia"],
    preview: "/demo/stock/COLOURBOX61870698.jpg",
  }),
  defineStockAsset({
    id: "s-006",
    title: "Golden eagle (Aquila chrysaetos)",
    category: "nature",
    description: "Majestic golden eagle (Aquila chrysaetos) captured in its natural habitat. Powerful bird of prey symbolizing strength, wilderness, and freedom. Ideal for wildlife, nature, and conservation themes.",
    keywords: ["golden eagle", "aquila chrysaetos", "eagle", "bird of prey", "raptor", "wildlife", "nature", "predator", "wilderness"],
    tags: ["nature", "wildlife", "birds"],
    preview: "/demo/stock/COLOURBOX61700014.jpg",
  }),
  defineStockAsset({
    id: "s-007",
    title: "Fishing boat at Lild Beach, Denmark",
    category: "nature",
    description: "Fishing boat resting on the shore at Lild Beach on the Danish west coast. Windswept coastal landscape with sand, sea, and Nordic light, capturing the raw beauty of Scandinavian coastal life.",
    keywords: ["fishing boat", "lild beach", "denmark", "coast", "sea", "beach", "scandinavia", "coastal", "nature", "travel"],
    tags: ["nature", "coast", "sea", "scandinavia"],
    preview: "/demo/stock/COLOURBOX60398323.jpg",
  }),
  defineStockAsset({
    id: "s-008",
    title: "Aurora borealis over Sommarøy peninsula, Norway",
    category: "nature",
    description: "Spectacular aurora borealis illuminating the night sky over the Sommarøy peninsula in northern Norway. Snowy landscape and Arctic coastline captured under vivid northern lights in early spring.",
    keywords: ["aurora borealis", "northern lights", "sommaroy", "norway", "arctic", "night sky", "winter", "march", "scandinavia", "nature"],
    tags: ["nature", "aurora", "arctic", "scandinavia"],
    preview: "/demo/stock/COLOURBOX59968202.jpg",
  }),
  defineStockAsset({
    id: "s-009",
    title: "Bicycle parked on urban street",
    category: "city",
    description: "Bicycle parked outdoors on a city street, capturing everyday urban life and sustainable transportation. Ideal for lifestyle, mobility, and modern city concepts.",
    keywords: ["bicycle", "bike", "cycling", "urban", "street", "city", "transport", "mobility", "lifestyle", "outdoors"],
    tags: ["city", "lifestyle", "transport"],
    preview: "/demo/stock/COLOURBOX53928483.jpg",
  }),
  defineStockAsset({
    id: "s-010",
    title: "Woman relaxing in city park by pond in the rain",
    category: "lifestyle",
    description: "Lifestyle scene of a woman sitting by a city park pond, feeding two swans while holding an umbrella in the rain. Calm urban outdoor moment capturing everyday life, reflection, and leisure in a public space.",
    keywords: ["city park", "woman", "lifestyle", "pond", "swans", "umbrella", "rain", "urban", "outdoor", "weekend", "leisure"],
    tags: ["lifestyle", "urban", "people"],
    preview: "/demo/stock/COLOURBOX50965279.jpg",
  }),
  defineStockAsset({
    id: "s-011",
    title: "Nyhavn harbor in Copenhagen",
    category: "city",
    description: "Nyhavn harbor in Copenhagen with colorful historic buildings, boats along the canal, and vibrant city life. Iconic tourist destination representing Danish culture, architecture, and urban waterfront scenery.",
    keywords: ["nyhavn", "copenhagen", "denmark", "harbor", "canal", "boats", "colorful buildings", "city", "architecture", "travel", "tourism"],
    tags: ["city", "architecture", "travel", "scandinavia"],
    preview: "/demo/stock/COLOURBOX49123385.jpg",
  }),
  defineStockAsset({
    id: "s-012",
    title: "Windmills on the water",
    category: "nature",
    description: "Wind turbines standing in calm coastal waters, capturing renewable energy production in a Scandinavian landscape. Clean energy scene symbolizing sustainability, green technology, and the future of power generation.",
    keywords: ["windmills", "wind turbines", "renewable energy", "wind power", "sustainability", "green energy", "coast", "sea", "scandinavia", "nature"],
    tags: ["nature", "energy", "sustainability", "renewable"],
    preview: "/demo/stock/COLOURBOX47399594.jpg",
  }),
  defineStockAsset({
    id: "s-013",
    title: "Cyclist on bicycle bridge in Odense, Denmark",
    category: "city",
    description: "Cyclist riding across a modern bicycle bridge in Odense, Denmark. Contemporary urban infrastructure promoting cycling, sustainability, and active city life in a Scandinavian setting.",
    keywords: ["cyclist", "bicycle", "bike bridge", "odense", "denmark", "cycling", "urban", "infrastructure", "sustainability", "city"],
    tags: ["city", "lifestyle", "transport", "sustainability"],
    preview: "/demo/stock/COLOURBOX34454367.jpg",
  }),
  defineStockAsset({
    id: "s-014",
    title: "Seeds of a dandelion",
    category: "nature",
    description: "Close-up of delicate dandelion seeds ready to disperse in the wind. Minimalistic macro image symbolizing fragility, freedom, nature, and new beginnings. Ideal for concepts around growth, sustainability, spring, and calm nature aesthetics.",
    keywords: ['dandelion', 'dandelion seeds', 'seed', 'macro', 'close-up', 'nature', 'plant', 'spring', 'fragility', 'freedom', 'minimal', 'botany'],
    tags: ["nature", "plant", "macro", "minimal"],
    preview: "/demo/stock/COLOURBOX1916822.jpg",
  }),
  defineStockAsset({
    id: "s-015",
    title: "Cute deer outdoors",
    category: "wildlife",
    description: "Cute deer standing outdoors in a natural environment. Peaceful wildlife scene capturing innocence, nature, and animal behavior in the wild. Ideal for concepts around wildlife, nature conservation, countryside, and outdoor life.",
    keywords: ['deer', 'cute deer', 'wildlife', 'animal', 'nature', 'outdoors', 'forest', 'countryside', 'wild', 'fauna'],
    tags: ["wildlife", "animal", "nature", "outdoors"],
    preview: "/demo/stock/COLOURBOX2617267.jpg",
  }),
  defineStockAsset({
    id: "s-016",
    title: "Girl with curly hair in autumn field",
    category: "lifestyle",
    description: "Young girl with curly hair wearing a straw hat and polka dot dress, lifting her hands in an autumn field. Warm lifestyle scene capturing freedom, childhood joy, harvest season, and natural happiness. Ideal for concepts around autumn, freedom, childhood, and outdoor lifestyle.",
    keywords: ['girl', 'curly hair', 'straw hat', 'polka dot dress', 'autumn', 'field', 'childhood', 'freedom', 'harvest', 'outdoors', 'lifestyle'],
    tags: ["lifestyle", "autumn", "childhood", "outdoors"],
    preview: "/demo/stock/COLOURBOX41216629.jpg",
  }),
  defineStockAsset({
    id: "s-017",
    title: "Long exposure waterfall and lake",
    category: "nature",
    description: "Long exposure photography of a waterfall flowing into a calm lake. Blurry, silky water creates a peaceful and atmospheric natural scene. Ideal for nature backgrounds, wallpapers, relaxation, mindfulness, and landscape concepts.",
    keywords: ['waterfall', 'long exposure', 'lake', 'water', 'nature', 'landscape', 'blurred water', 'silky water', 'calm', 'background', 'wallpaper'],
    tags: ["nature", "water", "landscape", "background"],
    preview: "/demo/stock/COLOURBOX58649389.jpg",
}),
defineStockAsset({
    id: "s-018",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX67429604.jpg",
}),
defineStockAsset({
    id: "s-019",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX54283530.jpg",
}),
defineStockAsset({
    id: "s-020",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX61739661.jpg",
}),
defineStockAsset({
    id: "s-021",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX63460691.jpg",
}),
defineStockAsset({
    id: "s-022",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX65978394.jpg",
}),
defineStockAsset({
    id: "s-023",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX66316366.jpg",
}),
defineStockAsset({
    id: "s-024",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX66614138.jpg",
}),
defineStockAsset({
    id: "s-025",
    title: "Seasonal fruits and vegetables prepared for cooking",
    category: "lifestyle",
    description: "Seasonal fruits and vegetables prepared for cooking on a rustic surface. Fresh ingredients arranged for a healthy meal, capturing home cooking, seasonal food, nutrition, and natural lifestyle concepts.",
    keywords: ['seasonal food', 'fruits', 'vegetables', 'cooking', 'ingredients', 'healthy food', 'nutrition', 'home cooking', 'fresh', 'organic', 'lifestyle'],
    tags: ["lifestyle", "food", "cooking", "healthy"],
    preview: "/demo/stock/COLOURBOX66668909.jpg",
}),
    
  
  // ... flere
];

validateStockAssets(STOCK_ASSETS);