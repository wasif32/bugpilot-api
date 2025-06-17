// backend/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role?: 'Admin' | 'User'; // Added a global role for the user
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { // Add a global role field
    type: String,
    enum: ['Admin', 'User'], // Define global roles
    default: 'User',
  },
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);