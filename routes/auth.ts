import { Router } from 'express';
import { login } from '../controllers/authController';
import { sendOtp, verifyOtpAndRegister } from '../controllers/otpController';

const router: Router = Router();
router.post('/login', login);

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtpAndRegister);

export default router;
