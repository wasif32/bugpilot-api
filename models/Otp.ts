import mongoose, { Document, Schema } from "mongoose";

export interface OtpDocument extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
}

const otpSchema = new Schema<OtpDocument>({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

export default mongoose.model<OtpDocument>("Otp", otpSchema);
