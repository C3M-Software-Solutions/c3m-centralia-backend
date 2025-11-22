import { Router } from 'express';
import { body } from 'express-validator';
import {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
} from '../controllers/businessController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

/**
 * @swagger
 * /api/businesses:
 *   post:
 *     summary: Create a new business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ruc
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wellness Center
 *               ruc:
 *                 type: string
 *                 pattern: ^\d{11}$
 *                 example: 12345678901
 *               description:
 *                 type: string
 *                 example: Premium wellness services
 *               photoUrl:
 *                 type: string
 *                 format: uri
 *               address:
 *                 type: string
 *               hasPremises:
 *                 type: boolean
 *               hasRemoteSessions:
 *                 type: boolean
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Business created successfully
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
 *                     business:
 *                       $ref: '#/components/schemas/Business'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */

/**
 * @swagger
 * /api/businesses:
 *   get:
 *     summary: Get all businesses
 *     tags: [Businesses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of businesses
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
 *                     businesses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Business'
 *                     pagination:
 *                       type: object
 */

/**
 * @swagger
 * /api/businesses/{id}:
 *   get:
 *     summary: Get business by ID
 *     tags: [Businesses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business details
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
 *                     business:
 *                       $ref: '#/components/schemas/Business'
 *       404:
 *         description: Business not found
 */

/**
 * @swagger
 * /api/businesses/{id}:
 *   put:
 *     summary: Update business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               photoUrl:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Business updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Business not found
 */

/**
 * @swagger
 * /api/businesses/{id}:
 *   delete:
 *     summary: Delete business
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Business not found
 */

// Validation rules
const businessValidation = [
  body('name').trim().notEmpty().withMessage('Business name is required'),
  body('ruc')
    .trim()
    .matches(/^\d{11}$/)
    .withMessage('RUC must be 11 digits'),
  body('description').optional().trim(),
  body('photoUrl').optional().trim().isURL().withMessage('Photo URL must be valid'),
  body('address').optional().trim(),
  body('hasPremises').optional().isBoolean(),
  body('hasRemoteSessions').optional().isBoolean(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Valid email required'),
];

// Routes
router.post(
  '/',
  authenticate,
  authorize('admin', 'specialist'),
  validate(businessValidation),
  createBusiness
);

router.get('/', getAllBusinesses);

router.get('/:id', getBusinessById);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'specialist'),
  validate(businessValidation),
  updateBusiness
);

router.delete('/:id', authenticate, authorize('admin', 'specialist'), deleteBusiness);

export default router;
