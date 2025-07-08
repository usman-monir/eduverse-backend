import express from 'express';
import {
  getStudyMaterials,
  getStudyMaterialById,
  uploadStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  downloadStudyMaterial,
} from '../controllers/studyMaterialController';
import { authenticate, authorizeTutorOrAdmin } from '../middleware/auth';
import { upload, handleUploadError } from '../middleware/upload';

const router = express.Router();

// Public routes
router.get('/', getStudyMaterials);
router.get('/:id', getStudyMaterialById);

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
