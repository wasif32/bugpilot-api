import { Request, Response } from "express"
import Otp from "../models/Otp";
import User from "../models/User";
import nodemailer from "nodemailer";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { EMAIL_USER, EMAIL_PASS } from '../config/env';

// ✅ Step 2: Setup transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER!,
    pass: EMAIL_PASS!,
  },
});

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`Generated OTP: ${otp} for email: ${email}`);

    const updatedOtp = await Otp.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );
    console.log("OTP record saved:", updatedOtp);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    };

    console.log("Sending email with options:", mailOptions);

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");

    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    res.status(500).json({ message: "Failed to send OTP", error });
  }
};

export const verifyOtpAndRegister = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { name, email, password, otp } = req.body;

  try {
    const otpRecord = await Otp.findOne({ email });
    console.log("OTP record found:", otpRecord);

    if (!otpRecord || otpRecord.otp !== otp || otpRecord.expiresAt < new Date()) {
      console.warn("Invalid or expired OTP attempt for:", email);
      res.status(400).json({ message: "Invalid or expired OTP" });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.warn("Attempted registration with existing email:", email);
      res.status(400).json({ message: "User already exists" });
      return;
    }
       const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: hashedPassword });
       await user.save();
   
       const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', {
         expiresIn: '7d',
       });
   
       res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
     } catch (error) {
       res.status(500).json({ message: 'Server error' });
     }
};
