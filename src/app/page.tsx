import { getMenuFromPDF } from './actions';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';

export const revalidate = 3600; // Revalidate every hour

export default async function Home() {
  const sections = await getMenuFromPDF();

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight text-orange-600">Mitran Da Dhaba</h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium">Authentic Indian Cuisine • Daily Menu</p>
        </div>
      </header>
      
      <Menu sections={sections} />
      <Cart />
    </main>
  );
}
