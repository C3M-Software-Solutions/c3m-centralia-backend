import { Specialist } from '../../../src/models/Specialist';
import { Business } from '../../../src/models/Business';
import { User } from '../../../src/models/User';
import { hashPassword } from '../../../src/utils/password';

describe('Specialist Model Tests', () => {
  let testUser: any;
  let specialistUser: any;
  let testBusiness: any;

  beforeEach(async () => {
    // Create test users
    testUser = await User.create({
      name: 'Business Owner',
      email: 'owner@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    specialistUser = await User.create({
      name: 'Specialist User',
      email: 'specialist@example.com',
      password: await hashPassword('password123'),
      role: 'specialist',
    });

    testBusiness = await Business.create({
      user: testUser._id,
      name: 'Test Business',
      ruc: '12345678901',
    });
  });

  describe('Specialist Creation', () => {
    it('should create a new specialist successfully', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Physical Therapy',
        licenseNumber: 'LIC123456',
        bio: 'Experienced therapist with 10 years of practice',
        availability: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: true,
          },
          {
            day: 'wednesday',
            startTime: '10:00',
            endTime: '16:00',
            isAvailable: true,
          },
        ],
      };

      const specialist = await Specialist.create(specialistData);

      expect(specialist).toBeDefined();
      expect(specialist._id).toBeDefined();
      expect(specialist.specialty).toBe(specialistData.specialty);
      expect(specialist.licenseNumber).toBe(specialistData.licenseNumber);
      expect(specialist.bio).toBe(specialistData.bio);
      expect(specialist.availability).toHaveLength(2);
      expect(specialist.isActive).toBe(true);
      expect(specialist.createdAt).toBeDefined();
      expect(specialist.updatedAt).toBeDefined();
    });

    it('should create specialist with only required fields', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Massage Therapy',
      };

      const specialist = await Specialist.create(specialistData);

      expect(specialist).toBeDefined();
      expect(specialist.specialty).toBe(specialistData.specialty);
      expect(specialist.isActive).toBe(true);
    });

    it('should fail without user reference', async () => {
      const specialistData = {
        business: testBusiness._id,
        specialty: 'Therapy',
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should fail without business reference', async () => {
      const specialistData = {
        user: specialistUser._id,
        specialty: 'Therapy',
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should fail without specialty', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });
  });

  describe('Specialist Validation', () => {
    it('should fail with specialty too long', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'A'.repeat(201), // Too long
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should fail with license number too long', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        licenseNumber: 'A'.repeat(101), // Too long
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should fail with bio too long', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        bio: 'A'.repeat(1001), // Too long
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should fail with invalid day in availability', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        availability: [
          {
            day: 'invalidday',
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should fail with invalid time format in availability', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        availability: [
          {
            day: 'monday',
            startTime: '25:00', // Invalid hour
            endTime: '17:00',
          },
        ],
      };

      await expect(Specialist.create(specialistData)).rejects.toThrow();
    });

    it('should accept valid time formats', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        availability: [
          {
            day: 'tuesday',
            startTime: '08:30',
            endTime: '18:45',
            isAvailable: true,
          },
        ],
      };

      const specialist = await Specialist.create(specialistData);
      expect(specialist.availability[0].startTime).toBe('08:30');
      expect(specialist.availability[0].endTime).toBe('18:45');
    });
  });

  describe('Specialist Availability', () => {
    it('should create availability for multiple days', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        availability: [
          { day: 'monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
          { day: 'friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
        ],
      };

      const specialist = await Specialist.create(specialistData);
      expect(specialist.availability).toHaveLength(5);
    });

    it('should default isAvailable to true', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        availability: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '17:00',
          },
        ],
      };

      const specialist = await Specialist.create(specialistData);
      expect(specialist.availability[0].isAvailable).toBe(true);
    });

    it('should allow setting isAvailable to false', async () => {
      const specialistData = {
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Therapy',
        availability: [
          {
            day: 'monday',
            startTime: '09:00',
            endTime: '17:00',
            isAvailable: false,
          },
        ],
      };

      const specialist = await Specialist.create(specialistData);
      expect(specialist.availability[0].isAvailable).toBe(false);
    });
  });

  describe('Specialist Updates', () => {
    let testSpecialist: any;

    beforeEach(async () => {
      testSpecialist = await Specialist.create({
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Original Specialty',
        bio: 'Original bio',
      });
    });

    it('should update specialty', async () => {
      testSpecialist.specialty = 'Updated Specialty';
      await testSpecialist.save();

      const updated = await Specialist.findById(testSpecialist._id);
      expect(updated?.specialty).toBe('Updated Specialty');
    });

    it('should update bio', async () => {
      testSpecialist.bio = 'Updated bio information';
      await testSpecialist.save();

      const updated = await Specialist.findById(testSpecialist._id);
      expect(updated?.bio).toBe('Updated bio information');
    });

    it('should update availability', async () => {
      testSpecialist.availability = [
        {
          day: 'friday',
          startTime: '10:00',
          endTime: '16:00',
          isAvailable: true,
        },
      ];
      await testSpecialist.save();

      const updated = await Specialist.findById(testSpecialist._id);
      expect(updated?.availability).toHaveLength(1);
      expect(updated?.availability[0].day).toBe('friday');
    });

    it('should update isActive status', async () => {
      testSpecialist.isActive = false;
      await testSpecialist.save();

      const updated = await Specialist.findById(testSpecialist._id);
      expect(updated?.isActive).toBe(false);
    });

    it('should update license number', async () => {
      testSpecialist.licenseNumber = 'NEW123456';
      await testSpecialist.save();

      const updated = await Specialist.findById(testSpecialist._id);
      expect(updated?.licenseNumber).toBe('NEW123456');
    });

    it('should update updatedAt timestamp', async () => {
      const originalUpdatedAt = testSpecialist.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      testSpecialist.specialty = 'Updated';
      await testSpecialist.save();

      expect(testSpecialist.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Specialist Queries', () => {
    beforeEach(async () => {
      const user1 = await User.create({
        name: 'Specialist 1',
        email: 'spec1@example.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      const user2 = await User.create({
        name: 'Specialist 2',
        email: 'spec2@example.com',
        password: await hashPassword('password123'),
        role: 'specialist',
      });

      // Create multiple specialists
      await Specialist.create([
        {
          user: user1._id,
          business: testBusiness._id,
          specialty: 'Physical Therapy',
          isActive: true,
        },
        {
          user: user2._id,
          business: testBusiness._id,
          specialty: 'Massage Therapy',
          isActive: true,
        },
        {
          user: specialistUser._id,
          business: testBusiness._id,
          specialty: 'Chiropractic',
          isActive: false,
        },
      ]);
    });

    it('should find all specialists for a business', async () => {
      const specialists = await Specialist.find({ business: testBusiness._id });
      expect(specialists).toHaveLength(3);
    });

    it('should find only active specialists', async () => {
      const specialists = await Specialist.find({
        business: testBusiness._id,
        isActive: true,
      });
      expect(specialists).toHaveLength(2);
    });

    it('should find specialist by specialty', async () => {
      const specialist = await Specialist.findOne({ specialty: 'Physical Therapy' });
      expect(specialist).toBeDefined();
      expect(specialist?.specialty).toBe('Physical Therapy');
    });

    it('should populate user reference', async () => {
      const specialist = await Specialist.findOne({
        specialty: 'Physical Therapy',
      }).populate('user');
      expect(specialist).toBeDefined();
      expect(specialist?.user).toBeDefined();
    });

    it('should populate business reference', async () => {
      const specialist = await Specialist.findOne({
        specialty: 'Physical Therapy',
      }).populate('business');
      expect(specialist).toBeDefined();
      expect(specialist?.business).toBeDefined();
    });
  });

  describe('Specialist Deletion', () => {
    let testSpecialist: any;

    beforeEach(async () => {
      testSpecialist = await Specialist.create({
        user: specialistUser._id,
        business: testBusiness._id,
        specialty: 'Specialist to Delete',
      });
    });

    it('should delete specialist successfully', async () => {
      await Specialist.deleteOne({ _id: testSpecialist._id });

      const deleted = await Specialist.findById(testSpecialist._id);
      expect(deleted).toBeNull();
    });

    it('should soft delete by setting isActive to false', async () => {
      testSpecialist.isActive = false;
      await testSpecialist.save();

      const specialist = await Specialist.findById(testSpecialist._id);
      expect(specialist).toBeDefined();
      expect(specialist?.isActive).toBe(false);
    });
  });
});
