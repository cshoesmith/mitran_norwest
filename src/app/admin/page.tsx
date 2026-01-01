'use client';

import { useState } from 'react';
import { login, clearDescriptionCache, resetMenu } from './actions';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const success = await login(password);
      if (success) {
        setIsAuthenticated(true);
        setMessage('');
      } else {
        setMessage('Incorrect password');
      }
    } catch (err) {
      setMessage('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the description cache? This will force AI to regenerate all descriptions.')) return;
    
    setLoading(true);
    try {
      await clearDescriptionCache();
      setMessage('Description cache cleared successfully.');
    } catch (err) {
      setMessage('Failed to clear cache.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMenu = async (location: 'norwest' | 'dural') => {
    if (!confirm(`Are you sure you want to reset the ${location} menu? This will force a complete rebuild.`)) return;
    
    setLoading(true);
    try {
      await resetMenu(location);
      setMessage(`${location} menu reset successfully.`);
    } catch (err) {
      setMessage('Failed to reset menu.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                placeholder="Enter admin password"
              />
            </div>
            {message && <p className="text-red-500 text-sm">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        
        {message && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
            {message}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4">Cache Management</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Clear the AI description cache. This will force the system to regenerate descriptions for all items next time they are processed.
            </p>
            <button
              onClick={handleClearCache}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              Clear Description Cache
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4">Menu State Management</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Reset the menu state. This will clear the current menu and force a complete rebuild from the PDF.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleResetMenu('norwest')}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Reset Norwest Menu
              </button>
              <button
                onClick={() => handleResetMenu('dural')}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Reset Dural Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
