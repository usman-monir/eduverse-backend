import { Request, Response } from 'express';
import { StudyMaterial, IStudyMaterial } from '../models/StudyMaterial';
import { User, IUser } from '../models/User';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Get all study materials (with filters)
// @route   GET /api/study-materials
// @access  Public (with role-based filtering)
export const getStudyMaterials = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      subject,
      uploadedBy,
      accessLevel,
      page = 1,
      limit = 10,
    } = req.query;

    const filter: any = {};

    // Apply filters
    if (subject) filter.subject = { $regex: subject as string, $options: 'i' };
    if (uploadedBy)
      filter.uploadedByName = { $regex: uploadedBy as string, $options: 'i' };
    if (accessLevel) filter.accessLevel = accessLevel;
    if (req.query.collectionName) filter.collectionName = { $regex: req.query.collectionName as string, $options: 'i' };

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const materials = await StudyMaterial.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await StudyMaterial.countDocuments(filter);

    res.json({
      success: true,
      data: materials,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get study materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching study materials',
    });
  }
};

// @desc    Get study material by ID
// @route   GET /api/study-materials/:id
// @access  Public
export const getStudyMaterialById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const material = await StudyMaterial.findById(req.params.id).populate(
      'uploadedBy',
      'name email'
    );

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Increment view count
    material.viewCount += 1;
    await material.save();

    res.json({
      success: true,
      data: material,
    });
  } catch (error) {
    console.error('Get study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching study material',
    });
  }
};

// @desc    Upload study material (Tutors & Admins only)
// @route   POST /api/study-materials
// @access  Private (Tutor, Admin)
export const uploadStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      subject,
      accessLevel = 'all',
      tags = [],
    } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

   const file = req.file;
const fileUrl = (file as any)?.path || '';

const material = new StudyMaterial({
  title,
  description,
  fileName: file.originalname,
  fileUrl, // ✅ Cloudinary URL
  fileType: file.mimetype.split('/')[1] as any,
  fileSize: file.size,
  uploadedBy: req.user?._id,
  uploadedByName: req.user?.name,
  subject,
  accessLevel,
  tags: Array.isArray(tags) ? tags : [tags],
  collectionName: req.body.collectionName,
});


    await material.save();

    res.status(201).json({
      success: true,
      data: material,
      message: 'Study material uploaded successfully',
    });
  } catch (error) {
    console.error('Upload study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading study material',
    });
  }
};

// @desc    Update study material (Owner & Admins only)
// @route   PUT /api/study-materials/:id
// @access  Private (Owner, Admin)
export const updateStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, description, subject, accessLevel, tags, collectionName } = req.body;

    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check if user can update this material
    if (
      req.user?.role !== 'admin' &&
      material.uploadedBy.toString() !== (req.user?._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own materials',
      });
      return;
    }

    // Update fields
    if (title) material.title = title;
    if (description) material.description = description;
    if (subject) material.subject = subject;
    if (accessLevel) material.accessLevel = accessLevel;
    if (tags) material.tags = Array.isArray(tags) ? tags : [tags];
    if (collectionName) material.collectionName = collectionName;

    await material.save();

    res.json({
      success: true,
      data: material,
      message: 'Study material updated successfully',
    });
  } catch (error) {
    console.error('Update study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating study material',
    });
  }
};

// @desc    Delete study material (Owner & Admins only)
// @route   DELETE /api/study-materials/:id
// @access  Private (Owner, Admin)
export const deleteStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check if user can delete this material
    if (
      req.user?.role !== 'admin' &&
      material.uploadedBy.toString() !== (req.user?._id as mongoose.Types.ObjectId).toString()
    ) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own materials',
      });
      return;
    }

    await StudyMaterial.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Study material deleted successfully',
    });
  } catch (error) {
    console.error('Delete study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting study material',
    });
  }
};

// @desc    Download study material (with access control)
// @route   GET /api/study-materials/:id/download
// @access  Private
export const downloadStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check access level
    if (material.accessLevel !== 'all') {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (
        material.accessLevel === 'tutor' &&
        req.user.role !== 'tutor' &&
        req.user.role !== 'admin'
      ) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      if (material.accessLevel === 'admin' && req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }
    }

    // Increment download count
    material.downloadCount += 1;
    await material.save();

    // For now, return the file URL
    // In production, you might want to stream the file or implement additional security
    res.json({
      success: true,
      data: {
        fileUrl: material.fileUrl,
        fileName: material.fileName,
      },
      message: 'Download link generated',
    });
  } catch (error) {
    console.error('Download study material error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing download',
    });
  }
};

// @desc    Get all unique collection names
// @route   GET /api/study-materials/collections
// @access  Public
export const getStudyMaterialCollections = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const collections = await StudyMaterial.distinct('collectionName');
    res.json({
      success: true,
      data: collections,
    });
  } catch (error) {
    console.error('Get study material collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching collections',
    });
  }
};
