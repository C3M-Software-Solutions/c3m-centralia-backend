import { businessService } from '../../../src/services/businessService';
import { Business } from '../../../src/models/Business';
import { User } from '../../../src/models/User';
import { Service } from '../../../src/models/Service';
import { hashPassword } from '../../../src/utils/password';

describe('Business Service Tests', () => {
  let testUser: any;
  let anotherUser: any;

  beforeEach(async () => {
    testUser = await User.create({
      name: 'Test Owner',
      email: 'owner@example.com',
      password: await hashPassword('password123'),
      role: 'admin',
    });

    anotherUser = await User.create({
      name: 'Another Owner',
      email: 'another@example.com',
      password: await hashPassword('password123'),
      role: 'client',
    });
  });

  describe('createBusiness', () => {
    it('should create a business successfully', async () => {
      const businessData = {
        name: 'Service Test Business',
        description: 'Created via service',
        address: '123 Service St',
        phone: '+1234567890',
        email: 'service@example.com',
        ownerId: testUser._id.toString(),
      };

      const business = await businessService.createBusiness(businessData);

      expect(business).toBeDefined();
      expect(business.name).toBe(businessData.name);
      expect(business.description).toBe(businessData.description);
      expect(business.address).toBe(businessData.address);
      expect(business.isActive).toBe(true);
    });

    it('should create business with minimal data', async () => {
      const businessData = {
        name: 'Minimal Business',
        ownerId: testUser._id.toString(),
      };

      const business = await businessService.createBusiness(businessData);

      expect(business).toBeDefined();
      expect(business.name).toBe(businessData.name);
    });
  });

  describe('getBusinessById', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });
    });

    it('should get business by id', async () => {
      const business = await businessService.getBusinessById(testBusiness._id.toString());

      expect(business).toBeDefined();
      expect(business.name).toBe(testBusiness.name);
      expect(business._id.toString()).toBe(testBusiness._id.toString());
    });

    it('should throw error for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(businessService.getBusinessById(fakeId)).rejects.toThrow('Business not found');
    });

    it('should populate owner information', async () => {
      const business = await businessService.getBusinessById(testBusiness._id.toString());

      expect(business.user).toBeDefined();
    });
  });

  describe('getBusinessesByOwner', () => {
    beforeEach(async () => {
      await Business.create([
        { name: 'Business 1', user: testUser._id },
        { name: 'Business 2', user: testUser._id },
        { name: 'Business 3', user: anotherUser._id },
      ]);
    });

    it('should get all businesses by owner', async () => {
      const businesses = await businessService.getBusinessesByOwner(testUser._id.toString());

      expect(businesses).toHaveLength(2);
      expect(businesses[0].name).toBeDefined();
    });

    it('should return empty array for owner with no businesses', async () => {
      const newUser = await User.create({
        name: 'No Business Owner',
        email: 'nobiz@example.com',
        password: await hashPassword('password123'),
      });

      const businesses = await businessService.getBusinessesByOwner(newUser._id.toString());

      expect(businesses).toHaveLength(0);
    });
  });

  describe('getAllBusinesses', () => {
    beforeEach(async () => {
      await Business.create([
        { name: 'Active Business 1', user: testUser._id, isActive: true },
        { name: 'Active Business 2', user: testUser._id, isActive: true },
        { name: 'Inactive Business', user: testUser._id, isActive: false },
      ]);
    });

    it('should get all active businesses with pagination', async () => {
      const result = await businessService.getAllBusinesses(1, 10);

      expect(result.businesses.length).toBeGreaterThanOrEqual(2);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should return only active businesses', async () => {
      const result = await businessService.getAllBusinesses(1, 10);

      const hasInactive = result.businesses.some((b: any) => !b.isActive);
      expect(hasInactive).toBe(false);
    });

    it('should handle pagination correctly', async () => {
      const result = await businessService.getAllBusinesses(1, 1);

      expect(result.businesses).toHaveLength(1);
      expect(result.pagination.pages).toBeGreaterThanOrEqual(2);
    });

    it('should populate owner information', async () => {
      const result = await businessService.getAllBusinesses(1, 10);

      expect(result.businesses[0].user).toBeDefined();
    });
  });

  describe('updateBusiness', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create({
        name: 'Original Name',
        description: 'Original description',
        user: testUser._id,
      });
    });

    it('should update business by owner', async () => {
      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        phone: '+9876543210',
      };

      const updated = await businessService.updateBusiness(
        testBusiness._id.toString(),
        testUser._id.toString(),
        updateData
      );

      expect(updated.name).toBe(updateData.name);
      expect(updated.description).toBe(updateData.description);
      expect(updated.phone).toBe(updateData.phone);
    });

    it('should throw error when non-owner tries to update', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      await expect(
        businessService.updateBusiness(
          testBusiness._id.toString(),
          anotherUser._id.toString(),
          updateData
        )
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const updateData = {
        name: 'Updated Name',
      };

      await expect(
        businessService.updateBusiness(fakeId, testUser._id.toString(), updateData)
      ).rejects.toThrow('Business not found');
    });

    it('should update only specified fields', async () => {
      const originalName = testBusiness.name;
      const updateData = {
        description: 'New description only',
      };

      const updated = await businessService.updateBusiness(
        testBusiness._id.toString(),
        testUser._id.toString(),
        updateData
      );

      expect(updated.name).toBe(originalName);
      expect(updated.description).toBe(updateData.description);
    });

    it('should update isActive status', async () => {
      const updateData = {
        isActive: false,
      };

      const updated = await businessService.updateBusiness(
        testBusiness._id.toString(),
        testUser._id.toString(),
        updateData
      );

      expect(updated.isActive).toBe(false);
    });
  });

  describe('deleteBusiness', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create({
        name: 'To Delete',
        user: testUser._id,
      });
    });

    it('should delete business by owner', async () => {
      const result = await businessService.deleteBusiness(
        testBusiness._id.toString(),
        testUser._id.toString()
      );

      expect(result.message).toBe('Business deleted successfully');

      const deleted = await Business.findById(testBusiness._id);
      expect(deleted).toBeNull();
    });

    it('should throw error when non-owner tries to delete', async () => {
      await expect(
        businessService.deleteBusiness(testBusiness._id.toString(), anotherUser._id.toString())
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(businessService.deleteBusiness(fakeId, testUser._id.toString())).rejects.toThrow(
        'Business not found'
      );
    });
  });

  describe('Service management', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });
    });

    it('should create service for business', async () => {
      const serviceData = {
        businessId: testBusiness._id.toString(),
        name: 'Test Service',
        description: 'Service description',
        duration: 60,
        price: 50,
      };

      const service = await businessService.createService(serviceData);

      expect(service).toBeDefined();
      expect(service.name).toBe(serviceData.name);
      expect(service.duration).toBe(serviceData.duration);
      expect(service.price).toBe(serviceData.price);
    });

    it('should throw error when creating service for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const serviceData = {
        businessId: fakeId,
        name: 'Test Service',
        duration: 60,
        price: 50,
      };

      await expect(businessService.createService(serviceData)).rejects.toThrow(
        'Business not found'
      );
    });

    it('should get services by business', async () => {
      await businessService.createService({
        businessId: testBusiness._id.toString(),
        name: 'Service 1',
        duration: 30,
        price: 25,
      });

      await businessService.createService({
        businessId: testBusiness._id.toString(),
        name: 'Service 2',
        duration: 45,
        price: 35,
      });

      const services = await businessService.getServicesByBusiness(testBusiness._id.toString());

      expect(services).toHaveLength(2);
    });
  });

  describe('Specialist management', () => {
    let testBusiness: any;

    beforeEach(async () => {
      testBusiness = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });
    });

    it('should create specialist for business', async () => {
      const specialistData = {
        businessId: testBusiness._id.toString(),
        name: 'Dr. Unit Test',
        email: 'unittest@example.com',
        password: 'password123',
        specialty: 'General',
        bio: 'Expert specialist',
      };

      const specialist = await businessService.createSpecialist(specialistData);

      expect(specialist).toBeDefined();
      expect(specialist).not.toBeNull();
      expect(specialist!.specialty).toEqual(specialistData.specialty);
      expect(specialist!.bio).toBe(specialistData.bio);
    });

    it('should throw error when creating specialist for non-existent business', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const specialistData = {
        businessId: fakeId,
        name: 'Dr. Fake Business',
        email: 'fake@example.com',
        password: 'password123',
        specialty: 'General',
      };

      await expect(businessService.createSpecialist(specialistData)).rejects.toThrow(
        'Business not found'
      );
    });

    it('should get specialists by business', async () => {
      await businessService.createSpecialist({
        businessId: testBusiness._id.toString(),
        name: 'Dr. Get Test',
        email: 'gettest@example.com',
        password: 'password123',
        specialty: 'General',
      });

      const specialists = await businessService.getSpecialistsByBusiness(
        testBusiness._id.toString()
      );

      expect(specialists).toHaveLength(1);
      expect(specialists[0].user).toBeDefined();
    });

    it('should create specialist with services', async () => {
      // Create services
      const service1 = await Service.create({
        business: testBusiness._id,
        name: 'Service 1',
        duration: 30,
        price: 50,
        isActive: true,
      });
      const service2 = await Service.create({
        business: testBusiness._id,
        name: 'Service 2',
        duration: 60,
        price: 100,
        isActive: true,
      });

      const specialistData = {
        businessId: testBusiness._id.toString(),
        name: 'Dr. Service Test',
        email: 'servicetest@example.com',
        password: 'password123',
        specialty: 'Physical Therapy',
        services: [service1._id.toString(), service2._id.toString()],
      };

      const specialist = await businessService.createSpecialist(specialistData);

      expect(specialist).toBeDefined();
      expect(specialist).not.toBeNull();
      expect(specialist!.services).toHaveLength(2);
      expect(specialist!.services[0]._id.toString()).toBe(service1._id.toString());
    });

    it('should throw error when creating specialist with services from different business', async () => {
      const otherBusiness = await Business.create({
        name: 'Other Business',
        user: anotherUser._id,
        hasPremises: true,
        hasRemoteSessions: false,
      });

      const service = await Service.create({
        business: otherBusiness._id,
        name: 'Other Service',
        duration: 30,
        price: 50,
        isActive: true,
      });

      const specialistData = {
        businessId: testBusiness._id.toString(),
        name: 'Dr. Wrong Business',
        email: 'wrongbiz@example.com',
        password: 'password123',
        specialty: 'General',
        services: [service._id.toString()],
      };

      await expect(businessService.createSpecialist(specialistData)).rejects.toThrow(
        'do not belong to this business'
      );
    });
  });
});
