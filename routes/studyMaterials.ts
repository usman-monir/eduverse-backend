// Update your studyMaterialRoutes.ts
import express from 'express';
import {
  getStudyMaterials,
  getStudyMaterialById,
  uploadStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial, 
  downloadStudyMaterial,
  getStudyMaterialCollections,
  getStudyMaterialFile, // New
  getStudyMaterialThumbnail, // New
} from '../controllers/studyMaterialController';
import { authenticate, authorizeTutorOrAdmin } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Public routes (but still require authentication)
router.get('/', authenticate, getStudyMaterials);
router.get('/collections', authenticate, getStudyMaterialCollections);
router.get('/:id', authenticate, getStudyMaterialById);

// File access routes (NEW)
router.get('/:id/file', authenticate, getStudyMaterialFile);
router.get('/:id/thumbnail', authenticate, getStudyMaterialThumbnail);

// Protected routes
router.post(
  '/',
  authenticate,
  authorizeTutorOrAdmin,
  upload.single('file'),
  handleUploadError,
  uploadStudyMaterial
);

router.put('/:id', authenticate, updateStudyMaterial);
router.delete('/:id', authenticate, deleteStudyMaterial);
router.get('/:id/download', authenticate, downloadStudyMaterial);

export default router;