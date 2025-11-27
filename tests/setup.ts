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
  app.use('/api/businesses/:businessId/services', serviceRoutes);
  app.use('/api/businesses/:businessId/specialists', specialistRoutes);
  app.use(errorHandler);
  return app;
};

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri);

  // Disable auto index creation AFTER connection
  mongoose.set('autoIndex', false);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Only silence non-critical logs
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
