import { ClinicalRecordService } from '../../src/services/clinicalRecordService.js';
import { ClinicalRecord } from '../../src/models/ClinicalRecord.js';
import { User } from '../../src/models/User.js';
import { Business } from '../../src/models/Business.js';
import { Specialist } from '../../src/models/Specialist.js';
import type { IUser } from '../../src/models/User.js';
import type { IBusiness } from '../../src/models/Business.js';
import type { ISpecialist } from '../../src/models/Specialist.js';

let clinicalRecordService: ClinicalRecordService;

beforeAll(() => {
  clinicalRecordService = new ClinicalRecordService();
});

describe('ClinicalRecordService Tests', () => {
  let user: IUser;
  let specialistUser: IUser;
  let business: IBusiness;
  let specialist: ISpecialist;

  beforeEach(async () => {
    user = await User.create({
      name: 'Patient User',
      email: 'patient@test.com',
      password: 'hashedpassword',
      role: 'client',
    });

    specialistUser = await User.create({
      name: 'Specialist User',
      email: 'specialist@test.com',
      password: 'hashedpassword',
      role: 'specialist',
    });

    business = await Business.create({
      name: 'Test Clinic',
      user: user._id,
    });

    specialist = await Specialist.create({
      user: specialistUser._id,
      business: business._id,
      specialty: 'Cardiology',
    });
  });

  describe('createClinicalRecord', () => {
    it('should create a clinical record', async () => {
      const record = await clinicalRecordService.createClinicalRecord(
        specialistUser._id.toString(),
        {
          patientId: user._id.toString(),
          businessId: business._id.toString(),
          specialistId: specialist._id.toString(),
          diagnosis: 'Test diagnosis',
          treatment: 'Test treatment',
        }
      );

      expect(record).toBeDefined();
      expect(record.diagnosis).toBe('Test diagnosis');
    });

    it('should throw error for unauthorized specialist', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@test.com',
        password: 'hashedpassword',
        role: 'specialist',
      });

      await expect(
        clinicalRecordService.createClinicalRecord(otherUser._id.toString(), {
          patientId: user._id.toString(),
          businessId: business._id.toString(),
          specialistId: specialist._id.toString(),
          diagnosis: 'Test',
          treatment: 'Test',
        })
      ).rejects.toThrow('Specialist not found or unauthorized');
    });
  });

  describe('getClinicalRecords', () => {
    it('should get clinical records by patient', async () => {
      await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test',
        treatment: 'Test',
      });

      const records = await clinicalRecordService.getClinicalRecords({
        patientId: user._id.toString(),
      });

      expect(records).toHaveLength(1);
    });
  });

  describe('updateClinicalRecord', () => {
    it('should update clinical record', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Initial',
        treatment: 'Initial',
      });

      const updated = await clinicalRecordService.updateClinicalRecord(
        record._id.toString(),
        specialistUser._id.toString(),
        'specialist',
        { diagnosis: 'Updated' }
      );

      expect(updated.diagnosis).toBe('Updated');
    });

    it('should throw error for unauthorized update', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test',
        treatment: 'Test',
      });

      const otherUser = await User.create({
        name: 'Other',
        email: 'other@test.com',
        password: 'password123',
        role: 'specialist',
      });

      await expect(
        clinicalRecordService.updateClinicalRecord(
          record._id.toString(),
          otherUser._id.toString(),
          'specialist',
          { diagnosis: 'Updated' }
        )
      ).rejects.toThrow('Unauthorized');
    });
  });
});
