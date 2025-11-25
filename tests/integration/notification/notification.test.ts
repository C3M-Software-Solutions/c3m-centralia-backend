import { notificationService } from '../../../src/services/notificationService';
import { User } from '../../../src/models/User';
import { Business } from '../../../src/models/Business';
import { Specialist } from '../../../src/models/Specialist';
import { Service } from '../../../src/models/Service';
import { Reservation } from '../../../src/models/Reservation';
import { hashPassword } from '../../../src/utils/password';

describe('Notification Service Tests', () => {
  let testUser: any;
  let specialistUser: any;
  let testBusiness: any;
  let testSpecialist: any;
  let testService: any;
  let testReservation: any;

  beforeEach(async () => {
    // Create test patient user
    testUser = await User.create({
      name: 'Test Patient',
      email: 'patient@example.com',
      password: await hashPassword('password123'),
      role: 'client',
      phone: '+1234567890',
    });

    // Create test specialist user
    specialistUser = await User.create({
      name: 'Dr. Test Specialist',
      email: 'specialist@example.com',
      password: await hashPassword('password123'),
      role: 'specialist',
      phone: '+0987654321',
    });

    // Create test business
    testBusiness = await Business.create({
      name: 'Test Clinic',
      user: specialistUser._id,
      address: '123 Test St',
      phone: '+1234567890',
      email: 'clinic@example.com',
    });

    // Create test specialist
    testSpecialist = await Specialist.create({
      user: specialistUser._id,
      business: testBusiness._id,
      specialty: 'General Medicine',
      licenseNumber: 'LIC123456',
      bio: 'Test specialist',
    });

    // Create test service
    testService = await Service.create({
      name: 'Medical Consultation',
      description: 'General consultation',
      duration: 60,
      price: 100,
      business: testBusiness._id,
    });

    // Create test reservation
    const startDate = new Date('2024-12-30T10:00:00Z');
    const endDate = new Date('2024-12-30T11:00:00Z');

    testReservation = await Reservation.create({
      user: testUser._id,
      business: testBusiness._id,
      specialist: testSpecialist._id,
      service: testService._id,
      startDate,
      endDate,
      status: 'pending',
      notes: 'Test reservation',
    });

    // Populate reservation
    await testReservation.populate([
      { path: 'user', select: '-password' },
      { path: 'business' },
      {
        path: 'specialist',
        populate: { path: 'user', select: '-password' },
      },
      { path: 'service' },
    ]);
  });

  describe('sendReservationCreated', () => {
    it('should not throw error when sending notification', async () => {
      await expect(
        notificationService.sendReservationCreated(testReservation)
      ).resolves.not.toThrow();
    });
  });

  describe('sendReservationConfirmed', () => {
    beforeEach(async () => {
      testReservation.status = 'confirmed';
      await testReservation.save();
      await testReservation.populate([
        { path: 'user', select: '-password' },
        { path: 'business' },
        {
          path: 'specialist',
          populate: { path: 'user', select: '-password' },
        },
        { path: 'service' },
      ]);
    });

    it('should not throw error when sending confirmation', async () => {
      await expect(
        notificationService.sendReservationConfirmed(testReservation)
      ).resolves.not.toThrow();
    });
  });

  describe('sendReservationCancelled', () => {
    beforeEach(async () => {
      testReservation.status = 'cancelled';
      testReservation.cancellationReason = 'Patient requested cancellation';
      await testReservation.save();
      await testReservation.populate([
        { path: 'user', select: '-password' },
        { path: 'business' },
        {
          path: 'specialist',
          populate: { path: 'user', select: '-password' },
        },
        { path: 'service' },
      ]);
    });

    it('should not throw error when sending cancellation', async () => {
      await expect(
        notificationService.sendReservationCancelled(testReservation)
      ).resolves.not.toThrow();
    });
  });

  describe('sendReservationReminder', () => {
    beforeEach(async () => {
      testReservation.status = 'confirmed';
      // Set date to 24 hours from now
      testReservation.startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      testReservation.endDate = new Date(testReservation.startDate.getTime() + 60 * 60 * 1000);
      await testReservation.save();
      await testReservation.populate([
        { path: 'user', select: '-password' },
        { path: 'business' },
        {
          path: 'specialist',
          populate: { path: 'user', select: '-password' },
        },
        { path: 'service' },
      ]);
    });

    it('should not throw error when sending reminder', async () => {
      await expect(
        notificationService.sendReservationReminder(testReservation)
      ).resolves.not.toThrow();
    });
  });

  describe('Multiple notifications', () => {
    it('should handle sending multiple notifications without errors', async () => {
      // Test all notification types
      await expect(
        notificationService.sendReservationCreated(testReservation)
      ).resolves.not.toThrow();

      testReservation.status = 'confirmed';
      await testReservation.save();
      await expect(
        notificationService.sendReservationConfirmed(testReservation)
      ).resolves.not.toThrow();

      testReservation.status = 'cancelled';
      await testReservation.save();
      await expect(
        notificationService.sendReservationCancelled(testReservation)
      ).resolves.not.toThrow();

      testReservation.status = 'confirmed';
      await testReservation.save();
      await expect(
        notificationService.sendReservationReminder(testReservation)
      ).resolves.not.toThrow();
    });
  });
});
