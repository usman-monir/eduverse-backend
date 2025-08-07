// upload.ts
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// ✅ Cloudinary config (uses .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ✅ Cloudinary storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req: any, file: Express.Multer.File) => {
    const collection = req.body.collectionName?.trim() || 'uncategorized';

    return {
      folder: `study-materials/${collection}`, // ✅ dynamic folder
      resource_type: 'raw',
      use_filename: true,
      unique_filename: false,
      type: 'authenticated',
      access_mode: 'authenticated',
    };
  },
});


// ✅ Allowed MIME types
const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
  'video/ogg',
  'video/webm',
];

// ✅ File filter
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG, MP4, OGG, WEBM are allowed.'
      )
    );
  }
};

// ✅ Final Multer config
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    files: 1,
  },
});

// ✅ Error handler
export const handleUploadError = (
  error: any,
  req: any,
  res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.',
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only 1 file allowed per request.',
      });
    }
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
};

// ✅ Export cloudinary for use in controllers
export { cloudinary };
