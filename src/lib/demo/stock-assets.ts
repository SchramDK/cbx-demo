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

export const STOCK_FEATURED_IDS: readonly string[] = ['s-001', 's-004', 's-011', 's-012'];

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
  const titles = new Map<string, string>();
  for (const a of assets) {
    if (ids.has(a.id)) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Duplicate id detected: ${a.id}`);
    }
    ids.add(a.id);

    // Basic required fields
    if (!a.title || !a.title.trim()) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Missing title for ${a.id}`);
    }
    if (!a.category) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Missing category for ${a.id}`);
    }

    // Duplicate titles (case-insensitive)
    const tKey = (a.title ?? '').toString().trim().toLowerCase();
    if (tKey) {
      const existingId = titles.get(tKey);
      if (existingId && existingId !== a.id) {
        // eslint-disable-next-line no-console
        console.warn(`[stock-assets] Duplicate title detected: "${a.title}" (${existingId} and ${a.id})`);
      } else {
        titles.set(tKey, a.id);
      }
    }

    // Keyword + tag hygiene (defineStockAsset should normalize these)
    const kws = a.keywords ?? [];
    const tgs = a.tags ?? [];

    const hasUpper = (s: string) => /[A-Z]/.test(s);
    if (kws.some(hasUpper)) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Keywords not lowercased for ${a.id}`);
    }
    if (tgs.some(hasUpper)) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Tags not lowercased for ${a.id}`);
    }

    for (const raw of kws) {
      const k = (raw ?? '').toString();
      if (k !== k.trim()) {
        // eslint-disable-next-line no-console
        console.warn(`[stock-assets] Keyword has leading/trailing whitespace for ${a.id}: "${k}"`);
      }
      if (/\s{2,}/.test(k)) {
        // eslint-disable-next-line no-console
        console.warn(`[stock-assets] Keyword has double spaces for ${a.id}: "${k}"`);
      }
      if (/^[a-z]\s+/.test(k)) {
        // eslint-disable-next-line no-console
        console.warn(`[stock-assets] Suspicious keyword (single-letter prefix) for ${a.id}: "${k}"`);
      }
    }

    if (!a.preview || !a.preview.startsWith('/demo/stock/')) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Suspicious preview path for ${a.id}: ${a.preview}`);
    }
  }

  // Validate featured ids
  const featured = Array.from(STOCK_FEATURED_IDS ?? []);
  const featuredSeen = new Set<string>();
  for (const fid of featured) {
    if (featuredSeen.has(fid)) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Duplicate featured id detected: ${fid}`);
    }
    featuredSeen.add(fid);

    if (!ids.has(fid)) {
      // eslint-disable-next-line no-console
      console.warn(`[stock-assets] Featured id not found in STOCK_ASSETS: ${fid}`);
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
    category: "wildlife",
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
    category: "energy",
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
    title: "Woman holding festive bouquet of chrysanthemum flowers",
    category: "lifestyle",
    description: "Woman holding a festive bouquet of chrysanthemum flowers in her hands. Warm lifestyle scene symbolizing celebration, seasonal flowers, femininity, and joyful moments. Ideal for concepts around holidays, gifting, emotions, and floral design.",
    keywords: ['woman', 'bouquet', 'chrysanthemum', 'flowers', 'festive bouquet', 'celebration', 'floral', 'gift', 'hands', 'seasonal flowers', 'lifestyle', 'joy', 'femininity'],
    tags: ["lifestyle", "flowers", "celebration", "gift"],
    preview: "/demo/stock/COLOURBOX54283530.jpg",
  }),
  defineStockAsset({
    id: "s-020",
    title: "Happy mother baking cookies with child in kitchen",
    category: "lifestyle",
    description: "Happy mother baking together with her child in the kitchen, playing with flour and learning while making cookies at home. Warm family lifestyle moment capturing love, care, support, and teaching during playful cooking.",
    keywords: ['mother', 'mom', 'child', 'girl', 'kid', 'baking', 'cookies', 'kitchen', 'flour', 'cooking together', 'family', 'learning', 'teaching', 'playful', 'home', 'love'],
    tags: ["lifestyle", "people", "family", "mother", "baking"],
    preview: "/demo/stock/COLOURBOX61739661.jpg",
  }),
  defineStockAsset({
    id: "s-021",
    title: "Outdoor lunch with family bonding together",
    category: "lifestyle",
    description: "Happy family enjoying an outdoor lunch together, sharing food, hugs, and smiles in warm natural sunlight. Cheerful lifestyle scene capturing bonding, togetherness, and social moments around a healthy meal.",
    keywords: ['outdoor lunch', 'family', 'family bonding', 'togetherness', 'hug', 'smiling', 'brunch', 'eating together', 'healthy meal', 'social gathering', 'happiness', 'lifestyle', 'outdoors', 'sunshine'],
    tags: ["lifestyle", "family", "outdoors", "food", "togetherness"],
    preview: "/demo/stock/COLOURBOX63460691.jpg",
  }),
  defineStockAsset({
    id: "s-022",
    title: "Happy couple dancing in kitchen during meal prep",
    category: "lifestyle",
    description: "Happy couple holding hands and dancing in the kitchen while preparing food. Warm lifestyle moment with smiles, hugs, and romance at home—ideal for themes like love, anniversaries, relationships, cooking together, and everyday happiness.",
    keywords: ['happy couple', 'holding hands', 'dancing', 'kitchen', 'meal prep', 'cooking', 'romance', 'love', 'hug', 'smile', 'relationship', 'anniversary', 'home', 'together'],
    tags: ["lifestyle", "people", "couple", "love", "home"],
    preview: "/demo/stock/COLOURBOX65978394.jpg",
  }),
  defineStockAsset({
    id: "s-023",
    title: "Interracial couple talking over coffee at indoor cafe",
    category: "lifestyle",
    description: "Interracial couple relaxing and talking with coffee cups at an indoor cafe. Warm lifestyle moment capturing bonding, romance, and conversation during a casual date. Ideal for themes like relationships, communication, social connection, and modern love.",
    keywords: ['interracial couple', 'couple', 'coffee shop', 'cafe', 'date', 'romance', 'bonding', 'conversation', 'talking', 'smile', 'lovers', 'man and woman', 'relationship', 'communication', 'social'],
    tags: ["lifestyle", "people", "couple", "coffee"],
    preview: "/demo/stock/COLOURBOX66316366.jpg",
  }),
  defineStockAsset({
    id: "s-024",
    title: "Blooming pink flowers on a branch in springtime",
    category: "nature",
    description: "Blooming pink flowers on a delicate branch in springtime. Fresh seasonal blossoms symbolizing renewal, growth, and natural beauty. Ideal for concepts around spring, nature, flowers, freshness, and outdoor scenery.",
    keywords: ['pink flowers', 'blooming flowers', 'springtime', 'flower branch', 'blossom', 'spring', 'nature', 'floral', 'renewal', 'growth', 'outdoors'],
    tags: ["nature", "flowers", "spring", "blossom"],
    preview: "/demo/stock/COLOURBOX66614138.jpg",
  }),
  defineStockAsset({
    id: "s-025",
    title: "Mature couple spending Valentine's weekend in mountain cabin",
    category: "lifestyle",
    description: "Mature couple spending a romantic Valentine's weekend in a cozy mountain cabin, husband and wife looking at each other lovingly. Warm indoor scene capturing love, connection, and togetherness during a relaxing getaway in the mountains.",
    keywords: ['mature couple', 'valentines weekend', 'mountain cabin', 'cabin', 'husband and wife', 'romance', 'love', 'togetherness', 'getaway', 'mountains', 'cozy', 'relationship', 'weekend trip', 'couple'],
    tags: ["lifestyle", "people", "couple", "love", "getaway"],
    preview: "/demo/stock/COLOURBOX66668909.jpg",
  }),
  defineStockAsset({
    id: "s-026",
    title: "Mysterious swamp forest",
    category: "nature",
    description:
      "Mysterious swamp forest with misty atmosphere and dense trees. Moody, cinematic woodland scene ideal for concepts like mystery, adventure, nature, wilderness, and dark forest landscapes.",
    keywords: [
      "swamp",
      "swamp forest",
      "mysterious forest",
      "mist",
      "fog",
      "woods",
      "woodland",
      "trees",
      "marsh",
      "wetland",
      "dark forest",
      "moody",
      "c cinematic",
      "nature",
      "landscape",
      "wilderness",
    ],
    tags: ["nature", "forest", "swamp", "mist", "moody"],
    preview: "/demo/stock/COLOURBOX22183537.jpg",
  }),
  defineStockAsset({
    id: "s-027",
    title: "Aerial view of boats and yachts in marina, Norway",
    category: "city",
    description:
      "Drone aerial view of a marina filled with white boats and yachts moored in calm water. Summer waterfront scene from Norway (Orstafjorden / Ørstafjorden, Ørsta), captured from above. Ideal for travel, sailing, boating, and coastal city concepts.",
    keywords: [
      "aerial",
      "drone",
      "marina",
      "boats",
      "boat",
      "yachts",
      "yacht",
      "harbor",
      "harbour",
      "port",
      "moored",
      "docked",
      "sailing",
      "nautical",
      "waterfront",
      "coast",
      "sea",
      "fjord",
      "orsta",
      "orstafjorden",
      "norway",
      "scandinavia",
      "summer",
      "travel",
    ],
    tags: ["city", "travel", "marina", "boats", "aerial"],
    preview: "/demo/stock/COLOURBOX60032839.jpg",
  }),
  defineStockAsset({
    id: "s-028",
    title: "Sunset beach with orange horizon, Denmark",
    category: "nature",
    description:
      "Sunset sky over a sandy beach with an orange horizon and calm ocean view in Denmark. Minimal coastal landscape with mockup/copy space—ideal for travel, nature, seaside destination, and summer environment concepts.",
    keywords: [
      "sunset",
      "beach",
      "sand",
      "coast",
      "coastal",
      "seaside",
      "sea",
      "ocean",
      "horizon",
      "orange sky",
      "sunset sky",
      "landscape",
      "nature",
      "travel",
      "denmark",
      "scandinavia",
      "outdoor",
      "minimal",
      "copy space",
      "mockup space",
      "destination",
    ],
    tags: ["nature", "beach", "sunset", "denmark", "travel"],
    preview: "/demo/stock/COLOURBOX61446375.jpg",
  }),
  defineStockAsset({
    id: "s-029",
    title: "Aerial view of fast boat on blue Mediterranean sea",
    category: "nature",
    description:
      "Drone aerial view of a fast boat speeding across the blue Mediterranean sea on a sunny day. Dynamic seascape with wake trails on the water surface—ideal for travel, vacation, leisure, boating, and summer ocean concepts.",
    keywords: [
      "aerial",
      "drone",
      "fast boat",
      "speedboat",
      "motorboat",
      "boat",
      "ship",
      "sea",
      "ocean",
      "mediterranean",
      "blue water",
      "seascape",
      "water surface",
      "wake",
      "waves",
      "sunny",
      "summer",
      "travel",
      "vacation",
      "leisure",
      "coast",
    ],
    tags: ["nature", "travel", "sea", "boat", "aerial"],
    preview: "/demo/stock/COLOURBOX60314794.jpg",
  }),
  defineStockAsset({
    id: "s-030",
    title: "Electric car charging at station with nature background",
    category: "energy",
    description:
      "Electric car (EV) charging at a station as a man plugs in a white power cable. Clean mobility and renewable energy concept with a natural outdoor background—ideal for sustainability, green technology, and transportation themes.",
    keywords: [
      "electric car",
      "ev",
      "charging",
      "charging station",
      "charger",
      "plug",
      "cable",
      "power cable",
      "electric vehicle",
      "e-mobility",
      "mobility",
      "transportation",
      "sustainability",
      "green energy",
      "renewable energy",
      "clean energy",
      "green technology",
      "eco",
      "climate",
      "nature background",
    ],
    tags: ["energy", "sustainability", "ev", "charging", "transport"],
    preview: "/demo/stock/COLOURBOX62377702.jpg",
  }),
  defineStockAsset({
    id: "s-031",
    title: "Wind turbines along Danish coastline near Copenhagen",
    category: "energy",
    description:
      "Renewable energy wind power plant with wind turbines along the Danish sea shoreline near Copenhagen. Clean green electricity generation by the coast—ideal for sustainability, climate, renewable energy, and Scandinavian infrastructure concepts.",
    keywords: [
      "wind turbines",
      "wind turbine",
      "wind power",
      "wind farm",
      "renewable energy",
      "green energy",
      "clean energy",
      "sustainability",
      "electricity",
      "power generation",
      "coast",
      "coastline",
      "shoreline",
      "sea",
      "denmark",
      "copenhagen",
      "scandinavia",
      "climate",
      "infrastructure",
    ],
    tags: ["energy", "renewable", "wind", "denmark", "sustainability"],
    preview: "/demo/stock/COLOURBOX61870711.jpg",
  }),
  defineStockAsset({
    id: "s-032",
    title: "Golden eagle (Aquila chrysaetos)",
    category: "wildlife",
    description:
      "Golden eagle (Aquila chrysaetos) in the wild—majestic bird of prey captured in its natural habitat. Ideal for wildlife, nature, predator, and conservation themes.",
    keywords: [
      "golden eagle",
      "aquila chrysaetos",
      "eagle",
      "bird of prey",
      "raptor",
      "predator",
      "wildlife",
      "nature",
      "wings",
      "feathers",
      "beak",
      "talons",
      "hunting",
      "conservation",
      "wilderness",
    ],
    tags: ["wildlife", "eagle", "bird", "raptor", "nature"],
    preview: "/demo/stock/COLOURBOX65946422.jpg",
  }),
  defineStockAsset({
    id: "s-033",
    title: "Two puffins displaying courtship behavior, Newfoundland",
    category: "wildlife",
    description:
      "Two Atlantic puffins (Fratercula arctica) displaying billing courtship behavior at Elliston on the Bonavista Peninsula, Newfoundland, Canada. Charming seabird wildlife scene ideal for nature, birds, mating behavior, and coastal travel themes.",
    keywords: [
      "puffin",
      "puffins",
      "atlantic puffin",
      "fratercula arctica",
      "seabird",
      "seabirds",
      "bird",
      "birds",
      "courtship",
      "mating",
      "billing",
      "pair",
      "wildlife",
      "nature",
      "coast",
      "cliff",
      "newfoundland",
      "bonavista",
      "elliston",
      "canada",
      "north atlantic",
    ],
    tags: ["wildlife", "birds", "puffins", "nature", "canada"],
    preview: "/demo/stock/COLOURBOX68711360.jpg",
  }),
  defineStockAsset({
    id: "s-034",
    title: "Pontoon at Moesgaard Beach, Aarhus, Denmark",
    category: "nature",
    description:
      "Pontoon and wooden pier at Moesgaard Beach near Aarhus, Denmark. Calm Scandinavian coastline scene with sea, sand, and minimal horizon—ideal for travel, nature, seaside destination, and summer outdoor concepts.",
    keywords: [
      "pontoon",
      "pier",
      "jetty",
      "wooden pier",
      "boardwalk",
      "beach",
      "moesgaard",
      "moesgaard beach",
      "aarhus",
      "denmark",
      "coast",
      "coastal",
      "seaside",
      "sea",
      "ocean",
      "shore",
      "sand",
      "horizon",
      "scandinavia",
      "summer",
      "travel",
      "outdoor",
      "landscape",
    ],
    tags: ["nature", "beach", "denmark", "aarhus", "travel"],
    preview: "/demo/stock/COLOURBOX69331493.jpg",
  }),
  // ... flere
];

validateStockAssets(STOCK_ASSETS);