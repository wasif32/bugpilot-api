import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  // NEW: Array to store project members and their roles
  members: Array<{
    user: mongoose.Types.ObjectId;
    role: 'admin' | 'developer' | 'viewer'; // Or define more granular roles
  }>;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // NEW: Project members array
  members: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      role: {
        type: String,
        enum: ['admin', 'developer', 'viewer'], // Define roles here
        default: 'developer',
        required: true,
      },
    },
  ],
}, {
  timestamps: true
});

// Add a pre-find middleware to automatically populate related user data
ProjectSchema.pre(/^find/, function (this: mongoose.Query<any, IProject>, next) {
  this.populate('createdBy', 'name email').populate({
    path: 'members.user',
    select: 'name email', // Select specific fields from the User model for members
  });
  next();
});



export default mongoose.model<IProject>('Project', ProjectSchema);