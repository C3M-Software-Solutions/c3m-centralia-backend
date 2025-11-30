import { Router } from 'express';
import { body } from 'express-validator';

import {
  createSpecialist,
  getSpecialistsByBusiness,
  getSpecialistById,
  updateSpecialist,
  deleteSpecialist,
  getAvailableSlots,
  resetSpecialistPassword,
} from '../controllers/specialistController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

// Validation rules
const specialistValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('specialty').trim().notEmpty().withMessage('Specialty is required'),
  body('bio').optional().trim(),
  body('services').optional().isArray().withMessage('Services must be an array'),
  body('services.*').optional().isMongoId().withMessage('Each service must be a valid ID'),
  body('schedule').optional().isArray().withMessage('Schedule must be an array'),
  body('schedule.*.day')
    .optional()
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day'),
  body('schedule.*.startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('schedule.*.endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

/**
 * @swagger
 * /api/businesses/{businessId}/specialists:
 *   post:
 *     summary: Create a new specialist for a business (Owner only)
 *     description: |
 *       Only the business owner can create specialists for their business.
 *       This creates both a user account and specialist profile with initial password.
 *       **Important**: Specialists cannot change their own password later - only the owner can reset it.
 *     tags: [Specialists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - specialty
 *             properties:
 *               name:
 *                 type: string
 *                 example: Dr. John Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.smith@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: initialpass123
 *                 description: Initial password set by business owner
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               specialty:
 *                 type: string
 *                 example: Physical Therapy
 *               bio:
 *                 type: string
 *                 example: Experienced physical therapist with 10 years of practice
 *               services:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *                 description: Array of service IDs that this specialist can provide
 *               schedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                       example: monday
 *                     startTime:
 *                       type: string
 *                       example: "09:00"
 *                     endTime:
 *                       type: string
 *                       example: "17:00"
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       201:
 *         description: Specialist created successfully (user account + specialist profile)
 *       400:
 *         description: Validation error or email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not business owner
 */
router.post(
  '/',
  authenticate,
  authorize('owner'),
  validate(specialistValidation),
  createSpecialist
);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists:
 *   get:
 *     summary: Get all specialists for a business
 *     description: Returns all active specialists with populated user and services data
 *     tags: [Specialists]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: List of specialists with populated user and services data
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
 *                     specialists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Specialist'
 */
router.get('/', getSpecialistsByBusiness);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists/{specialistId}:
 *   get:
 *     summary: Get specialist by ID
 *     description: Returns specialist details with populated user, services, and business data including availability schedule
 *     tags: [Specialists]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *       - in: path
 *         name: specialistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialist ID
 *     responses:
 *       200:
 *         description: Specialist details with all related data (user, services, business, availability)
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
 *                     specialist:
 *                       $ref: '#/components/schemas/Specialist'
 *       404:
 *         description: Specialist not found
 */
router.get('/:specialistId', getSpecialistById);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists/{specialistId}:
 *   put:
 *     summary: Update specialist (Owner only)
 *     description: Only the business owner can update their specialists
 *     tags: [Specialists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *       - in: path
 *         name: specialistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialist ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               specialty:
 *                 type: string
 *               bio:
 *                 type: string
 *               schedule:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     isAvailable:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Specialist updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Specialist not found
 */
router.put('/:specialistId', authenticate, authorize('owner'), updateSpecialist);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists/{specialistId}:
 *   delete:
 *     summary: Delete specialist (Owner only)
 *     description: Only the business owner can delete their specialists
 *     tags: [Specialists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *       - in: path
 *         name: specialistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialist ID
 *     responses:
 *       200:
 *         description: Specialist deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Specialist not found
 */
router.delete('/:specialistId', authenticate, authorize('owner'), deleteSpecialist);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists/{specialistId}/reset-password:
 *   post:
 *     summary: Reset specialist password (Admin/Business Owner only)
 *     description: Allows business owner to reset a specialist's password. Specialists cannot change their own passwords.
 *     tags: [Specialists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *       - in: path
 *         name: specialistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                     message:
 *                       type: string
 *                       example: Specialist password reset successfully
 *                     specialist:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *       400:
 *         description: Invalid request or password too short
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not business owner
 *       404:
 *         description: Specialist not found
 */
router.post(
  '/:specialistId/reset-password',
  authenticate,
  authorize('owner'),
  validate(resetPasswordValidation),
  resetSpecialistPassword
);

/**
 * @swagger
 * /api/specialists/{specialistId}/available-slots:
 *   get:
 *     summary: Get available time slots for a specialist
 *     description: Returns available appointment slots for a specialist on a specific date, considering existing reservations and service duration
 *     tags: [Specialists]
 *     parameters:
 *       - in: path
 *         name: specialistId
 *         required: true
 *         schema:
 *           type: string
 *         description: Specialist ID
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-11-24"
 *         description: Date to check availability (YYYY-MM-DD format)
 *       - in: query
 *         name: serviceId
 *         required: false
 *         schema:
 *           type: string
 *         description: Service ID to use for slot duration (optional, defaults to 60 minutes)
 *     responses:
 *       200:
 *         description: List of available time slots
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
 *                     date:
 *                       type: string
 *                       example: "2025-11-24"
 *                     specialistId:
 *                       type: string
 *                     serviceId:
 *                       type: string
 *                       nullable: true
 *                     availableSlots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-24T09:00:00.000Z"
 *                           endTime:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-11-24T10:00:00.000Z"
 *                     totalSlots:
 *                       type: integer
 *                       example: 8
 *       400:
 *         description: Bad request (invalid date format or parameters)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: "Date query parameter is required (format: YYYY-MM-DD)"
 */
router.get('/:specialistId/available-slots', getAvailableSlots);

export default router;
