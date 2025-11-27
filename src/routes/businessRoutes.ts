import { Router } from 'express';
import { body } from 'express-validator';
import {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  getBusinessByIdPublic,
  updateBusiness,
  deleteBusiness,
} from '../controllers/businessController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Validation rules
const businessValidation = [
  body('name').trim().notEmpty().withMessage('Business name is required'),
  body('ruc')
    .optional()
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

const businessUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('Business name cannot be empty'),
  body('ruc')
    .optional()
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
router.post(
  '/',
  authenticate,
  authorize('admin', 'specialist', 'client'),
  validate(businessValidation),
  createBusiness
);

/**
 * @swagger
 * /api/businesses:
 *   get:
 *     summary: Get all active businesses (Public)
 *     tags: [Businesses]
 *     description: Public endpoint - no authentication required. Returns all active businesses with pagination and search filters.
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in business name and description
 *         example: "dental clinic"
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (searches in address field)
 *         example: "Lima"
 *     responses:
 *       200:
 *         description: List of active businesses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: object
 *                   properties:
 *                     businesses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Business'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get('/', getAllBusinesses);

/**
 * @swagger
 * /api/businesses/public/{id}:
 *   get:
 *     summary: Get business details with services and specialists (Public)
 *     tags: [Businesses]
 *     description: Public endpoint - no authentication required. Returns business details including all active services and specialists.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business details with services and specialists
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
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         address:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         services:
 *                           type: array
 *                           items:
 *                             type: object
 *                         specialists:
 *                           type: array
 *                           items:
 *                             type: object
 *       404:
 *         description: Business not found
 */
router.get('/public/:id', getBusinessByIdPublic);

/**
 * @swagger
 * /api/businesses/{id}:
 *   get:
 *     summary: Get business by ID (Authenticated)
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
router.get('/:id', authenticate, getBusinessById);

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
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'specialist', 'client'),
  validate(businessUpdateValidation),
  updateBusiness
);

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
router.delete('/:id', authenticate, authorize('admin', 'specialist', 'client'), deleteBusiness);

export default router;
