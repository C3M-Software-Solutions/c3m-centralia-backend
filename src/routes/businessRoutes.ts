import { Router } from 'express';
import { body } from 'express-validator';

import {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  getBusinessByIdPublic,
  updateBusiness,
  deleteBusiness,
  getMyBusiness,
} from '../controllers/businessController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Validation rules
const businessValidation = [
  body('ownerId')
    .trim()
    .notEmpty()
    .withMessage('Owner ID is required')
    .isMongoId()
    .withMessage('Owner ID must be a valid MongoDB ID'),
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
  body('theme').optional().isObject().withMessage('Theme must be an object'),
  body('theme.primary')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Primary color must be a valid hex color (e.g., #FF5733)'),
  body('theme.secondary')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Secondary color must be a valid hex color (e.g., #33FF57)'),
  body('theme.background')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Background color must be a valid hex color (e.g., #FFFFFF)'),
  body('theme.accent')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Accent color must be a valid hex color (e.g., #5733FF)'),
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
  body('theme').optional().isObject().withMessage('Theme must be an object'),
  body('theme.primary')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Primary color must be a valid hex color (e.g., #FF5733)'),
  body('theme.secondary')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Secondary color must be a valid hex color (e.g., #33FF57)'),
  body('theme.background')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Background color must be a valid hex color (e.g., #FFFFFF)'),
  body('theme.accent')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Accent color must be a valid hex color (e.g., #5733FF)'),
];

/**
 * @swagger
 * /api/businesses:
 *   post:
 *     summary: Create a new business (Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     description: Only administrators can create new businesses. The admin will assign an owner to the business.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - ownerId
 *             properties:
 *               name:
 *                 type: string
 *                 example: Wellness Center
 *               ownerId:
 *                 type: string
 *                 format: objectId
 *                 example: 507f1f77bcf86cd799439011
 *                 description: ID of the user who will own this business (must have 'owner' role)
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
 *               theme:
 *                 type: object
 *                 description: Customizable theme colors for the business branding
 *                 properties:
 *                   primary:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#FF5733"
 *                     description: Primary brand color (hex format)
 *                   secondary:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#33FF57"
 *                     description: Secondary brand color (hex format)
 *                   background:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#FFFFFF"
 *                     description: Background color (hex format)
 *                   accent:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#5733FF"
 *                     description: Accent color for highlights (hex format)
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
 *         description: Forbidden - Only admins can create businesses
 */
router.post('/', authenticate, authorize('admin'), validate(businessValidation), createBusiness);

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
 * /api/businesses/my-business:
 *   get:
 *     summary: Get the business owned by authenticated owner
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     description: Returns the business that belongs to the authenticated owner. Each owner can only have one business. Returns full details including theme configuration.
 *     responses:
 *       200:
 *         description: Owner's business details
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
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Only owners can access this endpoint
 *       404:
 *         description: No business found for this owner
 */
router.get('/my-business', authenticate, authorize('owner'), getMyBusiness);

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
 *     summary: Update business (Owner or Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     description: Only the business owner or administrators can update business information
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
 *               theme:
 *                 type: object
 *                 description: Customizable theme colors for the business branding (Owner can update)
 *                 properties:
 *                   primary:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#FF5733"
 *                     description: Primary brand color (hex format)
 *                   secondary:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#33FF57"
 *                     description: Secondary brand color (hex format)
 *                   background:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#FFFFFF"
 *                     description: Background color (hex format)
 *                   accent:
 *                     type: string
 *                     pattern: ^#[0-9A-Fa-f]{6}$
 *                     example: "#5733FF"
 *                     description: Accent color for highlights (hex format)
 *     responses:
 *       200:
 *         description: Business updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only owner or admin can update
 *       404:
 *         description: Business not found
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'owner'),
  validate(businessUpdateValidation),
  updateBusiness
);

/**
 * @swagger
 * /api/businesses/{id}:
 *   delete:
 *     summary: Delete business (Admin only)
 *     tags: [Businesses]
 *     security:
 *       - bearerAuth: []
 *     description: Only administrators can delete businesses
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
 *         description: Forbidden - Only admins can delete businesses
 *       404:
 *         description: Business not found
 */
router.delete('/:id', authenticate, authorize('admin'), deleteBusiness);

export default router;
