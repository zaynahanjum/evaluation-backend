import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireTeam } from '../middleware/roles.middleware';
import { validate } from '../middleware/validate.middleware';
import { upsertSubmissionSchema, finalSubmissionSchema } from '../models/zod/submission.schema';
import { changePasswordSchema } from '../models/zod/team.schema';

import * as teamAuth from '../controllers/team/auth.controller';
import * as submission from '../controllers/team/submission.controller';
import * as dorms from '../controllers/team/dorms.controller';
import * as timeline from '../controllers/team/timeline.controller';

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
