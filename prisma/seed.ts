import 'dotenv/config';
import { prisma, ensureAppSettings } from '../src/services/prisma.service';
import { hashPassword } from '../src/services/auth.service';

async function main() {
  console.log('🌱 Seeding database...');

  // Ensure singleton AppSettings
  await ensureAppSettings();

  // 1. Create Admin
  const adminPasswordHash = await hashPassword('adminpassword');
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Admin user ready: ${admin.username} (Password: adminpassword)`);

  // 2. Create Mentor
  const mentorPasswordHash = await hashPassword('password123');
  const mentor = await prisma.user.upsert({
    where: { username: 'mentor_1' },
    update: { passwordHash: mentorPasswordHash },
    create: {
      id: 'seed-mentor-1',
      username: 'mentor_1',
      passwordHash: mentorPasswordHash,
      role: 'MENTOR',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Mentor user ready: ${mentor.username} (Password: password123)`);

  // 3. Create Judge
  const judgePasswordHash = await hashPassword('password123');
  const judge = await prisma.user.upsert({
    where: { username: 'judge_1' },
    update: { passwordHash: judgePasswordHash },
    create: {
      id: 'seed-judge-1',
      username: 'judge_1',
      passwordHash: judgePasswordHash,
      role: 'JUDGE',
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✅ Judge user ready: ${judge.username} (Password: password123)`);

  // 4. Create Team
  const teamPasswordHash = await hashPassword('password123');
  const team = await prisma.team.upsert({
    where: { username: 'team_alpha' },
    update: { passwordHash: teamPasswordHash },
    create: {
      id: 'seed-team-1',
      username: 'team_alpha',
      passwordHash: teamPasswordHash,
      name: 'Team Alpha',
      isActive: true,
      mustChangePassword: false,
      participants: {
        create: [
          { id: 'seed-participant-1', name: 'Alice Smith', hotelNo: 'Hotel Grand', roomName: '101' },
          { id: 'seed-participant-2', name: 'Bob Jones', hotelNo: 'Hotel Grand', roomName: '102' },
        ],
      },
    },
  });
  console.log(`✅ Team ready: ${team.name} / username: ${team.username} (Password: password123)`);

  // 5. Create Active Round
  const round = await prisma.round.upsert({
    where: { id: 'seed-round-1' },
    update: { status: 'ACTIVE' },
    create: {
      id: 'seed-round-1',
      name: 'Round 1 - Mentoring',
      type: 'MENTORING',
      roundNumber: 1,
      status: 'ACTIVE',
      startedAt: new Date(),
    },
  });
  console.log(`✅ Active Round ready: ${round.name} (${round.id})`);

  // 6. Create Criterion
  const criterion = await prisma.evaluationCriteria.upsert({
    where: { id: 'seed-criterion-1' },
    update: { name: 'Innovation & Impact' },
    create: {
      id: 'seed-criterion-1',
      name: 'Innovation & Impact',
      description: 'Novelty of solution and potential impact',
      maxScore: 10,
      roundId: round.id,
    },
  });
  console.log(`✅ Criterion ready: ${criterion.name} (${criterion.id})`);

  // 7. Create Panel
  const panel = await prisma.panel.upsert({
    where: { id: 'seed-panel-1' },
    update: { name: 'Panel A' },
    create: {
      id: 'seed-panel-1',
      name: 'Panel A',
      roundId: round.id,
    },
  });
  console.log(`✅ Panel ready: ${panel.name} (${panel.id})`);

  // 8. Assign Mentor to Panel
  await prisma.panelMember.upsert({
    where: { panelId_userId: { panelId: panel.id, userId: mentor.id } },
    update: {},
    create: {
      panelId: panel.id,
      userId: mentor.id,
    },
  });
  console.log(`✅ Assigned mentor ${mentor.username} to panel ${panel.name}`);

  // 9. Assign Team to Panel
  await prisma.panelTeam.upsert({
    where: { panelId_teamId: { panelId: panel.id, teamId: team.id } },
    update: {},
    create: {
      panelId: panel.id,
      teamId: team.id,
    },
  });
  // 10. Create Evaluation & Score for testing
  const evaluation = await prisma.evaluatorTeamEvaluation.upsert({
    where: {
      evaluatorId_teamId_roundId: {
        evaluatorId: mentor.id,
        teamId: team.id,
        roundId: round.id,
      },
    },
    update: {},
    create: {
      id: 'seed-evaluation-1',
      evaluatorId: mentor.id,
      teamId: team.id,
      roundId: round.id,
      note: 'Great technical architecture and demo.',
      isConfirmed: false,
    },
  });
  console.log(`✅ Evaluation ready: (${evaluation.id})`);

  const score = await prisma.score.upsert({
    where: {
      criterionId_evaluationId: {
        criterionId: criterion.id,
        evaluationId: evaluation.id,
      },
    },
    update: {},
    create: {
      id: 'seed-score-1',
      criterionId: criterion.id,
      evaluationId: evaluation.id,
      value: 8.5,
    },
  });
  console.log(`✅ Score ready: (${score.id})`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
