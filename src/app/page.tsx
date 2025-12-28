import { getMenuFromPDF } from './actions';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import ImageGenerationProgress from '@/components/ImageGenerationProgress';
import MenuStatusPoller from '@/components/MenuStatusPoller';
import ProgressBar from '@/components/ProgressBar';

export const revalidate = 0; // Disable static caching for this page so it always checks state

export default async function Home() {
  const { sections, isMock, isProcessing, progress } = await getMenuFromPDF();
  const hasItems = sections.some(s => s.items.length > 0);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      <MenuStatusPoller isProcessing={isProcessing} />
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

          {!isMock && isProcessing && hasItems && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 dark:border-blue-300"></div>
                <div>
                  <p className="font-semibold">Menu is being updated</p>
                  <p className="text-sm">We are fetching the latest dishes and generating images. This page will refresh automatically.</p>
                </div>
              </div>
              {progress && (
                <ProgressBar 
                  current={progress.current} 
                  total={progress.total} 
                  stage={progress.stage} 
                />
              )}
            </div>
          )}
        </div>
      </header>
      
      {hasItems ? (
        <Menu sections={sections} />
      ) : (
        <div className="max-w-5xl mx-auto p-12 text-center">
          <div className="animate-pulse space-y-8 max-w-2xl mx-auto">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
            </div>
          </div>
          <p className="mt-8 text-zinc-500 font-medium">Preparing today&apos;s menu...</p>
          {progress && (
             <ProgressBar 
               current={progress.current} 
               total={progress.total} 
               stage={progress.stage} 
             />
          )}
        </div>
      )}
      
      <Cart />
      <ImageGenerationProgress />
    </main>
  );
}
