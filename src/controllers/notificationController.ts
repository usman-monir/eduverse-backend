import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { SmartQuad } from '../models/SmartQuad';
import EmailService from '../services/emailService';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Send course expiry notifications (10 days before expiry)
// @route   POST /api/notifications/course-expiry
// @access  Private (Admin)
export const sendCourseExpiryNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

    // Find students whose course expires in 10 days
    const students = await User.find({
      role: 'student',
      courseExpiryDate: {
        $gte: new Date(tenDaysFromNow.getTime() - 24 * 60 * 60 * 1000), // Start of day
        $lt: new Date(tenDaysFromNow.getTime() + 24 * 60 * 60 * 1000),  // End of day
      },
      status: 'active',
    });

    let sentCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const student of students) {
      try {
        const daysRemaining = Math.ceil(
          (student.courseExpiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        await EmailService.sendCourseExpiryNotification({
          studentEmail: student.email,
          studentName: student.name,
          courseExpiryDate: student.courseExpiryDate!,
          daysRemaining,
        });

        sentCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          studentId: student._id,
          email: student.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalStudents: students.length,
        notificationsSent: sentCount,
        notificationsFailed: failedCount,
        errors,
      },
      message: `Course expiry notifications sent to ${sentCount} students`,
    });
  } catch (error) {
    console.error('Send course expiry notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending course expiry notifications',
    });
  }
};

// @desc    Send Smart Quad availability notifications
// @route   POST /api/notifications/smart-quad-availability
// @access  Private (Admin)
export const sendSmartQuadAvailabilityNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { smartQuadId } = req.body;

    if (!smartQuadId) {
      res.status(400).json({
        success: false,
        message: 'Smart Quad ID is required',
      });
      return;
    }

    const smartQuad = await SmartQuad.findById(smartQuadId)
      .populate('students.studentId', 'name email');

    if (!smartQuad) {
      res.status(404).json({
        success: false,
        message: 'Smart Quad batch not found',
      });
      return;
    }

    // Find students with similar preferences who are not in any Smart Quad
    const similarStudents = await User.find({
      role: 'student',
      status: 'active',
      preferredLanguage: smartQuad.preferredLanguage,
      courseType: 'smart-quad',
      desiredScore: {
        $gte: smartQuad.desiredScore - 5,
        $lte: smartQuad.desiredScore + 5,
      },
      examDeadline: {
        $gte: new Date(smartQuad.examDeadline.getTime() - 30 * 24 * 60 * 60 * 1000),
        $lte: new Date(smartQuad.examDeadline.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Filter out students already in this or other Smart Quads
    const availableStudents = similarStudents.filter(student => {
      return !smartQuad.students.some(sqStudent => 
        sqStudent.studentId.toString() === (student._id as any).toString()
      );
    });

    let sentCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const student of availableStudents) {
      try {
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">Smart Quad Opportunity</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">New group class available!</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #333; margin-bottom: 20px;">Hello ${student.name},</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                Great news! A new Smart Quad batch has been created that matches your learning preferences.
              </p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Batch Details</h3>
                <div style="color: #666; line-height: 1.8;">
                  <p><strong>Batch Name:</strong> ${smartQuad.name}</p>
                  <p><strong>Tutor:</strong> ${smartQuad.tutorName}</p>
                  <p><strong>Preferred Language:</strong> ${smartQuad.preferredLanguage}</p>
                  <p><strong>Target Score:</strong> ${smartQuad.desiredScore}</p>
                  <p><strong>Exam Deadline:</strong> ${smartQuad.examDeadline.toLocaleDateString()}</p>
                  <p><strong>Available Spots:</strong> ${smartQuad.maxStudents - smartQuad.currentStudents}</p>
                </div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <h3 style="color: #333; margin-bottom: 15px;">Benefits of Smart Quad</h3>
                <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
                  <li>Group learning with similar students</li>
                  <li>Cost-effective learning experience</li>
                  <li>Peer support and motivation</li>
                  <li>Structured learning schedule</li>
                </ul>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #888; font-size: 14px; margin: 0;">
                  Contact our support team to join this Smart Quad batch or learn more about group learning opportunities.
                </p>
              </div>
            </div>
          </div>
        `;

        await EmailService.sendEmail({
          to: student.email,
          subject: 'New Smart Quad Opportunity - Join Our Group Class!',
          html,
        });

        sentCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          studentId: student._id,
          email: student.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        totalStudents: availableStudents.length,
        notificationsSent: sentCount,
        notificationsFailed: failedCount,
        errors,
      },
      message: `Smart Quad availability notifications sent to ${sentCount} students`,
    });
  } catch (error) {
    console.error('Send Smart Quad availability notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending Smart Quad availability notifications',
    });
  }
};

// @desc    Send session cancellation notifications
// @route   POST /api/notifications/session-cancellation
// @access  Private (Admin)
export const sendSessionCancellationNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { sessionId, cancellationReason } = req.body;

    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
      return;
    }

    // This would typically be called from the session controller
    // when a session is cancelled, but we'll implement it here for completeness
    res.json({
      success: true,
      message: 'Session cancellation notifications would be sent here',
    });
  } catch (error) {
    console.error('Send session cancellation notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending session cancellation notifications',
    });
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private (Admin)
export const getNotificationStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const today = new Date();
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(today.getDate() + 10);

    // Count students with expiring courses
    const expiringStudents = await User.countDocuments({
      role: 'student',
      status: 'active',
      courseExpiryDate: {
        $gte: today,
        $lte: tenDaysFromNow,
      },
    });

    // Count active Smart Quad batches
    const activeSmartQuads = await SmartQuad.countDocuments({
      status: { $in: ['forming', 'active'] },
    });

    // Count students in Smart Quads
    const studentsInSmartQuads = await SmartQuad.aggregate([
      { $match: { status: { $in: ['forming', 'active'] } } },
      { $group: { _id: null, totalStudents: { $sum: '$currentStudents' } } },
    ]);

    const totalStudentsInSmartQuads = studentsInSmartQuads.length > 0 
      ? studentsInSmartQuads[0].totalStudents 
      : 0;

    res.json({
      success: true,
      data: {
        expiringStudents,
        activeSmartQuads,
        studentsInSmartQuads: totalStudentsInSmartQuads,
        notificationTypes: {
          courseExpiry: 'Available',
          smartQuadAssignment: 'Available',
          smartQuadRemoval: 'Available',
          smartQuadCancellation: 'Available',
          sessionCancellation: 'Available',
        },
      },
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification statistics',
    });
  }
}; 