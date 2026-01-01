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
  const { sections, isMock, isProcessing, menuDate, progress, error } = await getMenuFromPDF(currentLocation);
  const hasItems = sections.some(s => s.items.length > 0);

  const pdfUrl = currentLocation === 'dural' 
    ? 'https://mitrandadhaba-dural.com.au/todaysmenu.pdf'
    : 'https://mitrandadhabaglassyjunction.com.au/bvtodaysmenu.pdf';

  return (
    <main className="min-h-screen bg-theme text-zinc-900 dark:text-zinc-100 font-sans">
      <MenuStatusPoller isProcessing={isProcessing} />
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50 py-12 px-4 relative">
        <div className="absolute top-2 right-2 text-xs text-zinc-400 dark:text-zinc-600 font-mono">
           v1.0.6 (Build: 2026-01-01 12:15 PM)
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

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
              <p className="font-semibold">❌ Error updating menu</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!isMock && isProcessing && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 transition-all duration-300 ease-in-out">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Menu is being updated</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Fetching latest dishes...</p>
                  </div>
                </div>
                <div className="flex-1 max-w-xs hidden sm:block">
                  {progress && (
                    <div className="w-full">
                      <div className="flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        <span>{progress.stage}</span>
                        <span>{progress.current}%</span>
                      </div>
                      <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-600 transition-all duration-500 ease-in-out"
                          style={{ width: `${progress.current}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
