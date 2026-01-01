import { getMenuFromPDF } from './actions';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import MenuStatusPoller from '@/components/MenuStatusPoller';
import ProgressBar from '@/components/ProgressBar';
import LocationSwitcher from '@/components/LocationSwitcher';

export const revalidate = 0; // Disable static caching for this page so it always checks state

export default async function Home({ searchParams }: { searchParams: Promise<{ location?: string }> }) {
  const { location } = await searchParams;
  const currentLocation = (location === 'dural' ? 'dural' : 'norwest') as 'norwest' | 'dural';
  const { sections, isMock, isProcessing, menuDate, progress } = await getMenuFromPDF(currentLocation);
  const hasItems = sections.some(s => s.items.length > 0);

  const pdfUrl = currentLocation === 'dural' 
    ? 'https://mitrandadhaba-dural.com.au/todaysmenu.pdf'
    : 'https://mitrandadhabaglassyjunction.com.au/bvtodaysmenu.pdf';

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      <MenuStatusPoller isProcessing={isProcessing} />
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-12 px-4 relative">
        <div className="absolute top-2 right-2 text-xs text-zinc-300 dark:text-zinc-700 font-mono">
           v1.0.5 (Build: 2026-01-01 12:05 PM)
        </div>
        <div className="max-w-5xl mx-auto">
          <LocationSwitcher />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-orange-600">Mitran Da Dhaba</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg text-zinc-500 dark:text-zinc-400 font-medium">
            <span>Authentic Indian Cuisine</span>
            <span>•</span>
            <span>Daily Menu {menuDate ? `• ${menuDate}` : ''}</span>
            <span className="hidden sm:inline">•</span>
            <a 
               href={pdfUrl} 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-base text-orange-600 hover:text-orange-700 dark:text-orange-500 dark:hover:text-orange-400 hover:underline inline-flex items-center gap-1"
            >
              View PDF
            </a>
          </div>
          
          {isMock && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <p className="font-semibold">⚠️ Could not load today&apos;s menu.</p>
              <p className="text-sm">Showing a sample menu instead. Please check back later.</p>
            </div>
          )}

          {!isMock && isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 dark:border-blue-300"></div>
                <div>
                  <p className="font-semibold">Menu is being updated</p>
                  <p className="text-sm">We are fetching the latest dishes. This page will refresh automatically.</p>
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
          <p className="mb-8 text-zinc-500 font-medium">Preparing today&apos;s menu...</p>
          <div className="animate-pulse space-y-8 max-w-2xl mx-auto">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
               <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
            </div>
          </div>
        </div>
      )}
      
      <Cart />
    </main>
  );
}
