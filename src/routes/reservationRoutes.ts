import { Router } from 'express';
import { body } from 'express-validator';
import {
  createReservation,
  getReservations,
  getReservationById,
  updateReservationStatus,
  checkAvailability,
} from '../controllers/reservationController.js';
import { getClinicalRecordByReservation } from '../controllers/clinicalRecordController.js';
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
 *     summary: Get all reservations with advanced filtering
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no-show]
 *         description: Filter by reservation status
 *       - in: query
 *         name: specialist
 *         schema:
 *           type: string
 *         description: Filter by specialist ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by specific date (YYYY-MM-DD) - returns reservations on that day
 *         example: "2025-11-24"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reservations from this date (inclusive)
 *         example: "2025-11-20"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter reservations until this date (inclusive)
 *         example: "2025-11-30"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: (Deprecated - use dateFrom) Filter from date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: (Deprecated - use dateTo) Filter to date
 *     responses:
 *       200:
 *         description: List of reservations matching filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: number
 *                   example: 5
 *                 data:
 *                   type: object
 *                   properties:
 *                     reservations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Reservation'
 *     description: |
 *       Returns reservations based on user role:
 *       - **Client**: Only their own reservations
 *       - **Specialist**: Only reservations assigned to them
 *       - **Admin**: All reservations for their business
 *
 *       **Filter Examples:**
 *       - Get today's reservations: `?date=2025-11-24`
 *       - Get this week's reservations: `?dateFrom=2025-11-20&dateTo=2025-11-26`
 *       - Get pending reservations for a specialist: `?specialist=507f1f77bcf86cd799439011&status=pending`
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
 * /api/reservations/{id}/clinical-record:
 *   get:
 *     summary: Get clinical record for a reservation
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
 *         description: Clinical record details
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
 *                     clinicalRecord:
 *                       $ref: '#/components/schemas/ClinicalRecord'
 *       404:
 *         description: Clinical record not found for this reservation
 *       403:
 *         description: Not authorized to view this record
 */
router.get('/:id/clinical-record', authenticate, getClinicalRecordByReservation);

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
