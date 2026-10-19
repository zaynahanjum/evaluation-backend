import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/roles.middleware';
import { validate } from '../middleware/validate.middleware';

// Schemas
import { createUserSchema, updateUserSchema } from '../models/zod/user.schema';
import { createTeamSchema, updateTeamSchema, setTopTeamsSchema, updateParticipantSchema } from '../models/zod/team.schema';
import { createRoundSchema } from '../models/zod/round.schema';
import { createPanelSchema, addPanelMemberSchema, addPanelTeamsSchema } from '../models/zod/panel.schema';
import { createCriteriaSchema, updateCriteriaSchema } from '../models/zod/criteria.schema';
import { adminUpdateScoreSchema } from '../models/zod/score.schema';
import { submissionLockSchema } from '../models/zod/submission.schema';
import { createTimelineSchema, updateTimelineSchema } from '../models/zod/timeline.schema';

// Controllers
import * as users from '../controllers/admin/users.controller';
import * as teams from '../controllers/admin/teams.controller';
import * as rounds from '../controllers/admin/rounds.controller';
import * as panels from '../controllers/admin/panels.controller';
import * as criteria from '../controllers/admin/criteria.controller';
import * as scores from '../controllers/admin/scores.controller';
import * as results from '../controllers/admin/results.controller';
import * as submissions from '../controllers/admin/submissions.controller';
import * as timeline from '../controllers/admin/timeline.controller';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', results.getDashboard);

// ─── Users (Mentor / Judge accounts) ─────────────────────────────────────────
router.get('/users', users.listUsers);
router.post('/users', validate(createUserSchema), users.createUser);
router.get('/users/:id', users.getUser);
router.patch('/users/:id', validate(updateUserSchema), users.updateUser);
router.delete('/users/:id', users.deleteUser);

// ─── Teams ───────────────────────────────────────────────────────────────────
router.get('/teams', teams.listTeams);
router.post('/teams', validate(createTeamSchema), teams.createTeam);
router.post('/teams/top10', validate(setTopTeamsSchema), teams.setTopTeams);
router.get('/teams/:id', teams.getTeam);
router.patch('/teams/:id', validate(updateTeamSchema), teams.updateTeam);
router.delete('/teams/:id', teams.deleteTeam);
router.patch('/teams/:id/participants/:participantId', validate(updateParticipantSchema), teams.updateParticipant);

// ─── Rounds ──────────────────────────────────────────────────────────────────
router.get('/rounds', rounds.listRounds);
router.post('/rounds', validate(createRoundSchema), rounds.createRound);
router.get('/rounds/:id', rounds.getRound);
router.patch('/rounds/:id/start', rounds.startRound);
router.patch('/rounds/:id/end', rounds.endRound);
router.delete('/rounds/:id', rounds.deleteRound);

// ─── Criteria (per round) ─────────────────────────────────────────────────────
router.get('/rounds/:roundId/criteria', criteria.listCriteria);
router.post('/rounds/:roundId/criteria', validate(createCriteriaSchema), criteria.createCriteria);
router.patch('/criteria/:id', validate(updateCriteriaSchema), criteria.updateCriteria);
router.delete('/criteria/:id', criteria.deleteCriteria);

// ─── Panels ──────────────────────────────────────────────────────────────────
router.get('/rounds/:roundId/panels', panels.listPanels);
router.post('/rounds/:roundId/panels', validate(createPanelSchema), panels.createPanel);
router.get('/panels/:panelId', panels.getPanel);
router.delete('/panels/:panelId', panels.deletePanel);
router.post('/panels/:panelId/members', validate(addPanelMemberSchema), panels.addPanelMember);
router.delete('/panels/:panelId/members/:userId', panels.removePanelMember);
router.post('/panels/:panelId/teams', validate(addPanelTeamsSchema), panels.addPanelTeams);
router.delete('/panels/:panelId/teams/:teamId', panels.removePanelTeam);

// ─── Scores (admin view / edit) ───────────────────────────────────────────────
router.get('/rounds/:roundId/scores', scores.listRoundScores);
router.patch('/scores/:scoreId', validate(adminUpdateScoreSchema), scores.updateScore);
router.patch('/evaluations/:evaluationId/note', scores.updateEvaluationNote);

// ─── Results ─────────────────────────────────────────────────────────────────
router.get('/rounds/:roundId/results', results.getRoundResults);

// ─── Submissions ─────────────────────────────────────────────────────────────
router.get('/submissions', submissions.listSubmissions);
router.patch('/submissions/lock', validate(submissionLockSchema), submissions.setSubmissionLock);

// ─── Timeline ────────────────────────────────────────────────────────────────
router.get('/timeline', timeline.listTimeline);
router.post('/timeline', validate(createTimelineSchema), timeline.createTimeline);
router.patch('/timeline/:id', validate(updateTimelineSchema), timeline.updateTimeline);
router.delete('/timeline/:id', timeline.deleteTimeline);

export default router;
