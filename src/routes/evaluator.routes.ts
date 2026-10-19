import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireEvaluator } from '../middleware/roles.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  submitScoresSchema,
  patchScoresSchema,
  evaluatorUpdateScoreSchema,
} from '../models/zod/score.schema';

import * as rounds from '../controllers/evaluator/rounds.controller';
import * as teams from '../controllers/evaluator/teams.controller';
import * as scores from '../controllers/evaluator/scores.controller';

const router = Router();

// All evaluator routes require authentication + MENTOR or JUDGE role
router.use(authenticate, requireEvaluator);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/me', rounds.getMe);

// ─── Rounds ──────────────────────────────────────────────────────────────────
// Returns only ACTIVE rounds where this evaluator has a panel assignment
router.get('/rounds', rounds.getMyRounds);

// ─── Teams & Scoring (per round) ─────────────────────────────────────────────
router.get('/rounds/:roundId/teams', teams.getMyTeams);
router.post('/rounds/:roundId/teams/:teamId/scores', validate(submitScoresSchema), scores.submitScores);
router.patch('/rounds/:roundId/teams/:teamId/scores', validate(patchScoresSchema), scores.patchScores);
router.patch('/scores/:scoreId', validate(evaluatorUpdateScoreSchema), scores.updateScore);

export default router;
