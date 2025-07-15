import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res
        .status(401)
        .json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JwtPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid token.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({
          success: false,
          message: 'Access denied. User not authenticated.',
        });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized.`,
      });
      return;
    }

    next();
  };
};

export const authorizeStudent = authorize('student');
export const authorizeTutor = authorize('tutor');
export const authorizeAdmin = authorize('admin');
export const authorizeTutorOrAdmin = authorize('tutor', 'admin');



export const createAdminUser = async (): Promise<void> => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('Admin user already exists.');
      return;
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 12); 

    const adminUser = new User({
      name: 'Admin',
      email: 'admin@eduverse.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      joinedDate: new Date(),
    });

    await adminUser.save();
    console.log('Admin user created successfully.');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};
