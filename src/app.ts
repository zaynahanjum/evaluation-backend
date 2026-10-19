import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import evaluatorRoutes from './routes/evaluator.routes';
import teamRoutes from './routes/team.routes';

import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

app.use(helmet());

const allowedOrigins = (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed.`));
      }
    },
    credentials: true,
  }),
);

// ─── Body Parsing ────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server is healthy.', timestamp: new Date().toISOString() });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/evaluator', evaluatorRoutes);
app.use('/team', teamRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
