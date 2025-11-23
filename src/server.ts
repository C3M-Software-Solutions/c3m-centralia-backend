import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './config/database.js';
import { config } from './config/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { swaggerSpec } from './swagger.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();

// Connect to database
connectDatabase();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
); // Security headers
app.use(
  cors({
    origin: config.server.corsOrigin,
    credentials: true,
  })
);
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (only for local storage)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Swagger Documentation
// Always use CDN to avoid static file serving issues in serverless
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'C3M Centralia API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.5/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.5/swagger-ui-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.10.5/swagger-ui-standalone-preset.min.js',
  ],
};

// Don't use swaggerUi.serve to avoid static file issues
app.get('/api-docs', (_req: Request, res: Response) => {
  res.redirect('/api-docs/');
});

app.use('/api-docs/', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'success',
    message: 'C3M Centralia Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      api: '/api',
      health: '/health',
      auth: '/api/auth',
      businesses: '/api/businesses',
      reservations: '/api/reservations',
      clinicalRecords: '/api/clinical-records',
      upload: '/api/upload',
    },
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'C3M Centralia API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      documentation: '/api-docs',
      auth: '/api/auth',
      users: '/api/users',
      businesses: '/api/businesses',
      services: '/api/services',
      specialists: '/api/specialists',
      reservations: '/api/reservations',
      clinicalRecords: '/api/clinical-records',
      upload: '/api/upload',
    },
  });
});

// Routes
import {
  authRoutes,
  businessRoutes,
  reservationRoutes,
  clinicalRecordRoutes,
  uploadRoutes,
} from './routes/index.js';

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server only if not in Vercel
if (process.env.VERCEL !== '1') {
  const PORT = config.server.port;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${config.server.nodeEnv}`);
    console.log(`🔗 API available at http://localhost:${PORT}/api`);
  });
}

export default app;
