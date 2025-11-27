import { Router } from 'express';

import { reminderService } from '../services/reminderService.js';

const router = Router();

/**
 * @swagger
 * /api/cron/send-reminders:
 *   post:
 *     summary: Trigger reminder emails manually (for Vercel Cron)
 *     description: |
 *       This endpoint is designed to be called by Vercel Cron Jobs.
 *       It sends reminder emails to users with appointments in the next 24 hours.
 *
 *       **Security**: This endpoint should be protected with a secret token in production.
 *     tags: [Notifications]
 *     parameters:
 *       - in: header
 *         name: x-cron-secret
 *         schema:
 *           type: string
 *         description: Secret token to authenticate cron job requests
 *     responses:
 *       200:
 *         description: Reminders sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Reminders sent successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     sent:
 *                       type: number
 *                       example: 5
 *       401:
 *         description: Unauthorized - Invalid or missing cron secret
 *       500:
 *         description: Internal server error
 */
router.post('/send-reminders', async (req, res) => {
  try {
    // Verify cron secret in production
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = req.headers['x-cron-secret'];

    if (process.env.NODE_ENV === 'production' && cronSecret && providedSecret !== cronSecret) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    // Trigger reminders
    await reminderService.sendUpcomingReminders();

    return res.json({
      status: 'success',
      message: 'Reminders sent successfully',
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to send reminders',
    });
  }
});

export default router;
