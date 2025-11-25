import request from 'supertest';
import { Express } from 'express';
import { User } from '../../../src/models/User.js';
import { Business } from '../../../src/models/Business.js';
import { Specialist } from '../../../src/models/Specialist.js';
import { ClinicalRecord } from '../../../src/models/ClinicalRecord.js';
import { Reservation } from '../../../src/models/Reservation.js';
import { Service } from '../../../src/models/Service.js';
import { generateAccessToken } from '../../../src/utils/jwt.js';
import { hashPassword } from '../../../src/utils/password.js';
import { createTestApp } from '../../setup.js';

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

  describe('Clinical Record - Reservation Link', () => {
    let service: any;
    let reservation: any;

    beforeEach(async () => {
      service = await Service.create({
        business: business._id,
        name: 'Consultation',
        duration: 60,
        price: 100,
        isActive: true,
      });

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 60 * 60000);

      reservation = await Reservation.create({
        user: patientUser._id,
        business: business._id,
        specialist: specialist._id,
        service: service._id,
        startDate,
        endDate,
        status: 'confirmed',
      });
    });

    it('should create clinical record linked to reservation', async () => {
      const recordData = {
        user: patientUser._id.toString(),
        business: business._id.toString(),
        reservation: reservation._id.toString(),
        diagnosis: 'Hypertension',
        treatment: 'Medication prescribed',
        notes: 'Follow-up in 2 weeks',
      };

      const response = await request(app)
        .post('/api/clinical-records')
        .set('Authorization', `Bearer ${specialistToken}`)
        .send(recordData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.clinicalRecord).toBeDefined();
      expect(response.body.data.clinicalRecord.diagnosis).toBe('Hypertension');
    });

    it('should fail to create clinical record with invalid reservation', async () => {
      const recordData = {
        user: patientUser._id.toString(),
        business: business._id.toString(),
        reservation: '507f1f77bcf86cd799439011', // Non-existent
        diagnosis: 'Test',
        treatment: 'Test',
      };

      await request(app)
        .post('/api/clinical-records')
        .set('Authorization', `Bearer ${specialistToken}`)
        .send(recordData)
        .expect(404);
    });

    it('should fail to create duplicate clinical record for same reservation', async () => {
      await ClinicalRecord.create({
        user: patientUser._id,
        specialist: specialist._id,
        business: business._id,
        reservation: reservation._id,
        diagnosis: 'First record',
        treatment: 'Treatment',
      });

      const recordData = {
        user: patientUser._id.toString(),
        business: business._id.toString(),
        reservation: reservation._id.toString(),
        diagnosis: 'Duplicate attempt',
        treatment: 'Test',
      };

      await request(app)
        .post('/api/clinical-records')
        .set('Authorization', `Bearer ${specialistToken}`)
        .send(recordData)
        .expect(409);
    });

    it('should fail when reservation does not belong to patient', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: await hashPassword('password123'),
        role: 'client',
      });

      const recordData = {
        user: otherUser._id.toString(), // Different user
        business: business._id.toString(),
        reservation: reservation._id.toString(), // Belongs to patientUser
        diagnosis: 'Test',
        treatment: 'Test',
      };

      await request(app)
        .post('/api/clinical-records')
        .set('Authorization', `Bearer ${specialistToken}`)
        .send(recordData)
        .expect(403);
    });

    it('should get clinical record by reservation ID', async () => {
      const clinicalRecord = await ClinicalRecord.create({
        user: patientUser._id,
        specialist: specialist._id,
        business: business._id,
        reservation: reservation._id,
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment',
      });

      const response = await request(app)
        .get(`/api/reservations/${reservation._id}/clinical-record`)
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.clinicalRecord).toBeDefined();
      expect(response.body.data.clinicalRecord._id.toString()).toBe(clinicalRecord._id.toString());
    });

    it('should return 404 when no clinical record exists for reservation', async () => {
      await request(app)
        .get(`/api/reservations/${reservation._id}/clinical-record`)
        .set('Authorization', `Bearer ${specialistToken}`)
        .expect(404);
    });
  });
});
