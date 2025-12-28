import { MenuSection, MenuItem } from '@/types/menu';
import OpenAI from 'openai';
import { loadCache, saveCache, getCachedItem, updateCacheItem, downloadImage } from '@/lib/menuCache';
import { getMenuState, updateMenuState, MenuState, updateMenuItemImage } from '@/lib/menuState';

const PDFParser = require("pdf2json");

export interface MenuData {
  sections: MenuSection[];
  isMock: boolean;
  isProcessing: boolean;
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
}

// Helper to get description
const DISH_DESCRIPTIONS: Record<string, string> = {
  'butter chicken': 'Tender chicken cooked in a rich, creamy tomato and butter sauce.',
  'tikka masala': 'Roasted marinated chicken chunks in spiced curry sauce.',
  'rogan josh': 'Aromatic lamb dish of Persian origin, signature of Kashmiri cuisine.',
  'vindaloo': 'A standard element of Goan cuisine derived from the Portuguese dish.',
  'korma': 'Meat or vegetables braised with yogurt or cream, water or stock, and spices.',
  'madras': 'A fairly hot curry sauce, red in colour and with heavy use of chili powder.',
  'saag': 'Leafy vegetable dish eaten in the Indian subcontinent with bread.',
  'palak': 'Spinach based gravy dish.',
  'dal makhani': 'Whole black lentils and red kidney beans, butter and cream.',
  'biryani': 'Mixed rice dish with Indian spices, rice, and meat or vegetables.',
  'samosa': 'Fried or baked pastry with a savory filling, spiced potatoes, onions, peas.',
  'naan': 'Leavened, oven-baked flatbread.',
  'roti': 'Round flatbread native to the Indian subcontinent made from stoneground whole meal flour.',
  'lassi': 'Popular traditional dahi (yogurt)-based drink.',
  'gulab jamun': 'Milk-solid-based sweet from the Indian subcontinent.',
  'tandoori': 'Dish prepared by roasting chicken marinated in yogurt and spices in a tandoor.',
  'chana masala': 'Chickpeas cooked in a spicy and tangy tomato-based sauce.',
  'aloo gobi': 'Vegetarian dish made with potatoes (aloo), cauliflower (gobi), and Indian spices.',
  'paneer': 'Fresh acid-set cheese common in the Indian subcontinent.',
  'malai kofta': 'Fried potato and paneer balls served in a rich, creamy, and mild gravy.',
  'fish curry': 'Fish cooked in a spicy and tangy gravy, often with coconut milk or tamarind.',
  'prawn masala': 'Prawns cooked in a spicy and flavorful masala sauce.',
  'onion bhaji': 'Spicy Indian snack similar to a fritter or pakora, made with onions.',
  'papdi chaat': 'Crisp fried dough wafers served with boiled potatoes, chickpeas, chilies, yogurt.',
  'mango chicken': 'Chicken cooked in a mild and creamy mango-based sauce.',
  'goat curry': 'Tender goat meat slow-cooked in a rich and spicy gravy.',
  'lamb korma': 'Lamb cooked in a mild and creamy sauce with cashew nuts and spices.',
  'beef vindaloo': 'Spicy beef curry with vinegar and garlic.',
  'vegetable korma': 'Mixed vegetables cooked in a mild and creamy sauce.',
  'daal tadka': 'Yellow lentils tempered with cumin, garlic, and chilies.',
  'cheese naan': 'Naan bread stuffed with melted cheese.',
  'garlic naan': 'Naan bread topped with minced garlic and cilantro.',
  'kashmiri naan': 'Naan bread stuffed with dried fruits and nuts.',
  'raita': 'Yogurt mixed with cucumber, carrots, and spices.',
  'papadum': 'Thin, crisp, round flatbread made from peeled black gram flour.',
  'mango lassi': 'Yogurt-based drink blended with mango pulp.',
  'soft drink': 'Refreshing carbonated beverage.',
  'masala chai': 'Spiced tea made by brewing black tea with aromatic Indian spices.'
};

function getDescriptionForDish(name: string): string {
  const lowerName = name.toLowerCase();
  for (const [key, desc] of Object.entries(DISH_DESCRIPTIONS)) {
    if (lowerName.includes(key)) {
      return desc;
    }
  }
  if (lowerName.includes('chicken')) return 'Succulent chicken cooked with traditional Indian spices.';
  if (lowerName.includes('lamb')) return 'Tender lamb slow-cooked with aromatic herbs and spices.';
  if (lowerName.includes('beef')) return 'Robust beef curry with a blend of exotic spices.';
  if (lowerName.includes('goat')) return 'Traditional goat curry rich in flavor and spices.';
  if (lowerName.includes('fish') || lowerName.includes('prawn')) return 'Fresh seafood delicacy cooked in a flavorful sauce.';
  if (lowerName.includes('paneer')) return 'Fresh cottage cheese dish cooked in a savory gravy.';
  if (lowerName.includes('vegetable') || lowerName.includes('veg')) return 'Assorted fresh vegetables cooked in a delightful spice mix.';
  
  return 'A delicious traditional Indian dish prepared with fresh ingredients.';
}

export async function getMenuData(): Promise<MenuData> {
  const state = await getMenuState();
  
  // If idle and empty, trigger update
  if (state.status === 'idle' && state.sections.length === 0) {
    triggerMenuUpdate();
    return { 
      sections: [], 
      isMock: false, 
      isProcessing: true,
      progress: { current: 0, total: 100, stage: 'Initializing...' }
    };
  }

  // Check for stale state (e.g. server crashed while processing)
  const STALE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  const isStale = !state.updatedAt || (Date.now() - state.updatedAt > STALE_TIMEOUT);
  const isProcessingState = state.status === 'fetching-pdf' || state.status === 'parsing-pdf' || state.status === 'generating-content';

  if (isProcessingState && isStale) {
    console.log('Detected stale menu processing state. Restarting update...');
    triggerMenuUpdate();
    return {
      sections: state.sections,
      isMock: false,
      isProcessing: true,
      progress: { current: 0, total: 100, stage: 'Restarting...' }
    };
  }

  const isProcessing = isProcessingState;
  
  return {
    sections: state.sections,
    isMock: false,
    isProcessing,
    progress: state.progress
  };
}

export async function processMenu(): Promise<void> {
  // This is called by instrumentation.ts
  // We just trigger the update in background
  triggerMenuUpdate();
}

export async function triggerMenuUpdate() {
  const state = await getMenuState();
  
  // Check for stale state
  const STALE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  const isStale = !state.updatedAt || (Date.now() - state.updatedAt > STALE_TIMEOUT);
  const isProcessing = state.status === 'fetching-pdf' || state.status === 'parsing-pdf' || state.status === 'generating-content';

  // Prevent concurrent updates unless stale
  if (isProcessing && !isStale) {
    console.log('Menu update already in progress.');
    return;
  }

  // Check if update is needed (e.g., older than 4 hours)
  // We use 4 hours to allow for lunch/dinner updates if the PDF changes
  const UPDATE_INTERVAL = 4 * 60 * 60 * 1000;
  if (!isStale && state.status === 'complete' && state.lastUpdated && (Date.now() - state.lastUpdated < UPDATE_INTERVAL)) {
    console.log('Menu is up to date. Skipping update.');
    return;
  }

  console.log('Starting menu update...');
  await updateMenuState({ 
    status: 'fetching-pdf', 
    error: undefined,
    progress: { current: 5, total: 100, stage: 'Fetching PDF menu...' }
  });

  try {
    const url = 'https://mitrandadhabaglassyjunction.com.au/bvtodaysmenu.pdf';
    const response = await fetch(url, { next: { revalidate: 0 } }); // No cache for the PDF fetch itself
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await updateMenuState({ 
      status: 'parsing-pdf',
      progress: { current: 15, total: 100, stage: 'Parsing PDF content...' }
    });

    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        resolve(pdfParser.getRawTextContent());
      });
      pdfParser.parseBuffer(buffer);
    });
    
    console.log('PDF Text extracted (first 200 chars):', text.substring(0, 200));

    await updateMenuState({ 
      status: 'generating-content',
      progress: { current: 25, total: 100, stage: 'Analyzing menu structure...' }
    });

    let sections: MenuSection[] = [];

    // If OpenAI API key is available, use it for parsing
    if (process.env.OPENAI_API_KEY) {
      console.log('Using OpenAI to parse menu...');
      sections = await parseMenuWithAI(text);
    } else {
      console.log('OpenAI API key not found, falling back to local regex parser.');
      sections = await parseMenuText(text);
    }

    // Update state with the new sections
    const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
    await updateMenuState({ 
      status: 'complete', 
      sections: sections,
      lastUpdated: Date.now(),
      progress: { current: 100, total: 100, stage: `Menu ready! Found ${totalItems} items.` }
    });
    console.log('Menu update complete.');

  } catch (error: any) {
    console.error('Error processing menu:', error);
    await updateMenuState({ 
      status: 'error', 
      error: error.message || 'Unknown error',
      progress: { current: 0, total: 100, stage: 'Error occurred' }
    });
  }
}

async function parseMenuWithAI(text: string): Promise<MenuSection[]> {
  const openai = new OpenAI();

  const prompt = `
    You are a data extraction assistant. Extract the menu items from the following raw text of a restaurant menu PDF.
    The text might be messy, with headers and prices scattered.
    
    Identify sections (e.g., Entree, Mains, Breads, Drinks, Lunch Special, etc.).
    For each item, extract:
    - Name (clean up the name, remove price or weird characters)
    - Price (as a number)
    - Description: If a description is present in the text, use it. If NOT, generate a short 1-sentence blurb describing the ingredients and flavor profile of the dish based on its name (e.g. "Spicy chicken curry with rich tomato gravy").
    
    IMPORTANT HANDLING FOR "BOXED" OR "SPECIAL" ITEMS:
    - The PDF often contains small boxes with "Combo Special" or "Chef's Special" that might appear at the end of the text stream or isolated.
    - If these items clearly belong to a specific section (e.g. a "Sides Combo" appearing visually near "Sides"), try to include them in that section.
    - If they are general specials, group them into a "Specials" or "Combos" section rather than creating a tiny section for each one.
    - Use your knowledge of Indian cuisine to categorize items correctly if the headers are ambiguous.

    Return ONLY a valid JSON object with a "sections" key containing an array of section objects:
    {
      "sections": [
        {
          "title": "Section Name",
          "items": [
            {
              "name": "Dish Name",
              "price": 10.50,
              "description": "Optional description"
            }
          ]
        }
      ]
    }

    Raw Text:
    ${text}
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content from OpenAI");

    const result = JSON.parse(content);
    let rawSections = result.sections || result;

    if (!Array.isArray(rawSections)) {
      const arrayProp = Object.values(result).find(val => Array.isArray(val));
      if (arrayProp) {
        rawSections = arrayProp;
      } else {
        throw new Error("AI response is not an array and has no sections property");
      }
    }

    return await processSections(rawSections);
  } catch (error) {
    console.error("AI Parsing failed:", error);
    return parseMenuText(text); // Fallback
  }
}

async function parseMenuText(text: string): Promise<MenuSection[]> {
  // pdf2json raw text content might contain page breaks and other artifacts
  const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(line => line.length > 0);
  
  // console.log('First 20 lines of parsed text:', lines.slice(0, 20));

  const sections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;
  
  const sectionKeywords = [
    'ENTREE', 'APPETISER', 'MAIN', 'CURRY', 'RICE', 'BREAD', 'NAAN', 
    'DRINK', 'DESSERT', 'SIDES', 'VEG', 'NON-VEG',
    'KIDS', 'SPECIAL', 'BRIYANI', 'COMBO', 'PLATTER', 'THALI', 'SEAFOOD', 'CHEF'
  ];
  // Regex to find items with prices (requires $ to avoid false positives with other numbers)
  // Captures: 1. Name, 2. Price, 3. Extra info (e.g. "FOR 2 PIECES")
  const itemRegex = /^(.*?)\s*(\$\d+(?:\.\d{1,2})?)\s*(.*)$/;

  for (const line of lines) {
    if (line.startsWith('----------------')) continue;
    const upperLine = line.toUpperCase();
    
    // Check if line is a section header
    const hasPrice = itemRegex.test(line);
    const isSection = sectionKeywords.some(keyword => upperLine.includes(keyword)) && line.length < 30 && !hasPrice;
    
    if (isSection) {
      console.log(`Found section: "${line}"`);
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line, items: [] };
      continue;
    }

    // Check if line is an item
    const itemMatch = line.match(itemRegex);
    if (itemMatch && currentSection) {
      const namePart = itemMatch[1];
      const priceStr = itemMatch[2].replace('$', '');
      const extraInfo = itemMatch[3];
      
      const price = parseFloat(priceStr);
      let name = namePart.trim();
      
      // Append extra info to name if present (e.g. "FOR 2 PIECES")
      if (extraInfo) {
        name += ` ${extraInfo}`;
      }
      
      if (name.length > 2) {
        currentSection.items.push({
          id: '', // Will be filled in processSections
          name: name,
          price: price,
          category: currentSection.title,
          imageQuery: '',
          description: ''
        });
      }
    }
  }

  if (currentSection) sections.push(currentSection);
  
  // If no items found, try to use mock data as fallback to avoid empty screen
  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  console.log(`Parsed ${sections.length} sections and ${totalItems} items.`);
  
  if (totalItems === 0) {
    console.warn("Parsing found no items. Falling back to mock data.");
    return processSections(getMockMenu());
  }

  return processSections(sections);
}

async function processSections(rawSections: any[]): Promise<MenuSection[]> {
  const cache = await loadCache();
  let cacheUpdated = false;

  // Count total items for progress tracking
  let totalItems = 0;
  rawSections.forEach((section: any) => {
    if (Array.isArray(section.items)) {
      totalItems += section.items.length;
    }
  });

  let processedCount = 0;
  const updateProgress = async (itemName: string) => {
    processedCount++;
    // Update progress every 3 items to reduce I/O, or if it's the last one
    if (processedCount % 3 === 0 || processedCount === totalItems) {
      const percentage = 30 + Math.floor((processedCount / totalItems) * 60); // Map 0-100% of items to 30-90% of total progress
      await updateMenuState({
        progress: {
          current: percentage,
          total: 100,
          stage: `Processing: ${itemName}`
        }
      });
    }
  };

  const processedSections = await Promise.all(rawSections.map(async (section: any) => ({
    title: section.title,
    items: await Promise.all((section.items || []).map(async (item: any) => {
      const id = Buffer.from(item.name).toString('base64');
      
      // Check cache first
      const cachedItem = await getCachedItem(cache, item.name);
      if (cachedItem) {
        cacheUpdated = true;
        await updateProgress(item.name);
        return {
          id: id,
          name: item.name,
          price: item.price,
          category: section.title,
          imageQuery: cachedItem.imagePath,
          description: cachedItem.description
        };
      }

      // If not in cache, generate data
      let imageContext = 'Punjabi Dhaba style Indian food served in a traditional copper handi bowl professional photography';
      const lowerTitle = (section.title || '').toLowerCase();
      const lowerName = (item.name || '').toLowerCase();

      if (lowerTitle.includes('drink') || lowerTitle.includes('beverage') || lowerName.includes('lassi') || lowerName.includes('coke') || lowerName.includes('soda')) {
        imageContext = 'drink served in a glass refreshing beverage professional photography';
      } else if (lowerTitle.includes('dessert') || lowerTitle.includes('sweet')) {
        imageContext = 'dessert sweet dish served in a small bowl or plate professional photography';
      } else if (lowerTitle.includes('bread') || lowerTitle.includes('naan') || lowerTitle.includes('roti') || lowerTitle.includes('parantha')) {
        imageContext = 'Indian bread served in a basket or on a plate professional photography';
      } else if (lowerTitle.includes('lunch') || lowerTitle.includes('thali') || lowerName.includes('thali') || lowerName.includes('rice') || lowerName.includes('biryani')) {
          imageContext = 'Punjabi Dhaba style meal served on a steel thali plate with rice professional photography';
      }

      const description = item.description || getDescriptionForDish(item.name);
      const imageQuery = `${item.name} ${description} ${imageContext}`;
      const seed = id;
      const remoteImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageQuery)}?width=400&height=400&nologo=true&seed=${seed}`;
      
      // Trigger background download
      const filename = `${id}.jpg`;
      downloadImage(remoteImageUrl, filename).then(localPath => {
        if (localPath) {
          loadCache().then(latestCache => {
            updateCacheItem(latestCache, item.name, description, localPath);
            saveCache(latestCache);
          });
          // Update the state file so frontend can switch to local image on refresh/poll
          updateMenuItemImage(id, localPath);
        }
      });

      updateCacheItem(cache, item.name, description, remoteImageUrl);
      cacheUpdated = true;
      
      await updateProgress(item.name);

      return {
        id: id,
        name: item.name,
        price: item.price,
        category: section.title,
        imageQuery: remoteImageUrl,
        description: description
      };
    }))
  })));

  if (cacheUpdated) {
    await saveCache(cache);
  }
  
  return processedSections;
}

function getMockMenu(): MenuSection[] {
  // ... (Keep existing mock menu)
  const mainStyle = 'Punjabi Dhaba style Indian food served in a traditional copper handi bowl professional photography';
  const breadStyle = 'Indian bread served in a basket or on a plate professional photography';
  
  return [
    {
      title: 'Entrees',
      items: [
        { id: '1', name: 'Samosa', price: 8.00, category: 'Entrees', imageQuery: `Samosa ${mainStyle}`, description: 'Crispy pastry filled with spiced potatoes and peas.' },
        { id: '2', name: 'Chicken Tikka', price: 14.00, category: 'Entrees', imageQuery: `Chicken Tikka ${mainStyle}`, description: 'Boneless chicken marinated in yogurt and spices, cooked in a tandoor.' },
      ]
    },
    {
      title: 'Mains',
      items: [
        { id: '3', name: 'Butter Chicken', price: 22.00, category: 'Mains', imageQuery: `Butter Chicken ${mainStyle}`, description: 'Tender chicken cooked in a rich, creamy tomato and butter sauce.' },
        { id: '4', name: 'Lamb Rogan Josh', price: 24.00, category: 'Mains', imageQuery: `Lamb Rogan Josh ${mainStyle}`, description: 'Aromatic lamb curry with flavors of fennel, ginger, and Kashmiri chilies.' },
        { id: '5', name: 'Palak Paneer', price: 20.00, category: 'Mains', imageQuery: `Palak Paneer ${mainStyle}`, description: 'Cottage cheese cubes simmered in a smooth, spiced spinach gravy.' },
      ]
    },
    {
      title: 'Breads',
      items: [
        { id: '6', name: 'Garlic Naan', price: 4.50, category: 'Breads', imageQuery: `Garlic Naan ${breadStyle}`, description: 'Soft leavened bread topped with minced garlic and cilantro.' },
        { id: '7', name: 'Roti', price: 4.00, category: 'Breads', imageQuery: `Roti ${breadStyle}`, description: 'Whole wheat flatbread cooked in a tandoor.' },
      ]
    }
  ];
}
