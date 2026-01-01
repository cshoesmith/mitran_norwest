export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Application starting... Initializing menu processing.');
    try {
      // Dynamic import to avoid bundling issues if any
      const { processMenu } = await import('./lib/menuProcessor');
      // Run in background for both locations
      Promise.all([
        processMenu(false, 'norwest'),
        processMenu(false, 'dural')
      ]).then(() => {
        console.log('Initial menu processing complete for both locations.');
      }).catch(err => {
        console.error('Initial menu processing failed:', err);
      });
    } catch (error) {
      console.error('Failed to import menu processor:', error);
    }
  }
}
