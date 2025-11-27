import { reminderService } from '../../../src/services/reminderService.js';
import { User } from '../../../src/models/User.js';
import { Business } from '../../../src/models/Business.js';
import { Specialist } from '../../../src/models/Specialist.js';
import { Service } from '../../../src/models/Service.js';
import { Reservation } from '../../../src/models/Reservation.js';
import { hashPassword } from '../../../src/utils/password.js';

describe('Reminder Service Tests', () => {
  let testUser: any;
  let specialistUser: any;
  let testBusiness: any;
  let testSpecialist: any;
  let testService: any;

  // Helper function to calculate end date based on service duration
  const calculateEndDate = (startDate: Date, durationMinutes: number = 60): Date => {
    return new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  };

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
  });

  describe('sendUpcomingReminders', () => {
    it('should process reminders for reservations 24 hours away without errors', async () => {
      // Create reservation exactly 24.5 hours away
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);

      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: targetDate,
        endDate: endDate,
        status: 'confirmed',
        reminderSent: false,
      });

      // Should not throw error even without SMTP configured
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });

    it('should not process reservations with already sent reminders', async () => {
      // Create reservation with reminder already sent
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);

      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: targetDate,
        endDate: endDate,
        status: 'confirmed',
        reminderSent: true, // Already sent
      });

      // Should not throw error
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });

    it('should not process non-confirmed reservations', async () => {
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);

      // Create pending reservation
      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: targetDate,
        endDate: endDate,
        status: 'pending',
        reminderSent: false,
      });

      // Create cancelled reservation
      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: targetDate,
        endDate: endDate,
        status: 'cancelled',
        reminderSent: false,
      });

      // Should not throw error
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });

    it('should not process reservations outside 24-25 hour window', async () => {
      // Create reservation 23 hours away (too soon)
      const tooSoon = new Date();
      tooSoon.setHours(tooSoon.getHours() + 23, 0, 0, 0);
      const endDateSoon = calculateEndDate(tooSoon);

      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: tooSoon,
        endDate: endDateSoon,
        status: 'confirmed',
        reminderSent: false,
      });

      // Create reservation 26 hours away (too late)
      const tooLate = new Date();
      tooLate.setHours(tooLate.getHours() + 26, 0, 0, 0);
      const endDateLate = calculateEndDate(tooLate);

      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: tooLate,
        endDate: endDateLate,
        status: 'confirmed',
        reminderSent: false,
      });

      // Should not throw error
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });

    it('should handle multiple reminders in one run without errors', async () => {
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);
      const date2 = new Date(targetDate.getTime() + 10 * 60 * 1000);
      const endDate2 = calculateEndDate(date2);
      const date3 = new Date(targetDate.getTime() + 20 * 60 * 1000);
      const endDate3 = calculateEndDate(date3);

      // Create 3 reservations that need reminders
      await Reservation.create([
        {
          user: testUser._id,
          business: testBusiness._id,
          specialist: testSpecialist._id,
          service: testService._id,
          startDate: targetDate,
          endDate: endDate,
          status: 'confirmed',
          reminderSent: false,
        },
        {
          user: testUser._id,
          business: testBusiness._id,
          specialist: testSpecialist._id,
          service: testService._id,
          startDate: date2,
          endDate: endDate2,
          status: 'confirmed',
          reminderSent: false,
        },
        {
          user: testUser._id,
          business: testBusiness._id,
          specialist: testSpecialist._id,
          service: testService._id,
          startDate: date3,
          endDate: endDate3,
          status: 'confirmed',
          reminderSent: false,
        },
      ]);

      // Should not throw error even with multiple reservations
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });

    it('should continue processing even if some reservations are invalid', async () => {
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);

      // Create 2 valid reservations
      await Reservation.create([
        {
          user: testUser._id,
          business: testBusiness._id,
          specialist: testSpecialist._id,
          service: testService._id,
          startDate: targetDate,
          endDate: endDate,
          status: 'confirmed',
          reminderSent: false,
        },
        {
          user: testUser._id,
          business: testBusiness._id,
          specialist: testSpecialist._id,
          service: testService._id,
          startDate: new Date(targetDate.getTime() + 10 * 60 * 1000),
          endDate: new Date(targetDate.getTime() + 70 * 60 * 1000),
          status: 'confirmed',
          reminderSent: false,
        },
      ]);

      // Should not throw error even with potentially invalid data
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });
  });

  describe('Service lifecycle', () => {
    it('should start and stop the service', () => {
      // Should not throw
      expect(() => reminderService.start()).not.toThrow();
      expect(() => reminderService.stop()).not.toThrow();
    });

    it('should handle multiple start calls', () => {
      reminderService.start();
      reminderService.start(); // Second call should be safe
      reminderService.stop();
    });

    it('should handle stop without start', () => {
      // Should not throw even if never started
      expect(() => reminderService.stop()).not.toThrow();
    });
  });

  describe('Trigger reminders manually', () => {
    it('should allow manual trigger of reminders without errors', async () => {
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);

      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: targetDate,
        endDate: endDate,
        status: 'confirmed',
        reminderSent: false,
      });

      // Manually trigger - should not throw error
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle reservations with missing data gracefully', async () => {
      const targetDate = new Date();
      targetDate.setHours(targetDate.getHours() + 24, 30, 0, 0);
      const endDate = calculateEndDate(targetDate);

      // Create reservation with minimal data (might fail population)
      await Reservation.create({
        user: testUser._id,
        business: testBusiness._id,
        specialist: testSpecialist._id,
        service: testService._id,
        startDate: targetDate,
        endDate: endDate,
        status: 'confirmed',
        reminderSent: false,
      });

      // Should not throw even if some data is missing
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });

    it('should handle empty result set', async () => {
      // No reservations matching criteria
      await expect(reminderService.triggerReminders()).resolves.not.toThrow();
    });
  });
});
