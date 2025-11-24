import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express, { Express } from 'express';
import {
  authRoutes,
  businessRoutes,
  reservationRoutes,
  clinicalRecordRoutes,
  uploadRoutes,
  serviceRoutes,
  specialistRoutes,
} from '../src/routes/index.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

let mongoServer: MongoMemoryServer;

// Create test app with all routes
export const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/businesses', businessRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/clinical-records', clinicalRecordRoutes);
  app.use('/api/upload', uploadRoutes);
  // Nested routes for business-specific resources
  app.use('/api/businesses/:businessId/services', serviceRoutes);
  app.use('/api/businesses/:businessId/specialists', specialistRoutes);
  app.use(errorHandler);
  return app;
};

// Setup before all tests
beforeAll(async () => {
  // Close any existing connections first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect and stop the in-memory database
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
