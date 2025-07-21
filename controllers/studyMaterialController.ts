import { Request, Response } from 'express';
import { StudyMaterial, IStudyMaterial } from '../models/StudyMaterial';
import { User, IUser } from '../models/User';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

interface AuthRequest extends Request {
  user?: IUser;
}

interface AuthRequest extends Request {
  user?: IUser;
}

// Helper function to extract public ID from Cloudinary URL
export const extractPublicId = (fileUrl: string): string => {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split('/'); // e.g. ['', 'raw', 'authenticated', 's--TOKEN--', 'v123...', 'folder', 'filename.ext']

    // Find index of version string: e.g. v1752906756
    const versionIndex = parts.findIndex(p => /^v\d+$/.test(p));
    if (versionIndex === -1) {
      throw new Error('Missing version in Cloudinary URL');
    }

    // Public ID starts after version
    const publicIdParts = parts.slice(versionIndex + 1); // ['study-materials', 'file-12345.pdf']

    // Strip file extension
    const last = publicIdParts[publicIdParts.length - 1];
    const dotIndex = last.lastIndexOf('.');
    if (dotIndex !== -1) {
      publicIdParts[publicIdParts.length - 1] = last.slice(0, dotIndex); // e.g. file-12345
    }

    return publicIdParts.join('/'); // 'study-materials/file-12345'
  } catch (error) {
    console.error('❌ Error extracting public ID:', error);
    throw error;
  }
};



// Helper function to generate signed URL
const generateSignedUrl = (publicId: string, expirationMinutes: number = 5): string => {
  try {

    console.log('Final publicId:', publicId);

    return cloudinary.url(publicId, {
      type: 'authenticated',
      resource_type: 'raw',
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutes
    });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error('Failed to generate signed URL');
  }
};
// Add this to your studyMaterialController.ts


import https from 'https';
import http from 'http';

import axios from 'axios';

// @desc    Get study material file (with access control)
// @route   GET /api/study-materials/:id/file
// @access  Private (authenticated users)
export const getStudyMaterialFile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      res.status(404).json({ success: false, message: 'Study material not found' });
      return;
    }

    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({ success: false, message: 'You do not have permission to access this material' });
      return;
    }

    const publicId = extractPublicId(material.fileUrl);
    const signedUrl = generateSignedUrl(publicId, 30); // 30 mins expiry

    const response = await axios.get(signedUrl, {
      responseType: 'stream',
      timeout: 10000, // optional: timeout in ms
    });

    res.set({
      'Content-Type': response.headers['content-type'] || 'application/octet-stream',
      'Content-Length': response.headers['content-length'],
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });

    response.data.pipe(res);

  } catch (error: any) {
    console.error('❌ Error streaming file:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch file',
    });
  }
};


// @desc    Get study material thumbnail/preview
// @route   GET /api/study-materials/:id/thumbnail
// @access  Private  
export const getStudyMaterialThumbnail = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check access permissions
    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }


    try {
      const publicId = extractPublicId(material.fileUrl);
      if (!publicId) {
        throw new Error('Invalid file URL format');
      }

      // Generate thumbnail URL for images/PDFs
      let thumbnailUrl: string;

      if (material.fileType === 'pdf') {
        thumbnailUrl = cloudinary.url(publicId, {
          type: 'authenticated',
          resource_type: 'image',
          secure: true,
          transformation: [
            { width: 300, height: 400, crop: 'fill', quality: 'auto', format: 'jpg', page: 1 }
          ],
          expires_at: Math.floor(Date.now() / 1000) + (60 * 10),
          sign_url: true,
        });
      } else if (['jpg', 'jpeg', 'png'].includes(material.fileType)) {
        thumbnailUrl = cloudinary.url(publicId, {
          type: 'authenticated',
          resource_type: 'image',
          secure: true,
          transformation: [
            { width: 300, height: 400, crop: 'fill', quality: 'auto' }
          ],
          expires_at: Math.floor(Date.now() / 1000) + (60 * 10),
          sign_url: true,
        });
      } else {
        // For other file types, return file type icon URL or placeholder
        res.json({
          success: true,
          data: {
            thumbnailUrl: null,
            fileType: material.fileType,
          },
        });
        return;
      }

      // ✅ Use axios to proxy the image securely
      const response = await axios.get(thumbnailUrl, { responseType: 'stream' });

      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=300', // 5 minutes
      });

      response.data.pipe(res);
    } catch (error) {
      console.error('Error generating or streaming thumbnail:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate or fetch thumbnail',
      });
    }

  } catch (error) {
    console.error('Get thumbnail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get all study materials (with filters)
// @route   GET /api/study-materials
// @access  Private (authenticated users only)
export const getStudyMaterials = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // ✅ Authentication check
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required to access study materials',
      });
      return;
    }

    // ✅ Role validation
    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Invalid user role.',
      });
      return;
    }

    // ✅ Account status check
    if (req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is not active yet. Please contact administrator.',
      });
      return;
    }

    // ✅ Extract query params
    const {
      subject,
      uploadedBy,
      accessLevel,
      page = 1,
      limit = 10,
      collectionName,
    } = req.query;

    const filter: Record<string, any> = {};

    // ✅ Apply search filters
    if (subject) {
      filter.subject = { $regex: subject as string, $options: 'i' };
    }
    if (uploadedBy) {
      filter.uploadedByName = { $regex: uploadedBy as string, $options: 'i' };
    }
    if (accessLevel) {
      filter.accessLevel = accessLevel;
    }
    if (collectionName) {
      filter.collectionName = { $regex: collectionName as string, $options: 'i' };
    }

    // ✅ Access-level based visibility logic
    const accessFilters: Record<string, any> = {
      $or: [{ accessLevel: 'all' }],
    };

    if (req.user.role === 'admin') {
      accessFilters.$or.push({ accessLevel: 'tutor' }, { accessLevel: 'admin' });
    } else if (req.user.role === 'tutor') {
      accessFilters.$or.push({ accessLevel: 'tutor' });
    }

    // ✅ Combine all filters
    const finalFilter =
      Object.keys(filter).length > 0
        ? { $and: [filter, accessFilters] }
        : accessFilters;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const limitParsed = parseInt(limit as string);

    // ✅ Fetch materials with pagination and sorting
    const materials = await StudyMaterial.find(finalFilter)
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limitParsed);

    const total = await StudyMaterial.countDocuments(finalFilter);

    // ✅ Sanitize results
    const processedMaterials = materials.map((material) => {
      const materialObj = material.toObject();
      return {
        ...materialObj,
        fileUrl: undefined, // Remove direct file URL
        id: material._id,
        hasFile: !!material.fileUrl,
      };
    });

    // ✅ Send response
    res.json({
      success: true,
      data: processedMaterials,
      pagination: {
        page: parseInt(page as string),
        limit: limitParsed,
        total,
        pages: Math.ceil(total / limitParsed),
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
// @access  Private
export const getStudyMaterialById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Check authentication
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Check user role and status
    if (!['student', 'tutor', 'admin'].includes(req.user.role) || req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

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

    // Check access level permissions
    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this material',
      });
      return;
    }

    // Increment view count
    material.viewCount += 1;
    await material.save();

    // Return material without direct fileUrl
    const safeMaterial = {
      ...material.toObject(),
      fileUrl: undefined, // Remove direct URL
      id: material._id,
      hasFile: !!material.fileUrl,
    };

    res.json({
      success: true,
      data: safeMaterial,
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
    // Check authentication and role
    if (!req.user || !['tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Only tutors and admins can upload study materials',
      });
      return;
    }

    if (req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Your account is not active yet',
      });
      return;
    }

    const {
      title,
      description,
      subject,
      accessLevel = 'all',
      tags = [],
      collectionName,
    } = req.body;

    const file = req.file;

    if (!file || !file.path) {
      res.status(400).json({
        success: false,
        message: 'File upload failed or unsupported file format.',
      });
      return;
    }

    // Upload to Cloudinary in the collection folder
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder:`study-materials/${collectionName}`,
      resource_type: 'raw', // for PDFs, docs, etc.
      use_filename: true,
      unique_filename: false,
       type: 'authenticated',
    });

    const fileUrl = uploadResult.secure_url;
const publicId = uploadResult.public_id; // <-- Save this!

    const material = new StudyMaterial({
      title,
      description,
      fileName: file.originalname,
      fileUrl,
      publicId,
      fileType: file.mimetype.split('/')[1],
      fileSize: file.size,
      uploadedBy: req.user._id,
      uploadedByName: req.user.name,
      subject,
      accessLevel,
      tags: Array.isArray(tags) ? tags : [tags],
      collectionName,
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

    if (!req.user || req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check if user can update this material
    const canUpdate =
      req.user.role === 'admin' ||
      material.uploadedBy.toString() === (req.user._id as mongoose.Types.ObjectId).toString();

    if (!canUpdate) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own materials or be an admin',
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
}


  ;// @desc    Delete study material (Owner & Admins only)
// @route   DELETE /api/study-materials/:id
// @access  Private (Owner, Admin)
export const deleteStudyMaterial = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // ✅ Check authentication and status
    if (!req.user || req.user.status !== 'active') {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // ✅ Check permission to delete
    const isAdmin = req.user.role === 'admin';
    const isOwner = material.uploadedBy.toString() === (req.user._id as mongoose.Types.ObjectId | string).toString();

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own materials',
      });
      return;
    }

    // ✅ Delete from Cloudinary if fileUrl exists
    if (material.fileUrl) {
      try {
        const publicId = extractPublicId(material.fileUrl);
        console.log('📎 Deleting Cloudinary file with publicId:', publicId);

        const result = await cloudinary.uploader.destroy(publicId, {
          type: 'authenticated', // if you're using signed URLs
          resource_type: material.fileType === 'pdf' ? 'raw' : 'auto', // 👈 Important!
        });

        console.log('☁️ Cloudinary destroy result:', result);

        if (result.result !== 'ok' && result.result !== 'not found') {
          throw new Error(`Unexpected Cloudinary response: ${result.result}`);
        }
      } catch (cloudinaryError) {
        console.warn('⚠️ Failed to delete from Cloudinary:', cloudinaryError);
      }
    }


    // ✅ Delete from database
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
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    const material = await StudyMaterial.findById(req.params.id);

    if (!material) {
      res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
      return;
    }

    // Check access level permissions
    const hasAccess =
      material.accessLevel === 'all' ||
      (material.accessLevel === 'tutor' && ['tutor', 'admin'].includes(req.user.role)) ||
      (material.accessLevel === 'admin' && req.user.role === 'admin');

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to access this material',
      });
      return;
    }

    // Increment download count
    material.downloadCount += 1;
    await material.save();

    try {
      const publicId = extractPublicId(material.fileUrl);
      if (!publicId) {
        throw new Error('Invalid file URL format');
      }

      // Generate a longer-lived signed URL for download (15 minutes)
      const signedUrl = generateSignedUrl(publicId, 15);

      res.json({
        success: true,
        data: {
          signedUrl,
          fileName: material.fileName,
        },
        message: 'Signed download link generated',
      });
    } catch (error) {
      console.error('Error generating download URL:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate download URL',
      });
    }
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
// @access  Private
export const getStudyMaterialCollections = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Require authentication for collections as well
    if (!req.user || req.user.status !== 'active') {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!['student', 'tutor', 'admin'].includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied',
      });
      return;
    }

    // Filter collections based on user access level
    const accessFilter: any = {
      $or: [{ accessLevel: 'all' }]
    };

    if (req.user.role === 'admin') {
      accessFilter.$or.push({ accessLevel: 'tutor' }, { accessLevel: 'admin' });
    } else if (req.user.role === 'tutor') {
      accessFilter.$or.push({ accessLevel: 'tutor' });
    }

    const collections = await StudyMaterial.distinct('collectionName', accessFilter);

    res.json({
      success: true,
      data: collections.filter(Boolean), // Remove null/undefined values
    });
  } catch (error) {
    console.error('Get study material collections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching collections',
    });
  }
};