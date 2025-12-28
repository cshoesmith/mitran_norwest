# Mitran Da Dhaba Menu App

This is a Next.js web application that displays the daily menu for Mitran Da Dhaba.

## Features

- **Daily Menu Parsing**: Automatically downloads and parses the daily PDF menu from the restaurant's website.
- **AI Image Search**: Fetches images for each dish using AI image generation (Pollinations.ai).
- **Interactive Menu**: Scrolling menu with sections (Entree, Mains, etc.).
- **Ordering System**: Add items to cart, adjust quantities, and view total cost.
- **Responsive Design**: Works on mobile and desktop.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

To enable AI-powered menu parsing (recommended for complex layouts), create a `.env.local` file in the root directory and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-...
```

If no API key is provided, the app will fall back to a basic text parser.

## Technologies Used

- Next.js 14 (App Router)
- Tailwind CSS
- Zustand (State Management)
- PDF2JSON (PDF Parsing)
- Framer Motion (Animations)
- Lucide React (Icons)
- OpenAI (Optional, for advanced parsing)
