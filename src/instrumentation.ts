export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Application starting... Initializing menu processing.');
    try {
      // Dynamic import to avoid bundling issues if any
      const { processMenu } = await import('./lib/menuProcessor');
      // Run in background
      processMenu().then(() => {
        console.log('Initial menu processing complete.');
      }).catch(err => {
        console.error('Initial menu processing failed:', err);
      });
    } catch (error) {
      console.error('Failed to import menu processor:', error);
    }
  }
}
