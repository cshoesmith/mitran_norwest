'use server'

import { MenuSection, MenuItem } from '@/types/menu';
import OpenAI from 'openai';

const PDFParser = require("pdf2json");

export async function getMenuFromPDF(): Promise<MenuSection[]> {
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
    return getMockMenu();
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
    - Description (if available)
    
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

    // Map to our internal structure and add IDs/Images
    return sections.map((section: any) => ({
      title: section.title,
      items: (section.items || []).map((item: any) => {
        const id = Buffer.from(item.name).toString('base64');
        
        let imageContext = 'Indian food dish close up professional photography';
        const lowerTitle = (section.title || '').toLowerCase();
        const lowerName = (item.name || '').toLowerCase();

        if (lowerTitle.includes('drink') || lowerTitle.includes('beverage') || lowerName.includes('lassi') || lowerName.includes('coke') || lowerName.includes('soda')) {
          imageContext = 'drink in a glass refreshing beverage professional photography';
        } else if (lowerTitle.includes('dessert') || lowerTitle.includes('sweet')) {
          imageContext = 'dessert sweet dish professional photography';
        } else if (lowerTitle.includes('bread') || lowerTitle.includes('naan') || lowerTitle.includes('roti')) {
          imageContext = 'indian bread basket professional photography';
        }

        return {
          id: id,
          name: item.name,
          price: item.price,
          category: section.title,
          imageQuery: `${item.name} ${imageContext}`,
          description: item.description || ''
        };
      })
    }));
  } catch (error) {
    console.error("AI Parsing failed:", error);
    return parseMenuText(text); // Fallback
  }
}

function parseMenuText(text: string): MenuSection[] {
  // pdf2json raw text content might contain page breaks and other artifacts
  // We need to clean it up.
  const lines = text.split(/\r\n|\n|\r/).map(line => line.trim()).filter(line => line.length > 0);
  const sections: MenuSection[] = [];
  let currentSection: MenuSection | null = null;
  
  // Heuristic keywords for sections
  const sectionKeywords = ['ENTREE', 'APPETISER', 'MAIN', 'CURRY', 'RICE', 'BREAD', 'NAAN', 'DRINK', 'DESSERT', 'SIDES', 'VEG', 'NON-VEG'];
  
  // Regex to find price at the end of a line (e.g., 12.50, $12.50, 12)
  const priceRegex = /(\$?\d+(\.\d{1,2})?)$/;

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
        
        let imageContext = 'Indian food dish close up professional photography';
        const lowerTitle = currentSection.title.toLowerCase();
        const lowerName = name.toLowerCase();

        if (lowerTitle.includes('drink') || lowerTitle.includes('beverage') || lowerName.includes('lassi') || lowerName.includes('coke') || lowerName.includes('soda')) {
          imageContext = 'drink in a glass refreshing beverage professional photography';
        } else if (lowerTitle.includes('dessert') || lowerTitle.includes('sweet')) {
          imageContext = 'dessert sweet dish professional photography';
        } else if (lowerTitle.includes('bread') || lowerTitle.includes('naan') || lowerTitle.includes('roti')) {
          imageContext = 'indian bread basket professional photography';
        }

        currentSection.items.push({
          id: id,
          name: name,
          price: price,
          category: currentSection.title,
          imageQuery: `${name} ${imageContext}`,
          description: ''
        });
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    return getMockMenu();
  }

  return sections;
}

function getMockMenu(): MenuSection[] {
  return [
    {
      title: 'Entrees',
      items: [
        { id: '1', name: 'Samosa', price: 8.00, category: 'Entrees', imageQuery: 'Samosa indian food' },
        { id: '2', name: 'Chicken Tikka', price: 14.00, category: 'Entrees', imageQuery: 'Chicken Tikka indian food' },
      ]
    },
    {
      title: 'Mains',
      items: [
        { id: '3', name: 'Butter Chicken', price: 22.00, category: 'Mains', imageQuery: 'Butter Chicken indian food' },
        { id: '4', name: 'Lamb Rogan Josh', price: 24.00, category: 'Mains', imageQuery: 'Lamb Rogan Josh indian food' },
        { id: '5', name: 'Palak Paneer', price: 20.00, category: 'Mains', imageQuery: 'Palak Paneer indian food' },
      ]
    },
    {
      title: 'Breads',
      items: [
        { id: '6', name: 'Garlic Naan', price: 4.50, category: 'Breads', imageQuery: 'Garlic Naan' },
        { id: '7', name: 'Roti', price: 4.00, category: 'Breads', imageQuery: 'Roti indian bread' },
      ]
    }
  ];
}
