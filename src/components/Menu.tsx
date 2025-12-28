'use client';

import { MenuSection } from '@/types/menu';
import MenuItemCard from './MenuItemCard';
import { useState } from 'react';
import clsx from 'clsx';

interface MenuProps {
  sections: MenuSection[];
}

export default function Menu({ sections = [] }: MenuProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.title);

  if (!Array.isArray(sections) || sections.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500">
        No menu items found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-32">
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        <div className="flex p-4 gap-3 whitespace-nowrap min-w-max mx-auto max-w-5xl">
          {sections.map((section, index) => (
            <button
              key={`${section.title}-${index}`}
              onClick={() => {
                setActiveSection(section.title);
                const element = document.getElementById(section.title);
                if (element) {
                  const offset = 80; // Height of sticky header
                  const bodyRect = document.body.getBoundingClientRect().top;
                  const elementRect = element.getBoundingClientRect().top;
                  const elementPosition = elementRect - bodyRect;
                  const offsetPosition = elementPosition - offset;

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                }
              }}
              className={clsx(
                "px-5 py-2 rounded-full text-sm font-medium transition-all",
                activeSection === section.title
                  ? "bg-orange-600 text-white shadow-md scale-105"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              {section.title}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 space-y-16 mt-6">
        {sections.map((section, index) => (
          <section 
            key={`${section.title}-${index}`} 
            id={section.title} 
            className="scroll-mt-24"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '1000px' }}
          >
            <h2 className="text-3xl font-bold mb-8 px-2 border-l-4 border-orange-600 pl-4 text-zinc-800 dark:text-zinc-100">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(section.items || []).map((item, itemIndex) => (
                <MenuItemCard key={`${item.id}-${itemIndex}`} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
