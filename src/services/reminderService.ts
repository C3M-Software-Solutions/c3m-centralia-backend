import cron, { ScheduledTask } from 'node-cron';

import { Reservation } from '../models/Reservation.js';
import { notificationService } from './notificationService.js';

export class ReminderService {
  private job: ScheduledTask | null = null;

  /**
   * Starts the reminder cron job
   * Runs every hour to check for reservations that need reminders
   */
  start() {
    if (this.job) {
      console.log('Reminder service is already running');
      return;
    }

    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      console.log('Running reminder check...');
      await this.sendUpcomingReminders();
    });

    console.log('Reminder service started - will run every hour');
  }

  /**
   * Stops the reminder cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('Reminder service stopped');
    }
  }

  /**
   * Finds and sends reminders for reservations happening in 24 hours
   */
  async sendUpcomingReminders(): Promise<void> {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      // Find confirmed reservations happening between 24-25 hours from now
      // that haven't received a reminder yet
      const reservations = await Reservation.find({
        status: 'confirmed',
        startDate: {
          $gte: in24Hours,
          $lt: in25Hours,
        },
        reminderSent: { $ne: true },
      })
        .populate('user', 'name email phone')
        .populate('business', 'name address')
        .populate({
          path: 'specialist',
          populate: { path: 'user', select: 'name email' },
        })
        .populate('service', 'name duration price');

      console.log(`Found ${reservations.length} reservations needing reminders`);

      for (const reservation of reservations) {
        try {
          await notificationService.sendReservationReminder(reservation);

          // Mark reminder as sent
          reservation.reminderSent = true;
          await reservation.save();

          console.log(`Reminder sent for reservation ${reservation._id}`);
        } catch (error) {
          console.error(`Failed to send reminder for reservation ${reservation._id}:`, error);
          // Continue with other reservations even if one fails
        }
      }

      if (reservations.length > 0) {
        console.log(`Successfully sent ${reservations.length} reminders`);
      }
    } catch (error) {
      console.error('Error in sendUpcomingReminders:', error);
    }
  }

  /**
   * Manual trigger for testing purposes
   */
  async triggerReminders(): Promise<number> {
    await this.sendUpcomingReminders();
    const count = await Reservation.countDocuments({
      status: 'confirmed',
      reminderSent: true,
    });
    return count;
  }
}

export const reminderService = new ReminderService();
