import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  content: string;
  ticket: mongoose.Types.ObjectId; // References the ticket this comment belongs to
  createdBy: mongoose.Types.ObjectId; // References the user who created the comment
}

const CommentSchema = new Schema<IComment>({
    content: { type: String, required: true, trim: true },
    ticket: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  }, {
    timestamps: true
  });
  
  export default mongoose.model<IComment>('Comment', CommentSchema);