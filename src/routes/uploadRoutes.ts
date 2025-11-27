import { Router } from 'express';
import {
  uploadFile,
  uploadFiles,
  deleteFile,
  getStorageInfo,
} from '../controllers/uploadController';
import { authenticate, authorize } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = Router();

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               folder:
 *                 type: string
 *                 description: Folder name (optional)
 *                 example: avatars
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                     file:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                           example: https://example.com/uploads/file.jpg
 *                         provider:
 *                           type: string
 *                           enum: [local, s3, cloudinary]
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, upload.single('file'), handleUploadError, uploadFile);

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload (max 10)
 *               folder:
 *                 type: string
 *                 description: Folder name (optional)
 *                 example: documents
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/multiple', authenticate, upload.array('files', 10), handleUploadError, uploadFiles);

/**
 * @swagger
 * /api/upload:
 *   delete:
 *     summary: Delete a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileUrl
 *             properties:
 *               fileUrl:
 *                 type: string
 *                 description: URL or path of the file to delete
 *                 example: /uploads/avatars/file.jpg
 *               provider:
 *                 type: string
 *                 enum: [local, s3, cloudinary]
 *                 description: Storage provider (optional, uses default if not specified)
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/', authenticate, authorize('admin', 'specialist'), deleteFile);

/**
 * @swagger
 * /api/upload/info:
 *   get:
 *     summary: Get storage configuration info
 *     tags: [Upload]
 *     responses:
 *       200:
 *         description: Storage info retrieved successfully
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
 *                     provider:
 *                       type: string
 *                       enum: [local, s3, cloudinary]
 *                     maxFileSize:
 *                       type: integer
 *                       example: 5242880
 *                     allowedTypes:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.get('/info', getStorageInfo);

export default router;
