import dotenv from 'dotenv';
dotenv.config();

export const {
  EMAIL_USER,
  EMAIL_PASS,
  MONGO_URI,
  PORT,
  JWT_SECRET,
} = process.env;
