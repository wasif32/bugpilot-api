import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import ticketRoutes from './routes/tickets';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Static File Serving Configuration with Logs ---
const staticUploadsPath = path.join(__dirname, 'uploads');// This is the path Express will try to serve from
app.use('/uploads', express.static(staticUploadsPath));
// --- End Static File Serving Configuration ---

// --- Route Registrations (Cleaned Duplicates) ---
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
// --- End Route Registrations ---

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || '';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('[DB CONNECT] MongoDB connected successfully.');
    app.listen(PORT, () => {
      console.log(`[SERVER START] Server running on port ${PORT}.`);
    });
  })
  .catch((err) => {
    console.error('[DB ERROR] MongoDB connection error:', err);
    // Optionally, exit the process if DB connection is critical for startup
    // process.exit(1);
  });