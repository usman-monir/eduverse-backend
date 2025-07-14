import { Request, Response } from 'express';
import { Subject, ISubject } from '../models/Subject';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Get all subjects (with filters)
// @route   GET /api/subjects
// @access  Public
export const getSubjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { category, isActive, search, page = 1, limit = 50 } = req.query;

    const filter: any = {};

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { description: { $regex: search as string, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const subjects = await Subject.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Subject.countDocuments(filter);

    res.json({
      success: true,
      data: subjects,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subjects',
    });
  }
};

// @desc    Get subject by ID
// @route   GET /api/subjects/:id
// @access  Public
export const getSubjectById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    res.json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error('Get subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching subject',
    });
  }
};

// @desc    Create new subject
// @route   POST /api/subjects
// @access  Private (Admin only)
export const createSubject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description, category } = req.body;

    // Check if subject already exists
    const existingSubject = await Subject.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingSubject) {
      res.status(400).json({
        success: false,
        message: 'Subject with this name already exists',
      });
      return;
    }

    const subject = new Subject({
      name,
      description,
      category,
    });

    await subject.save();

    res.status(201).json({
      success: true,
      data: subject,
      message: 'Subject created successfully',
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating subject',
    });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin only)
export const updateSubject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, description, category, isActive } = req.body;

    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    // Check if new name conflicts with existing subject (excluding current subject)
    if (name && name !== subject.name) {
      const existingSubject = await Subject.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (existingSubject) {
        res.status(400).json({
          success: false,
          message: 'Subject with this name already exists',
        });
        return;
      }
    }

    // Update fields
    if (name) subject.name = name;
    if (description !== undefined) subject.description = description;
    if (category) subject.category = category;
    if (isActive !== undefined) subject.isActive = isActive;

    await subject.save();

    res.json({
      success: true,
      data: subject,
      message: 'Subject updated successfully',
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating subject',
    });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin only)
export const deleteSubject = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    // Check if subject is being used by any tutors
    const { User } = await import('../models/User');
    const tutorsUsingSubject = await User.countDocuments({
      subjects: { $in: [subject.name] }
    });

    if (tutorsUsingSubject > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete subject. It is being used by ${tutorsUsingSubject} tutor(s).`,
      });
      return;
    }

    await Subject.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting subject',
    });
  }
};

// @desc    Toggle subject active status
// @route   PUT /api/subjects/:id/toggle
// @access  Private (Admin only)
export const toggleSubjectStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
      return;
    }

    subject.isActive = !subject.isActive;
    await subject.save();

    res.json({
      success: true,
      data: subject,
      message: `Subject ${subject.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Toggle subject status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling subject status',
    });
  }
}; 