import { getMenuFromPDF } from './actions';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import ImageGenerationProgress from '@/components/ImageGenerationProgress';

export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  const { sections, isMock, isProcessing } = await getMenuFromPDF();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-orange-600">Mitran Da Dhaba</h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium">Authentic Indian Cuisine • Daily Menu</p>
          
          {isMock && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <p className="font-semibold">⚠️ Could not load today&apos;s menu.</p>
              <p className="text-sm">Showing a sample menu instead. Please check back later.</p>
            </div>
          )}

          {!isMock && isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300">
              <p className="font-semibold">ℹ️ Menu is being updated.</p>
              <p className="text-sm">New items are being processed. Images may take a few moments to appear.</p>
            </div>
          )}
        </div>
      </header>
      
      <Menu sections={sections} />
      <Cart />
      <ImageGenerationProgress />
    </main>
  );
}
