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

// Routes
router.post(
  '/',
  authenticate,
  authorize('specialist', 'admin'),
  validate(clinicalRecordValidation),
  createClinicalRecord
);

router.get('/', authenticate, getClinicalRecords);

router.get('/:id', authenticate, getClinicalRecordById);

router.put(
  '/:id',
  authenticate,
  authorize('specialist', 'admin'),
  validate(clinicalRecordValidation),
  updateClinicalRecord
);

export default router;
