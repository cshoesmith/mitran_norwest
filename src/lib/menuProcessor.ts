import { MenuSection, MenuItem } from '@/types/menu';
import OpenAI from 'openai';
import { loadCache, saveCache, getCachedItem, updateCacheItem, downloadImage } from '@/lib/menuCache';

const PDFParser = require("pdf2json");

export interface MenuData {
  sections: MenuSection[];
  isMock: boolean;
  isProcessing: boolean;
}

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

export async function processMenu(): Promise<MenuData> {
  try {
    const url = 'https://mitrandadhabaglassyjunction.com.au/bvtodaysmenu.pdf';
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        resolve(pdfParser.getRawTextContent());
      });
      pdfParser.parseBuffer(buffer);
    });
    
    // If OpenAI API key is available, use it for parsing
    if (process.env.OPENAI_API_KEY) {
      return await parseMenuWithAI(text);
    }

    return parseMenuText(text);
  } catch (error) {
    console.error('Error fetching or parsing PDF:', error);
    // Return mock data if parsing fails, so the app is usable
    return { sections: getMockMenu(), isMock: true, isProcessing: false };
  }
}

async function parseMenuWithAI(text: string): Promise<MenuData> {
  const openai = new OpenAI();

  const prompt = `
    You are a data extraction assistant. Extract the menu items from the following raw text of a restaurant menu PDF.
    The text might be messy, with headers and prices scattered.
    
    Identify sections (e.g., Entree, Mains, Breads, Drinks, Lunch Special, etc.).
    For each item, extract:
    - Name (clean up the name, remove price or weird characters)
    - Price (as a number)
    - Description: If a description is present in the text, use it. If NOT, generate a short 1-sentence blurb describing the ingredients and flavor profile of the dish based on its name (e.g. "Spicy chicken curry with rich tomato gravy").
    
    Return ONLY a valid JSON array of objects with this structure:
    [
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
    let sections = result.sections || result;

    if (!Array.isArray(sections)) {
      // Try to find an array property if the root isn't an array
      const arrayProp = Object.values(result).find(val => Array.isArray(val));
      if (arrayProp) {
        sections = arrayProp;
      } else {
        throw new Error("AI response is not an array and has no sections property");
      }
    }

    // Load cache
    const cache = await loadCache();
    let cacheUpdated = false;

    // Map to our internal structure and add IDs/Images
    const processedSections = await Promise.all(sections.map(async (section: any) => ({
      title: section.title,
      items: await Promise.all((section.items || []).map(async (item: any) => {
        const id = Buffer.from(item.name).toString('base64');
        
        // Check cache first
        const cachedItem = await getCachedItem(cache, item.name);
        if (cachedItem) {
          cacheUpdated = true; // TTL updated
          return {
            id: id,
            name: item.name,
            price: item.price,
            category: section.title,
            imageQuery: cachedItem.imagePath, // Use cached path (local or remote)
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
        const imageQuery = `${item.name} ${imageContext}`;
        const seed = id; // Use ID as seed
        const remoteImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageQuery)}?width=400&height=400&nologo=true&seed=${seed}`;
        
        // Trigger background download (don't await)
        const filename = `${id}.jpg`;
        downloadImage(remoteImageUrl, filename).then(localPath => {
          if (localPath) {
            // Update cache with local path once downloaded
            // We need to reload cache to avoid race conditions or just update this instance
            // For simplicity in this serverless-ish env, we'll just update the file
            loadCache().then(latestCache => {
              updateCacheItem(latestCache, item.name, description, localPath);
              saveCache(latestCache);
            });
          }
        });

        // Save initial entry with remote URL so we have something immediately
        updateCacheItem(cache, item.name, description, remoteImageUrl);
        cacheUpdated = true;

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

    return { sections: processedSections, isMock: false, isProcessing: cacheUpdated };
  } catch (error) {
    console.error("AI Parsing failed:", error);
    return parseMenuText(text); // Fallback
  }
}

async function parseMenuText(text: string): Promise<MenuData> {
  // pdf2json raw text content might contain page breaks and other artifacts
  // We need to clean it up.
  const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(line => line.length > 0);
  const sections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;
  
  // Heuristic keywords for sections
  const sectionKeywords = ['ENTREE', 'APPETISER', 'MAIN', 'CURRY', 'RICE', 'BREAD', 'NAAN', 'DRINK', 'DESSERT', 'SIDES', 'VEG', 'NON-VEG'];
  
  // Regex to find price at the end of a line (e.g., 12.50, $12.50, 12)
  const priceRegex = /(\$?\d+(\.\d{1,2})?)$/;

  // Load cache
  const cache = await loadCache();
  let cacheUpdated = false;

  for (const line of lines) {
    // Remove artifacts like "Page 1" or dashes
    if (line.startsWith('----------------')) continue;

    const upperLine = line.toUpperCase();
    
    // Check if line is a section header
    const isSection = sectionKeywords.some(keyword => upperLine.includes(keyword)) && line.length < 30 && !priceRegex.test(line);
    
    if (isSection) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line,
        items: []
      };
      continue;
    }

    // Check if line is an item
    const priceMatch = line.match(priceRegex);
    if (priceMatch && currentSection) {
      const priceStr = priceMatch[0].replace('$', '');
      const price = parseFloat(priceStr);
      const name = line.replace(priceRegex, '').trim();
      
      if (name.length > 2) {
        // Create a stable ID based on the name
        const id = Buffer.from(name).toString('base64');
        
        // Check cache first
        const cachedItem = await getCachedItem(cache, name);
        if (cachedItem) {
          cacheUpdated = true;
          currentSection.items.push({
            id: id,
            name: name,
            price: price,
            category: currentSection.title,
            imageQuery: cachedItem.imagePath,
            description: cachedItem.description
          });
          continue;
        }

        let imageContext = 'Punjabi Dhaba style Indian food served in a traditional copper handi bowl professional photography';
        const lowerTitle = currentSection.title.toLowerCase();
        const lowerName = name.toLowerCase();

        if (lowerTitle.includes('drink') || lowerTitle.includes('beverage') || lowerName.includes('lassi') || lowerName.includes('coke') || lowerName.includes('soda')) {
          imageContext = 'drink served in a glass refreshing beverage professional photography';
        } else if (lowerTitle.includes('dessert') || lowerTitle.includes('sweet')) {
          imageContext = 'dessert sweet dish served in a small bowl or plate professional photography';
        } else if (lowerTitle.includes('bread') || lowerTitle.includes('naan') || lowerTitle.includes('roti') || lowerTitle.includes('parantha')) {
          imageContext = 'Indian bread served in a basket or on a plate professional photography';
        } else if (lowerTitle.includes('lunch') || lowerTitle.includes('thali') || lowerName.includes('thali') || lowerName.includes('rice') || lowerName.includes('biryani')) {
           imageContext = 'Punjabi Dhaba style meal served on a steel thali plate with rice professional photography';
        }

        const description = getDescriptionForDish(name);
        const imageQuery = `${name} ${imageContext}`;
        const seed = id;
        const remoteImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageQuery)}?width=400&height=400&nologo=true&seed=${seed}`;

        // Trigger background download
        const filename = `${id}.jpg`;
        downloadImage(remoteImageUrl, filename).then(localPath => {
          if (localPath) {
            loadCache().then(latestCache => {
              updateCacheItem(latestCache, name, description, localPath);
              saveCache(latestCache);
            });
          }
        });

        updateCacheItem(cache, name, description, remoteImageUrl);
        cacheUpdated = true;

        currentSection.items.push({
          id: id,
          name: name,
          price: price,
          category: currentSection.title,
          imageQuery: remoteImageUrl,
          description: description
        });
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  if (cacheUpdated) {
    await saveCache(cache);
  }

  if (sections.length === 0) {
    return { sections: getMockMenu(), isMock: true, isProcessing: false };
  }

  return { sections, isMock: false, isProcessing: cacheUpdated };
}

function getMockMenu(): MenuSection[] {
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
