import { Router } from 'express';
import { body } from 'express-validator';
import {
  createReservation,
  getReservations,
  getReservationById,
  updateReservationStatus,
  checkAvailability,
} from '../controllers/reservationController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Validation rules
const reservationValidation = [
  body('business').notEmpty().withMessage('Business ID is required'),
  body('specialist').notEmpty().withMessage('Specialist ID is required'),
  body('service').notEmpty().withMessage('Service ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('notes').optional().trim(),
];

/**
 * @swagger
 * /api/reservations/availability:
 *   get:
 *     summary: Check specialist availability
 *     tags: [Reservations]
 *     parameters:
 *       - in: query
 *         name: specialistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialist ID
 *       - in: query
 *         name: serviceId
 *         schema:
 *           type: string
 *         description: Service ID (optional)
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Available time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableSlots:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date-time
 *                     serviceDuration:
 *                       type: number
 */
const updateStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'no-show'])
    .withMessage('Invalid status'),
  body('cancellationReason').optional().trim(),
];

router.post('/', authenticate, validate(reservationValidation), createReservation);

/**
 * @swagger
 * /api/reservations:
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - business
 *               - specialist
 *               - service
 *               - startDate
 *             properties:
 *               business:
 *                 type: string
 *                 description: Business ID
 *               specialist:
 *                 type: string
 *                 description: Specialist ID
 *               service:
 *                 type: string
 *                 description: Service ID
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2024-12-25T09:00:00.000Z
 *               notes:
 *                 type: string
 *                 example: First time appointment
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     reservation:
 *                       $ref: '#/components/schemas/Reservation'
 *       409:
 *         description: Time slot not available
 */
router.get('/', authenticate, getReservations);

/**
 * @swagger
 * /api/reservations:
 *   get:
 *     summary: Get all reservations
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed]
 *         description: Filter by status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     reservations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reservation'
 */
router.get('/availability', checkAvailability);

/**
 * @swagger
 * /api/reservations/{id}:
 *   get:
 *     summary: Get reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation details
 *       404:
 *         description: Reservation not found
 */
router.get('/:id', authenticate, getReservationById);

/**
 * @swagger
 * /api/reservations/{id}/status:
 *   put:
 *     summary: Update reservation status
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, cancelled, completed, no-show]
 *               cancellationReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Reservation not found
 */
router.put('/:id/status', authenticate, validate(updateStatusValidation), updateReservationStatus);

export default router;
