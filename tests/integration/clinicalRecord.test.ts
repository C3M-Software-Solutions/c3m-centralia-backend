import request from 'supertest';
import { Express } from 'express';
import { User } from '../../src/models/User.js';
import { Business } from '../../src/models/Business.js';
import { Specialist } from '../../src/models/Specialist.js';
import { ClinicalRecord } from '../../src/models/ClinicalRecord.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { hashPassword } from '../../src/utils/password.js';
import { createTestApp } from '../setup.js';

describe('ClinicalRecord Integration Tests', () => {
  let app: Express;
  let specialistToken: string;
  let patientUser: any;
  let specialistUser: any;
  let business: any;
  let specialist: any;

  beforeEach(async () => {
    app = createTestApp();

    patientUser = await User.create({
      name: 'Patient User',
      email: 'patient@test.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    specialistUser = await User.create({
      name: 'Specialist User',
      email: 'specialist@test.com',
      password: await hashPassword('password123'),
      role: 'specialist',
    });

    specialistToken = generateAccessToken({
      userId: specialistUser._id,
      email: specialistUser.email,
      role: specialistUser.role,
    });

    business = await Business.create({
      name: 'Test Clinic',
      user: patientUser._id,
    });

    specialist = await Specialist.create({
      user: specialistUser._id,
      business: business._id,
      specialty: 'General',
    });
  });

  describe('POST /api/clinical-records', () => {
    it('should create a clinical record as specialist', async () => {
      const recordData = {
        user: patientUser._id.toString(),
        business: business._id.toString(),
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment',
        notes: 'Test notes',
      };

      const response = await request(app)
        .post('/api/clinical-records')
        .set('Authorization', `Bearer ${specialistToken}`)
        .send(recordData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.clinicalRecord).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const recordData = {
        user: patientUser._id.toString(),
        business: business._id.toString(),
        diagnosis: 'Test',
        treatment: 'Test',
      };

      await request(app).post('/api/clinical-records').send(recordData).expect(401);
    });
  });

  describe('GET /api/clinical-records', () => {
    it('should get clinical records', async () => {
      await ClinicalRecord.create({
        user: patientUser._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test',
        treatment: 'Test',
      });

      const response = await request(app)
        .get('/api/clinical-records')
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.clinicalRecords).toBeDefined();
    });
  });
});
