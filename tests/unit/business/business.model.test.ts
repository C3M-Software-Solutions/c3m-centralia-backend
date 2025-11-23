import { Business } from '../../../src/models/Business';
import { User } from '../../../src/models/User';
import { hashPassword } from '../../../src/utils/password';

describe('Business Model Tests', () => {
  let testUser: any;

  beforeEach(async () => {
    // Create a test user for business ownership
    testUser = await User.create({
      name: 'Business Owner',
      email: 'owner@example.com',
      password: await hashPassword('password123'),
      role: 'admin',
    });
  });

  describe('Business Creation', () => {
    it('should create a new business successfully', async () => {
      const businessData = {
        name: 'Test Business',
        description: 'A test business',
        address: '123 Test St',
        phone: '+1234567890',
        email: 'business@example.com',
        user: testUser._id,
      };

      const business = await Business.create(businessData);

      expect(business).toBeDefined();
      expect(business._id).toBeDefined();
      expect(business.name).toBe(businessData.name);
      expect(business.description).toBe(businessData.description);
      expect(business.address).toBe(businessData.address);
      expect(business.phone).toBe(businessData.phone);
      expect(business.email).toBe(businessData.email);
      expect(business.isActive).toBe(true);
      expect(business.createdAt).toBeDefined();
      expect(business.updatedAt).toBeDefined();
    });

    it('should fail to create business without required fields', async () => {
      const businessData = {
        description: 'A test business',
        // Missing name and owner
      };

      await expect(Business.create(businessData)).rejects.toThrow();
    });

    it('should fail to create business without name', async () => {
      const businessData = {
        user: testUser._id,
        // Missing name
      };

      await expect(Business.create(businessData)).rejects.toThrow();
    });

    it('should fail to create business without owner', async () => {
      const businessData = {
        name: 'Test Business',
        // Missing owner
      };

      await expect(Business.create(businessData)).rejects.toThrow();
    });

    it('should create business with only required fields', async () => {
      const businessData = {
        name: 'Minimal Business',
        user: testUser._id,
      };

      const business = await Business.create(businessData);

      expect(business).toBeDefined();
      expect(business.name).toBe(businessData.name);
      expect(business.user.toString()).toBe(testUser._id.toString());
    });

    it('should create business with all optional fields', async () => {
      const businessData = {
        name: 'Complete Business',
        description: 'Full description',
        address: '456 Complete Ave',
        phone: '+9876543210',
        email: 'complete@example.com',
        logo: 'https://example.com/logo.png',
        user: testUser._id,
      };

      const business = await Business.create(businessData);

      expect(business.name).toBe(businessData.name);
      expect(business.description).toBe(businessData.description);
      expect(business.address).toBe(businessData.address);
      expect(business.phone).toBe(businessData.phone);
      expect(business.email).toBe(businessData.email);
      expect(business.logo).toBe(businessData.logo);
    });

    it('should fail to create business with invalid email', async () => {
      const businessData = {
        name: 'Test Business',
        email: 'invalid-email',
        user: testUser._id,
      };

      await expect(Business.create(businessData)).rejects.toThrow();
    });
  });

  describe('Business Fields', () => {
    it('should have default isActive as true', async () => {
      const business = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });

      expect(business.isActive).toBe(true);
    });

    it('should allow setting isActive to false', async () => {
      const business = await Business.create({
        name: 'Inactive Business',
        user: testUser._id,
        isActive: false,
      });

      expect(business.isActive).toBe(false);
    });

    it('should populate owner information', async () => {
      const business = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });

      const populatedBusiness = await Business.findById(business._id).populate(
        'user',
        'name email'
      );

      expect(populatedBusiness).toBeDefined();
      expect(populatedBusiness?.user).toBeDefined();
      expect((populatedBusiness?.user as any).name).toBe(testUser.name);
      expect((populatedBusiness?.user as any).email).toBe(testUser.email);
    });
  });

  describe('Business Updates', () => {
    it('should update business fields', async () => {
      const business = await Business.create({
        name: 'Original Name',
        user: testUser._id,
      });

      business.name = 'Updated Name';
      business.description = 'New description';
      business.phone = '+1112223333';
      await business.save();

      const updatedBusiness = await Business.findById(business._id);

      expect(updatedBusiness?.name).toBe('Updated Name');
      expect(updatedBusiness?.description).toBe('New description');
      expect(updatedBusiness?.phone).toBe('+1112223333');
    });

    it('should update isActive status', async () => {
      const business = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });

      expect(business.isActive).toBe(true);

      business.isActive = false;
      await business.save();

      const updatedBusiness = await Business.findById(business._id);
      expect(updatedBusiness?.isActive).toBe(false);
    });

    it('should update timestamps on modification', async () => {
      const business = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });

      const originalUpdatedAt = business.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      business.name = 'Modified Name';
      await business.save();

      expect(business.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Business Queries', () => {
    beforeEach(async () => {
      // Create multiple test businesses
      await Business.create([
        {
          name: 'Business One',
          description: 'First business',
          user: testUser._id,
          isActive: true,
        },
        {
          name: 'Business Two',
          description: 'Second business',
          user: testUser._id,
          isActive: true,
        },
        {
          name: 'Business Three',
          description: 'Third business',
          user: testUser._id,
          isActive: false,
        },
      ]);
    });

    it('should find business by name', async () => {
      const business = await Business.findOne({ name: 'Business One' });

      expect(business).toBeDefined();
      expect(business?.name).toBe('Business One');
    });

    it('should find businesses by owner', async () => {
      const businesses = await Business.find({ user: testUser._id });

      expect(businesses).toHaveLength(3);
    });

    it('should find only active businesses', async () => {
      const businesses = await Business.find({ isActive: true });

      expect(businesses).toHaveLength(2);
    });

    it('should find inactive businesses', async () => {
      const businesses = await Business.find({ isActive: false });

      expect(businesses).toHaveLength(1);
      expect(businesses[0].name).toBe('Business Three');
    });

    it('should search businesses by name', async () => {
      const businesses = await Business.find({
        name: { $regex: 'Two', $options: 'i' },
      });

      expect(businesses).toHaveLength(1);
      expect(businesses[0].name).toBe('Business Two');
    });

    it('should count businesses', async () => {
      const count = await Business.countDocuments();
      expect(count).toBe(3);
    });

    it('should count active businesses only', async () => {
      const count = await Business.countDocuments({ isActive: true });
      expect(count).toBe(2);
    });
  });

  describe('Business Deletion', () => {
    it('should delete business', async () => {
      const business = await Business.create({
        name: 'To Delete',
        user: testUser._id,
      });

      await Business.deleteOne({ _id: business._id });

      const deletedBusiness = await Business.findById(business._id);
      expect(deletedBusiness).toBeNull();
    });

    it('should delete multiple businesses', async () => {
      await Business.create([
        { name: 'Delete 1', user: testUser._id },
        { name: 'Delete 2', user: testUser._id },
      ]);

      const result = await Business.deleteMany({ user: testUser._id });

      expect(result.deletedCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Business Relationships', () => {
    it('should maintain reference to owner', async () => {
      const business = await Business.create({
        name: 'Test Business',
        user: testUser._id,
      });

      const foundBusiness = await Business.findById(business._id);
      expect(foundBusiness?.user.toString()).toBe(testUser._id.toString());
    });

    it('should find businesses by owner reference', async () => {
      await Business.create({
        name: 'Business 1',
        user: testUser._id,
      });

      await Business.create({
        name: 'Business 2',
        user: testUser._id,
      });

      const businesses = await Business.find({ user: testUser._id });
      expect(businesses).toHaveLength(2);
    });
  });
});
