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
import { reminderService } from './services/reminderService.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();

// Connect to database
connectDatabase();

// Start reminder service (runs every hour)
reminderService.start();

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
);

// Security headers
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

app.get('/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    explorer: true,
    swaggerOptions: {
      url: '/swagger.json',
    },
    customSiteTitle: 'C3M Centralia API Documentation',
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css',
    customJs: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.js',
  })
);

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
  serviceRoutes,
  specialistRoutes,
} from './routes/index.js';

app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/businesses/:businessId/services', serviceRoutes);
app.use('/api/businesses/:businessId/specialists', specialistRoutes);
app.use('/api/specialists', specialistRoutes); // Direct access for available-slots endpoint
app.use('/api/reservations', reservationRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
