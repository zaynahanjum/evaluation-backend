import { Router } from 'express';
import { validate } from '../middleware/validate.middleware';
import { loginSchema, refreshSchema } from '../models/zod/auth.schema';
import { login, refresh, logout } from '../controllers/auth.controller';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', validate(refreshSchema), logout);

export default router;
