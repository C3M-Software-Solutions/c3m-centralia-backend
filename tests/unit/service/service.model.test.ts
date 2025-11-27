import { Service } from '../../../src/models/Service';
import { Business } from '../../../src/models/Business';
import { User } from '../../../src/models/User';
import { hashPassword } from '../../../src/utils/password';

describe('Service Model Tests', () => {
  let testUser: any;
  let testBusiness: any;

  beforeEach(async () => {
    // Create test user and business
    testUser = await User.create({
      name: 'Business Owner',
      email: 'owner@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });

    testBusiness = await Business.create({
      user: testUser._id,
      name: 'Test Business',
      ruc: '12345678901',
    });
  });

  describe('Service Creation', () => {
    it('should create a new service successfully', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Massage Therapy',
        description: 'Relaxing full body massage',
        duration: 60,
        price: 75,
        category: 'Wellness',
      };

      const service = await Service.create(serviceData);

      expect(service).toBeDefined();
      expect(service._id).toBeDefined();
      expect(service.name).toBe(serviceData.name);
      expect(service.description).toBe(serviceData.description);
      expect(service.duration).toBe(serviceData.duration);
      expect(service.price).toBe(serviceData.price);
      expect(service.category).toBe(serviceData.category);
      expect(service.isActive).toBe(true);
      expect(service.createdAt).toBeDefined();
      expect(service.updatedAt).toBeDefined();
    });

    it('should create service with only required fields', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Basic Service',
        duration: 30,
        price: 50,
      };

      const service = await Service.create(serviceData);

      expect(service).toBeDefined();
      expect(service.name).toBe(serviceData.name);
      expect(service.duration).toBe(serviceData.duration);
      expect(service.price).toBe(serviceData.price);
      expect(service.isActive).toBe(true);
    });

    it('should fail without business reference', async () => {
      const serviceData = {
        name: 'Service',
        duration: 30,
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail without name', async () => {
      const serviceData = {
        business: testBusiness._id,
        duration: 30,
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail without duration', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail without price', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        duration: 30,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });
  });

  describe('Service Validation', () => {
    it('should fail with name too short', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'A', // Too short
        duration: 30,
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail with name too long', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'A'.repeat(201), // Too long
        duration: 30,
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail with duration too short', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        duration: 2, // Less than 5 minutes
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail with duration too long', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        duration: 500, // More than 480 minutes (8 hours)
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail with negative price', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        duration: 30,
        price: -10,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should accept price of zero', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Free Service',
        duration: 30,
        price: 0,
      };

      const service = await Service.create(serviceData);
      expect(service.price).toBe(0);
    });

    it('should fail with description too long', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        description: 'A'.repeat(1001), // Too long
        duration: 30,
        price: 50,
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });

    it('should fail with category too long', async () => {
      const serviceData = {
        business: testBusiness._id,
        name: 'Service',
        duration: 30,
        price: 50,
        category: 'A'.repeat(101), // Too long
      };

      await expect(Service.create(serviceData)).rejects.toThrow();
    });
  });

  describe('Service Updates', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await Service.create({
        business: testBusiness._id,
        name: 'Original Service',
        duration: 30,
        price: 50,
      });
    });

    it('should update service name', async () => {
      testService.name = 'Updated Service';
      await testService.save();

      const updated = await Service.findById(testService._id);
      expect(updated?.name).toBe('Updated Service');
    });

    it('should update service price', async () => {
      testService.price = 100;
      await testService.save();

      const updated = await Service.findById(testService._id);
      expect(updated?.price).toBe(100);
    });

    it('should update service duration', async () => {
      testService.duration = 90;
      await testService.save();

      const updated = await Service.findById(testService._id);
      expect(updated?.duration).toBe(90);
    });

    it('should update isActive status', async () => {
      testService.isActive = false;
      await testService.save();

      const updated = await Service.findById(testService._id);
      expect(updated?.isActive).toBe(false);
    });

    it('should update updatedAt timestamp', async () => {
      const originalUpdatedAt = testService.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      testService.name = 'Updated';
      await testService.save();

      expect(testService.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Service Queries', () => {
    beforeEach(async () => {
      // Create multiple services
      await Service.create([
        {
          business: testBusiness._id,
          name: 'Service 1',
          duration: 30,
          price: 50,
          isActive: true,
        },
        {
          business: testBusiness._id,
          name: 'Service 2',
          duration: 60,
          price: 100,
          isActive: true,
        },
        {
          business: testBusiness._id,
          name: 'Inactive Service',
          duration: 45,
          price: 75,
          isActive: false,
        },
      ]);
    });

    it('should find all services for a business', async () => {
      const services = await Service.find({ business: testBusiness._id });
      expect(services).toHaveLength(3);
    });

    it('should find only active services', async () => {
      const services = await Service.find({ business: testBusiness._id, isActive: true });
      expect(services).toHaveLength(2);
    });

    it('should find service by name', async () => {
      const service = await Service.findOne({ name: 'Service 1' });
      expect(service).toBeDefined();
      expect(service?.name).toBe('Service 1');
    });

    it('should populate business reference', async () => {
      const service = await Service.findOne({ name: 'Service 1' }).populate('business');
      expect(service).toBeDefined();
      expect(service?.business).toBeDefined();
    });
  });

  describe('Service Deletion', () => {
    let testService: any;

    beforeEach(async () => {
      testService = await Service.create({
        business: testBusiness._id,
        name: 'Service to Delete',
        duration: 30,
        price: 50,
      });
    });

    it('should delete service successfully', async () => {
      await Service.deleteOne({ _id: testService._id });

      const deleted = await Service.findById(testService._id);
      expect(deleted).toBeNull();
    });

    it('should soft delete by setting isActive to false', async () => {
      testService.isActive = false;
      await testService.save();

      const service = await Service.findById(testService._id);
      expect(service).toBeDefined();
      expect(service?.isActive).toBe(false);
    });
  });
});
