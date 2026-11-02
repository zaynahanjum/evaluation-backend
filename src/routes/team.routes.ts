import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireTeam } from '../middleware/roles.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { upsertSubmissionSchema, finalSubmissionSchema } from '../models/zod/submission.schema.js';
import { changePasswordSchema } from '../models/zod/team.schema.js';

import * as teamAuth from '../controllers/team/auth.controller.js';
import * as submission from '../controllers/team/submission.controller.js';
import * as dorms from '../controllers/team/dorms.controller.js';
import * as timeline from '../controllers/team/timeline.controller.js';

const router = Router();

// All team routes require authentication + TEAM role
router.use(authenticate, requireTeam);

// ─── Profile & Auth ──────────────────────────────────────────────────────────
router.get('/me', teamAuth.getMe);
router.post('/auth/change-password', validate(changePasswordSchema), teamAuth.changePassword);

// ─── Submission ──────────────────────────────────────────────────────────────
router.get('/submission', submission.getSubmission);
router.post('/submission', validate(upsertSubmissionSchema), submission.upsertSubmission);
router.post('/submission/final', validate(finalSubmissionSchema), submission.finalSubmit);

// ─── Dorms / Accommodation ───────────────────────────────────────────────────
router.get('/dorms', dorms.getDorms);

// ─── Timeline ────────────────────────────────────────────────────────────────
router.get('/timeline', timeline.getTimeline);

export default router;
