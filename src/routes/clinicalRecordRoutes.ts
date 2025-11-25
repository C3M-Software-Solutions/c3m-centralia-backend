import { Router } from 'express';
import { body } from 'express-validator';
import {
  createClinicalRecord,
  getClinicalRecords,
  getClinicalRecordById,
  updateClinicalRecord,
} from '../controllers/clinicalRecordController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Validation rules
const clinicalRecordValidation = [
  body('user').notEmpty().withMessage('User ID is required'),
  body('business').notEmpty().withMessage('Business ID is required'),
  body('reservation').optional().isMongoId().withMessage('Invalid reservation ID'),
  body('diagnosis').trim().notEmpty().withMessage('Diagnosis is required'),
  body('treatment').trim().notEmpty().withMessage('Treatment is required'),
  body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be positive'),
  body('height').optional().isFloat({ min: 0 }).withMessage('Height must be positive'),
  body('bmi').optional().isFloat({ min: 0 }).withMessage('BMI must be positive'),
  body('bloodPressure')
    .optional()
    .matches(/^\d{2,3}\/\d{2,3}$/)
    .withMessage('Blood pressure format: XXX/XXX'),
  body('heartRate').optional().isInt({ min: 30, max: 250 }),
  body('temperature').optional().isFloat({ min: 30, max: 45 }),
  body('diseases').optional().isArray(),
  body('allergies').optional().isArray(),
  body('medications').optional().isArray(),
  body('disability').optional().trim(),
  body('notes').optional().trim(),
];

/**
 * @swagger
 * /api/clinical-records:
 *   post:
 *     summary: Create a new clinical record
 *     tags: [Clinical Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user
 *               - business
 *               - diagnosis
 *               - treatment
 *             properties:
 *               user:
 *                 type: string
 *                 description: Patient ID
 *               business:
 *                 type: string
 *                 description: Business ID
 *               specialist:
 *                 type: string
 *                 description: Specialist ID
 *               reservation:
 *                 type: string
 *                 description: Related reservation ID
 *               diagnosis:
 *                 type: string
 *                 description: Medical diagnosis
 *               treatment:
 *                 type: string
 *                 description: Prescribed treatment
 *               weight:
 *                 type: number
 *                 description: Patient weight in kg
 *               height:
 *                 type: number
 *                 description: Patient height in cm
 *               bmi:
 *                 type: number
 *                 description: Body Mass Index
 *               bloodPressure:
 *                 type: string
 *                 description: Blood pressure (e.g., 120/80)
 *               heartRate:
 *                 type: integer
 *                 description: Heart rate in bpm
 *               temperature:
 *                 type: number
 *                 description: Body temperature in °C
 *               diseases:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of diseases
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of allergies
 *               medications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Current medications
 *               disability:
 *                 type: string
 *                 description: Any disability information
 *               notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       201:
 *         description: Clinical record created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only specialists can create records
 */
router.post(
  '/',
  authenticate,
  authorize('specialist', 'admin'),
  validate(clinicalRecordValidation),
  createClinicalRecord
);

/**
 * @swagger
 * /api/clinical-records:
 *   get:
 *     summary: Get clinical records (filtered by role)
 *     tags: [Clinical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *         description: Filter by patient ID (admin only)
 *       - in: query
 *         name: specialistId
 *         schema:
 *           type: string
 *         description: Filter by specialist ID (admin only)
 *       - in: query
 *         name: businessId
 *         schema:
 *           type: string
 *         description: Filter by business ID
 *     responses:
 *       200:
 *         description: List of clinical records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, getClinicalRecords);

/**
 * @swagger
 * /api/clinical-records/{id}:
 *   get:
 *     summary: Get clinical record by ID
 *     tags: [Clinical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical record ID
 *     responses:
 *       200:
 *         description: Clinical record details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized to view this record
 *       404:
 *         description: Clinical record not found
 */
router.get('/:id', authenticate, getClinicalRecordById);

/**
 * @swagger
 * /api/clinical-records/{id}:
 *   put:
 *     summary: Update clinical record
 *     tags: [Clinical Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Clinical record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diagnosis:
 *                 type: string
 *               treatment:
 *                 type: string
 *               weight:
 *                 type: number
 *               height:
 *                 type: number
 *               bmi:
 *                 type: number
 *               bloodPressure:
 *                 type: string
 *               heartRate:
 *                 type: integer
 *               temperature:
 *                 type: number
 *               diseases:
 *                 type: array
 *                 items:
 *                   type: string
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: string
 *               medications:
 *                 type: array
 *                 items:
 *                   type: string
 *               disability:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Clinical record updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only specialists can update records
 *       404:
 *         description: Clinical record not found
 */
router.put(
  '/:id',
  authenticate,
  authorize('specialist', 'admin'),
  validate(clinicalRecordValidation),
  updateClinicalRecord
);

export default router;
