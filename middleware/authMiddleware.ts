// backend/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User'; // Import your User model

interface JwtPayload {
  userId: string;
}

// Extend Request interface to include userId and user object
export interface AuthRequest extends Request {
  userId?: string;
  user?: IUser; // Add the full user object here, including its role
}

export const authMiddleware = async ( // Made async to fetch user
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => { // Changed return type to Promise<void>
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;
    
    // Fetch the user from the database and attach it to the request
    const user = await User.findById(decoded.userId).select('-password'); // Exclude password
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.userId = decoded.userId;
    req.user = user; // Attach the full user object
    next();
  } catch (error) {
    console.error("Auth middleware error:", error); // Log the error for debugging
    res.status(401).json({ message: 'Invalid token' });
  }
};