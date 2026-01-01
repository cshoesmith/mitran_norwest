import { MenuSection, MenuItem } from '@/types/menu';
import OpenAI from 'openai';
import { loadCache, saveCache, getCachedItem, updateCacheItem } from '@/lib/menuCache';
import { getMenuState, updateMenuState, MenuState } from '@/lib/menuState';

const PDFParser = require("pdf2json");

export interface MenuData {
  sections: MenuSection[];
  isMock: boolean;
  isProcessing: boolean;
  menuDate?: string;
  error?: string;
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
}

// Helper to get description
const DISH_DESCRIPTIONS: Record<string, string> = {
  'butter chicken': 'Tender boneless chicken pieces marinated in yogurt and spices, then cooked in a rich, creamy tomato and butter sauce with fenugreek leaves.',
  'tikka masala': 'Succulent roasted marinated chicken chunks simmered in a spiced, creamy curry sauce with tomatoes, onions, and coriander.',
  'rogan josh': 'Aromatic lamb dish of Persian origin, slow-cooked with Kashmiri chilies, fennel seeds, ginger, and yogurt for a deep red color and rich flavor.',
  'vindaloo': 'A spicy and tangy Goan curry made with vinegar, garlic, ginger, and red chilies, offering a bold and fiery flavor profile.',
  'korma': 'Meat or vegetables braised in a mild, velvety sauce made with yogurt, cream, ground cashews, and aromatic spices like cardamom and cinnamon.',
  'madras': 'A fairly hot curry sauce originating from South India, featuring a rich blend of toasted spices, coconut milk, and fresh curry leaves.',
  'saag': 'A nutritious dish made with leafy greens like spinach and mustard greens, cooked with garlic, ginger, and spices until smooth and flavorful.',
  'palak': 'Fresh spinach pureed and cooked with garlic, ginger, and spices to create a smooth, vibrant green gravy.',
  'dal makhani': 'Whole black lentils and red kidney beans slow-cooked overnight with butter and cream for a rich, velvety texture.',
  'biryani': 'A fragrant rice dish layered with marinated meat or vegetables, saffron-infused basmati rice, fried onions, and aromatic spices.',
  'samosa': 'Crispy, golden-fried pastry triangles filled with a savory mixture of spiced potatoes, green peas, and herbs.',
  'naan': 'Soft, pillowy leavened flatbread baked in a traditional tandoor oven, perfect for scooping up curries.',
  'roti': 'Traditional unleavened whole wheat flatbread cooked in a tandoor, offering a wholesome and slightly smoky flavor.',
  'lassi': 'A refreshing and creamy yogurt-based drink, available in sweet, salty, or fruit-flavored varieties like mango.',
  'gulab jamun': 'Soft, melt-in-your-mouth milk solid dumplings fried until golden and soaked in a warm, rose-scented sugar syrup.',
  'tandoori': 'Marinated in yogurt and a blend of spices, then roasted to perfection in a clay tandoor oven for a smoky, charred flavor.',
  'chana masala': 'Chickpeas cooked in a spicy and tangy tomato-based sauce with onions, ginger, garlic, and a blend of ground spices.',
  'aloo gobi': 'A comforting vegetarian dish made with potatoes (aloo) and cauliflower (gobi) tossed with turmeric, cumin, and coriander.',
  'paneer': 'Fresh, firm Indian cottage cheese used in various curries and snacks, absorbing the flavors of the spices it is cooked with.',
  'malai kofta': 'Fried dumplings made of mashed potatoes and paneer, served in a rich, creamy, and mildly spiced white gravy.',
  'fish curry': 'Tender fish fillets simmered in a tangy and spicy gravy, often enriched with coconut milk, tamarind, and curry leaves.',
  'prawn masala': 'Juicy prawns cooked in a thick, spicy masala sauce made with onions, tomatoes, ginger, garlic, and fresh herbs.',
  'onion bhaji': 'Crispy, golden fritters made with sliced onions coated in a spiced chickpea flour batter and deep-fried.',
  'papdi chaat': 'A popular street food snack featuring crisp dough wafers topped with boiled potatoes, chickpeas, yogurt, and tangy chutneys.',
  'mango chicken': 'Tender chicken pieces cooked in a mild, creamy sauce infused with sweet mango pulp and aromatic spices.',
  'goat curry': 'Tender, bone-in goat meat slow-cooked in a robust and spicy gravy with onions, tomatoes, and traditional Indian spices.',
  'lamb korma': 'Succulent pieces of lamb cooked in a mild, creamy sauce with ground cashews, yogurt, and delicate spices.',
  'beef vindaloo': 'A fiery and tangy beef curry made with vinegar, garlic, and a blend of hot spices, typical of Goan cuisine.',
  'vegetable korma': 'A medley of fresh vegetables cooked in a mild, creamy sauce with coconut milk, nuts, and aromatic spices.',
  'daal tadka': 'Yellow lentils cooked until soft and tempered with ghee, cumin seeds, garlic, and dried red chilies for a burst of flavor.',
  'cheese naan': 'Soft, fluffy naan bread stuffed with melted mozzarella and cheddar cheese, baked in a tandoor.',
  'garlic naan': 'Leavened flatbread topped with minced garlic and fresh cilantro, baked in a tandoor for a fragrant and savory taste.',
  'kashmiri naan': 'A sweet and savory naan bread stuffed with a mixture of dried fruits, nuts, and coconut.',
  'raita': 'A cooling side dish made with yogurt, cucumber, carrots, and roasted cumin, perfect for balancing spicy curries.',
  'papadum': 'Thin, crisp, disc-shaped wafers made from peeled black gram flour, often served as an appetizer or accompaniment.',
  'mango lassi': 'A thick, creamy, and refreshing drink made by blending yogurt with sweet mango pulp and a touch of cardamom.',
  'soft drink': 'A selection of refreshing carbonated beverages to complement your meal.',
  'masala chai': 'Traditional Indian spiced tea brewed with black tea leaves, milk, sugar, and aromatic spices like cardamom, ginger, and cloves.'
};

function getDescriptionForDish(name: string): string {
  const lowerName = name.toLowerCase();
  for (const [key, desc] of Object.entries(DISH_DESCRIPTIONS)) {
    if (lowerName.includes(key)) {
      return desc;
    }
  }
  if (lowerName.includes('chicken')) return 'Succulent pieces of chicken cooked to perfection with a blend of traditional aromatic Indian spices, fresh herbs, and a rich, flavorful sauce.';
  if (lowerName.includes('lamb')) return 'Tender chunks of lamb slow-cooked in a rich, flavorful gravy infused with exotic spices, garlic, ginger, and fresh herbs.';
  if (lowerName.includes('beef')) return 'Hearty and robust beef curry simmered with a complex blend of spices, garlic, ginger, and onions for a deep, savory taste.';
  if (lowerName.includes('goat')) return 'Traditional bone-in goat curry, slow-cooked until tender in a thick, spicy sauce rich in authentic flavors and aromatic spices.';
  if (lowerName.includes('fish') || lowerName.includes('prawn')) return 'Fresh seafood delicacy simmered in a tangy and spicy coconut-based sauce, bursting with coastal flavors and fresh herbs.';
  if (lowerName.includes('paneer')) return 'Fresh, soft cottage cheese cubes cooked in a savory, creamy gravy with a delicate balance of spices and fresh ingredients.';
  if (lowerName.includes('vegetable') || lowerName.includes('veg')) return 'A delightful medley of fresh garden vegetables cooked in a aromatic spice mix and savory sauce, perfect for vegetarians.';
  
  return 'A delicious, authentic traditional Indian dish prepared with fresh, high-quality ingredients and time-honored cooking techniques.';
}

export async function getMenuData(location: 'norwest' | 'dural' = 'norwest'): Promise<MenuData> {
  const state = await getMenuState(location);
  
  // If idle and empty, trigger update
  if (state.status === 'idle' && state.sections.length === 0) {
    triggerMenuUpdate(false, location);
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
    triggerMenuUpdate(false, location);
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
    menuDate: state.menuDate,
    error: state.error,
    progress: state.progress
  };
}

export async function processMenu(force: boolean = false, location: 'norwest' | 'dural' = 'norwest'): Promise<void> {
  // This is called by instrumentation.ts
  // We just trigger the update in background
  triggerMenuUpdate(force, location);
}

export async function triggerMenuUpdate(force: boolean = false, location: 'norwest' | 'dural' = 'norwest') {
  const state = await getMenuState(location);
  
  // Check for stale state
  const STALE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
  const isStale = !state.updatedAt || (Date.now() - state.updatedAt > STALE_TIMEOUT);
  const isProcessing = state.status === 'fetching-pdf' || state.status === 'parsing-pdf' || state.status === 'generating-content';

  // Prevent concurrent updates unless stale
  if (isProcessing && !isStale) {
    console.log('Menu update already in progress.');
    return;
  }

  // If we have a complete menu and we are not forcing an update, skip it.
  if (!force && !isStale && state.status === 'complete' && state.sections.length > 0) {
    console.log('Menu is already valid. Skipping auto-update.');
    return;
  }

  console.log(`Starting menu update for ${location}...`);
  
  // Check for OpenAI Key early for logging
  if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️ WARNING: OPENAI_API_KEY is missing. Menu parsing will fall back to regex-based parsing which may be less accurate.");
  }

  await updateMenuState({ 
    status: 'fetching-pdf', 
    error: undefined,
    progress: { current: 5, total: 100, stage: `Fetching ${location} PDF menu...` }
  }, location);

  try {
    const url = location === 'dural' 
      ? 'https://mitrandadhaba-dural.com.au/todaysmenu.pdf'
      : 'https://mitrandadhabaglassyjunction.com.au/bvtodaysmenu.pdf';
      
    const response = await fetch(url, { next: { revalidate: 0 } }); // No cache for the PDF fetch itself
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await updateMenuState({ 
      status: 'parsing-pdf',
      progress: { current: 15, total: 100, stage: 'PDF fetched. Parsing content...' }
    }, location);

    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        resolve(pdfParser.getRawTextContent());
      });
      pdfParser.parseBuffer(buffer);
    });
    
    console.log('PDF Text extracted (first 200 chars):', text.substring(0, 200));

    // Extract date from PDF text
    // Look for patterns like "01.01.2026", "1st January 2026", "01/01/2026"
    const dateRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})|(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
    const dateMatch = text.match(dateRegex);
    const menuDate = dateMatch ? dateMatch[0] : undefined;
    console.log('Extracted menu date:', menuDate);

    // Update the progress update to reflect the method
    const parsingStage = process.env.OPENAI_API_KEY 
        ? 'Analyzing menu structure with AI...' 
        : 'Analyzing menu structure (Local fallback)...';

    await updateMenuState({ 
      status: 'generating-content',
      progress: { current: 25, total: 100, stage: parsingStage }
    }, location);

    let sections: MenuSection[] = [];

    // If OpenAI API key is available, use it for parsing
    if (process.env.OPENAI_API_KEY) {
      console.log('Using OpenAI to parse menu...');
      sections = await parseMenuWithAI(text, location);
    } else {
      console.log('OpenAI API key not found, falling back to local regex parser.');
      sections = await parseMenuText(text, location);
    }

    // Update state with the new sections
    const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
    await updateMenuState({ 
      status: 'complete', 
      sections: sections,
      menuDate: menuDate,
      lastUpdated: Date.now(),
      progress: { current: 100, total: 100, stage: `Success! Found ${totalItems} items.` }
    }, location);
    console.log('Menu structure update complete.');

  } catch (error: any) {
    console.error('Error processing menu:', error);
    await updateMenuState({ 
      status: 'error', 
      error: error.message || 'Unknown error',
      progress: { current: 0, total: 100, stage: `Error: ${error.message}` }
    }, location);
  }
}

async function parseMenuWithAI(text: string, location: string): Promise<MenuSection[]> {
  const openai = new OpenAI();

  const prompt = `
    You are a data extraction assistant. Extract the menu items from the following raw text of a restaurant menu PDF.
    The text might be messy, with headers and prices scattered.
    
    Identify sections (e.g., Entree, Mains, Breads, Drinks, Lunch Special, etc.).
    For each item, extract:
    - Name (clean up the name, remove price or weird characters)
    - Price (as a number)
    - Description: If a description is present in the text, use it. If NOT, generate a detailed, appetizing, and rich description of the dish (approx 20-30 words). Explicitly mention the main ingredients (e.g., type of meat, vegetables, lentils), the cooking style (e.g., tandoori, slow-cooked, fried), and key spices or flavors (e.g., creamy tomato sauce, spicy vindaloo paste, aromatic saffron). Example: "Tender boneless chicken marinated in yogurt and traditional spices, slow-cooked in a rich, creamy tomato and butter sauce with a hint of fenugreek."
    
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

    return await processSections(rawSections, location);
  } catch (error) {
    console.error("AI Parsing failed:", error);
    return parseMenuText(text, location); // Fallback
  }
}

async function parseMenuText(text: string, location: string): Promise<MenuSection[]> {
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
    return processSections(getMockMenu(), location);
  }

  return processSections(sections, location);
}

async function processSections(rawSections: any[], location: string): Promise<MenuSection[]> {
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
      }, location);
    }
  };

  const processedSections = await Promise.all(rawSections.map(async (section: any) => ({
    title: section.title,
    items: await Promise.all((section.items || []).map(async (item: any) => {
      const id = Buffer.from(item.name).toString('base64');
      
      // Check cache first
      const cachedItem = await getCachedItem(cache, item.name);
      const price = typeof item.price === 'string' ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : Number(item.price);

      if (cachedItem) {
        cacheUpdated = true;
        await updateProgress(item.name);

        return {
          id: id,
          name: item.name,
          price: price,
          category: section.title,
          imageQuery: '', // Disabled images
          description: cachedItem.description
        };
      }

      // If not in cache, generate data
      const description = item.description || getDescriptionForDish(item.name);
      
      // Image generation disabled as per request to improve performance and reliability
      const imageQuery = ''; 

      updateCacheItem(cache, item.name, description, imageQuery);
      cacheUpdated = true;
      
      await updateProgress(item.name);

      return {
        id: id,
        name: item.name,
        price: price,
        category: section.title,
        imageQuery: imageQuery,
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
  return [
    {
      title: 'Entrees',
      items: [
        { id: '1', name: 'Samosa', price: 8.00, category: 'Entrees', imageQuery: '', description: 'Crispy, golden-fried pastry triangles generously filled with a savory mixture of spiced potatoes, green peas, and aromatic herbs.' },
        { id: '2', name: 'Chicken Tikka', price: 14.00, category: 'Entrees', imageQuery: '', description: 'Succulent boneless chicken pieces marinated overnight in yogurt and traditional spices, then roasted to smoky perfection in a clay tandoor oven.' },
      ]
    },
    {
      title: 'Mains',
      items: [
        { id: '3', name: 'Butter Chicken', price: 22.00, category: 'Mains', imageQuery: '', description: 'Tender, boneless chicken pieces simmered in a rich, creamy tomato and butter sauce, delicately flavored with fenugreek leaves and mild spices.' },
        { id: '4', name: 'Lamb Rogan Josh', price: 24.00, category: 'Mains', imageQuery: '', description: 'A classic aromatic lamb curry slow-cooked with a blend of traditional spices, fennel seeds, ginger, and Kashmiri chilies for a deep, rich flavor.' },
        { id: '5', name: 'Palak Paneer', price: 20.00, category: 'Mains', imageQuery: '', description: 'Fresh, soft cottage cheese cubes simmered in a smooth, spiced spinach gravy, finished with a touch of cream and ginger.' },
      ]
    },
    {
      title: 'Breads',
      items: [
        { id: '6', name: 'Garlic Naan', price: 4.50, category: 'Breads', imageQuery: '', description: 'Soft, leavened flatbread baked in a tandoor oven and generously topped with minced garlic and fresh cilantro.' },
        { id: '7', name: 'Roti', price: 4.00, category: 'Breads', imageQuery: '', description: 'Traditional whole wheat flatbread cooked in a tandoor, offering a wholesome and slightly smoky flavor, perfect for scooping up curries.' },
      ]
    }
  ];
}