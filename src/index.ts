import app from './server.js';
import { config } from './config/index.js';

// Start server when not in Vercel (for production builds)
if (process.env.VERCEL !== '1') {
  const PORT = config.server.port;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${config.server.nodeEnv}`);
    console.log(`🔗 API available at http://localhost:${PORT}/api`);
  });
}

export default app;
