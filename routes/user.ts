import express from 'express';
const router = express.Router();
import { searchUsers } from '../controllers/userController';
import {authMiddleware} from '../middleware/authMiddleware';

// Search for users
router.get('/search', authMiddleware, searchUsers);

export default router;