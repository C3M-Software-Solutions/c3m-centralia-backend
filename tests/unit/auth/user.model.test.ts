import { User } from '../../../src/models/User';
import { hashPassword } from '../../../src/utils/password';

describe('User Model Tests', () => {
  describe('User Creation', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        role: 'client',
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user._id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should fail to create user without required fields', async () => {
      const userData = {
        name: 'Test User',
        // Missing email and password
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail to create user with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: await hashPassword('password123'),
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail to create user with short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '12345', // Less than 6 characters
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail to create duplicate user with same email', async () => {
      // Ensure unique index exists for this test
      try {
        await User.syncIndexes();
      } catch (error) {
        // Ignore if already exists
      }

      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
      };

      await User.create(userData);

      // Try to create another user with same email
      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should create user with default role "client"', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        // No role specified
      };

      const user = await User.create(userData);

      expect(user.role).toBe('client');
    });

    it('should create user with different roles', async () => {
      const roles = ['admin', 'specialist', 'client'];

      for (const role of roles) {
        const user = await User.create({
          name: `Test ${role}`,
          email: `${role}@example.com`,
          password: await hashPassword('password123'),
          role,
        });

        expect(user.role).toBe(role);
      }
    });

    it('should fail to create user with invalid role', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        role: 'invalid_role',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('User Fields', () => {
    it('should create user with optional phone field', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        phone: '+1234567890',
      };

      const user = await User.create(userData);

      expect(user.phone).toBe(userData.phone);
    });

    it('should create user with optional avatar field', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
        avatar: 'https://example.com/avatar.jpg',
      };

      const user = await User.create(userData);

      expect(user.avatar).toBe(userData.avatar);
    });

    it('should not expose password in toJSON', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
      };

      const user = await User.create(userData);
      const userJson = user.toJSON();

      expect(userJson.password).toBeUndefined();
      expect(userJson.name).toBe(userData.name);
      expect(userJson.email).toBe(userData.email);
    });
  });

  describe('User Updates', () => {
    it('should update user fields', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
      });

      user.name = 'Updated Name';
      user.phone = '+9876543210';
      await user.save();

      const updatedUser = await User.findById(user._id);

      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.phone).toBe('+9876543210');
    });

    it('should update isActive status', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
      });

      expect(user.isActive).toBe(true);

      user.isActive = false;
      await user.save();

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.isActive).toBe(false);
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      // Create test users
      await User.create([
        {
          name: 'Admin User',
          email: 'admin@example.com',
          password: await hashPassword('password123'),
          role: 'admin',
        },
        {
          name: 'Specialist User',
          email: 'specialist@example.com',
          password: await hashPassword('password123'),
          role: 'specialist',
        },
        {
          name: 'Client User',
          email: 'client@example.com',
          password: await hashPassword('password123'),
          role: 'client',
        },
      ]);
    });

    it('should find user by email', async () => {
      const user = await User.findOne({ email: 'admin@example.com' });

      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@example.com');
      expect(user?.role).toBe('admin');
    });

    it('should find users by role', async () => {
      const specialists = await User.find({ role: 'specialist' });

      expect(specialists).toHaveLength(1);
      expect(specialists[0].role).toBe('specialist');
    });

    it('should find active users only', async () => {
      // Deactivate one user
      await User.updateOne({ email: 'client@example.com' }, { isActive: false });

      const activeUsers = await User.find({ isActive: true });

      expect(activeUsers).toHaveLength(2);
    });

    it('should count users by role', async () => {
      const adminCount = await User.countDocuments({ role: 'admin' });
      const specialistCount = await User.countDocuments({ role: 'specialist' });
      const clientCount = await User.countDocuments({ role: 'client' });

      expect(adminCount).toBe(1);
      expect(specialistCount).toBe(1);
      expect(clientCount).toBe(1);
    });
  });

  describe('User Deletion', () => {
    it('should delete user', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await hashPassword('password123'),
      });

      await User.deleteOne({ _id: user._id });

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should delete multiple users', async () => {
      await User.create([
        {
          name: 'User 1',
          email: 'user1@example.com',
          password: await hashPassword('password123'),
          role: 'client',
        },
        {
          name: 'User 2',
          email: 'user2@example.com',
          password: await hashPassword('password123'),
          role: 'client',
        },
      ]);

      const result = await User.deleteMany({ role: 'client' });

      expect(result.deletedCount).toBe(2);
    });
  });

  describe('User Indexes', () => {
    it('should have unique index on email', async () => {
      // Ensure indexes are synced (won't fail if already exist)
      try {
        await User.syncIndexes();
      } catch (error) {
        // Ignore errors if indexes already exist
      }

      const indexes = await User.collection.getIndexes();

      // Verify email index exists
      expect(indexes).toHaveProperty('email_1');
    });
  });
});
