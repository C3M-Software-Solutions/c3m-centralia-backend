import { Router } from 'express';
import { body } from 'express-validator';
import {
  createSpecialist,
  getSpecialistsByBusiness,
  getSpecialistById,
  updateSpecialist,
  deleteSpecialist,
} from '../controllers/specialistController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router({ mergeParams: true });

// Validation rules
const specialistValidation = [
  body('userId').trim().notEmpty().withMessage('User ID is required'),
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

/**
 * @swagger
 * /api/businesses/{businessId}/specialists:
 *   post:
 *     summary: Create a new specialist for a business
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
 *               - userId
 *               - specialty
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
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
 *         description: Specialist created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authenticate, validate(specialistValidation), createSpecialist);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists:
 *   get:
 *     summary: Get all specialists for a business
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
 *         description: List of specialists
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
 *         description: Specialist details
 *       404:
 *         description: Specialist not found
 */
router.get('/:specialistId', getSpecialistById);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists/{specialistId}:
 *   put:
 *     summary: Update specialist
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
router.put('/:specialistId', authenticate, updateSpecialist);

/**
 * @swagger
 * /api/businesses/{businessId}/specialists/{specialistId}:
 *   delete:
 *     summary: Delete specialist
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
router.delete('/:specialistId', authenticate, deleteSpecialist);

export default router;
