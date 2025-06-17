import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  project: mongoose.Types.ObjectId;
  assignees: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  screenshots: string[];
  comments: {
    user: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
  }[];
}

const TicketSchema = new Schema<ITicket>({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  // CHANGED: assignees is now an array of ObjectIds
  assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  screenshots: [{type: String}],
  comments: [
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true },
      createdAt: {type: Date, default: Date.now},
    }
  ]
}, {
  timestamps: true
});

export default mongoose.model<ITicket>('Ticket', TicketSchema);