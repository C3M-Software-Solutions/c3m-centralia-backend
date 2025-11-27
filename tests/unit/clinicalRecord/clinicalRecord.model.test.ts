import { ClinicalRecord } from '../../../src/models/ClinicalRecord';
import { User } from '../../../src/models/User';
import { Business } from '../../../src/models/Business';
import { Specialist } from '../../../src/models/Specialist';
import type { IUser } from '../../../src/models/User';
import type { IBusiness } from '../../../src/models/Business';
import type { ISpecialist } from '../../../src/models/Specialist';

describe('ClinicalRecord Model Tests', () => {
  let user: IUser;
  let business: IBusiness;
  let specialist: ISpecialist;

  beforeEach(async () => {
    user = await User.create({
      name: 'Patient User',
      email: 'patient@test.com',
      password: 'hashedpassword',
      role: 'client',
    });

    const specialistUser = await User.create({
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

  describe('Creation', () => {
    it('should create a clinical record successfully', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment',
      });

      expect(record).toBeDefined();
      expect(record.diagnosis).toBe('Test diagnosis');
      expect(record.treatment).toBe('Test treatment');
    });

    it('should fail without required fields', async () => {
      await expect(
        ClinicalRecord.create({
          user: user._id,
        })
      ).rejects.toThrow();
    });
  });

  describe('Field Validation', () => {
    it('should validate weight range', async () => {
      await expect(
        ClinicalRecord.create({
          user: user._id,
          specialist: specialist._id,
          business: business._id,
          diagnosis: 'Test',
          treatment: 'Test',
          weight: -10,
        })
      ).rejects.toThrow();
    });

    it('should validate heart rate range', async () => {
      await expect(
        ClinicalRecord.create({
          user: user._id,
          specialist: specialist._id,
          business: business._id,
          diagnosis: 'Test',
          treatment: 'Test',
          heartRate: 300,
        })
      ).rejects.toThrow();
    });

    it('should validate blood pressure format', async () => {
      await expect(
        ClinicalRecord.create({
          user: user._id,
          specialist: specialist._id,
          business: business._id,
          diagnosis: 'Test',
          treatment: 'Test',
          bloodPressure: 'invalid',
        })
      ).rejects.toThrow();
    });

    it('should accept valid blood pressure', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test',
        treatment: 'Test',
        bloodPressure: '120/80',
      });

      expect(record.bloodPressure).toBe('120/80');
    });
  });

  describe('Population', () => {
    it('should populate user, specialist, and business references', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment',
      });

      const populated = await ClinicalRecord.findById(record._id)
        .populate('user')
        .populate('specialist')
        .populate('business');

      expect(populated?.user).toBeDefined();
      expect((populated?.user as any).name).toBe('Patient User');
      expect((populated?.business as any).name).toBe('Test Clinic');
    });
  });

  describe('Updates', () => {
    it('should update clinical record', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Initial diagnosis',
        treatment: 'Initial treatment',
      });

      record.diagnosis = 'Updated diagnosis';
      record.treatment = 'Updated treatment';
      await record.save();

      const updated = await ClinicalRecord.findById(record._id);
      expect(updated?.diagnosis).toBe('Updated diagnosis');
      expect(updated?.treatment).toBe('Updated treatment');
    });
  });

  describe('Deletion', () => {
    it('should delete a clinical record', async () => {
      const record = await ClinicalRecord.create({
        user: user._id,
        specialist: specialist._id,
        business: business._id,
        diagnosis: 'Test diagnosis',
        treatment: 'Test treatment',
      });

      await ClinicalRecord.deleteOne({ _id: record._id });

      const deleted = await ClinicalRecord.findById(record._id);
      expect(deleted).toBeNull();
    });
  });
});
