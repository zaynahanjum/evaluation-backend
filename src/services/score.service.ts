import { prisma } from './prisma.service';

export interface CriterionResult {
  criterionId: string;
  criterionName: string;
  maxScore: number;
  avgScore: number;       // average across all evaluators in the panel
  confirmedCount: number; // how many evaluators submitted this criterion
}

export interface TeamRoundResult {
  teamId: string;
  teamName: string;
  isConfirmedByAll: boolean;
  confirmedEvaluators: number;
  totalEvaluators: number;
  criteriaResults: CriterionResult[];
  totalAvgScore: number;  // sum of all criterion averages
}

/**
 * Calculate per-team average and total scores for a given round.
 * Averages are computed across all confirmed evaluations for each criterion.
 */
export async function calculateRoundResults(roundId: string): Promise<TeamRoundResult[]> {
  // Load all evaluations for the round, with scores and team info
  const evaluations = await prisma.evaluatorTeamEvaluation.findMany({
    where: { roundId },
    include: {
      team: { select: { id: true, name: true } },
      scores: {
        include: {
          criterion: { select: { id: true, name: true, maxScore: true } },
        },
      },
    },
  });

  // Count total evaluators assigned to teams in this round (via panels)
  const panels = await prisma.panel.findMany({
    where: { roundId },
    include: {
      members: true,
      teams: true,
    },
  });

  // Build a map: teamId → set of evaluatorIds assigned to that team
  const teamEvaluatorMap = new Map<string, Set<string>>();
  for (const panel of panels) {
    for (const pt of panel.teams) {
      const existing = teamEvaluatorMap.get(pt.teamId) ?? new Set<string>();
      for (const pm of panel.members) {
        existing.add(pm.userId);
      }
      teamEvaluatorMap.set(pt.teamId, existing);
    }
  }

  // Group evaluations by team
  const byTeam = new Map<string, typeof evaluations>();
  for (const ev of evaluations) {
    const arr = byTeam.get(ev.teamId) ?? [];
    arr.push(ev);
    byTeam.set(ev.teamId, arr);
  }

  const results: TeamRoundResult[] = [];

  for (const [teamId, teamEvaluations] of byTeam) {
    const firstEvaluation = teamEvaluations[0];
    if (!firstEvaluation) continue;

    const teamName = firstEvaluation.team.name;
    const assignedEvaluators = teamEvaluatorMap.get(teamId) ?? new Set<string>();
    const totalEvaluators = assignedEvaluators.size;
    const confirmedEvaluators = teamEvaluations.filter(e => e.isConfirmed).length;

    // Group scores by criterion across all evaluators
    const criterionMap = new Map<string, { name: string; maxScore: number; values: number[] }>();
    for (const ev of teamEvaluations) {
      for (const score of ev.scores) {
        const existing = criterionMap.get(score.criterionId);
        if (existing) {
          existing.values.push(score.value);
        } else {
          criterionMap.set(score.criterionId, {
            name: score.criterion.name,
            maxScore: score.criterion.maxScore,
            values: [score.value],
          });
        }
      }
    }

    const criteriaResults: CriterionResult[] = [];
    let totalAvgScore = 0;

    for (const [criterionId, data] of criterionMap) {
      const count = data.values.length;
      const sum = data.values.reduce((a: number, b: number) => a + b, 0);
      const avg = count > 0 ? sum / count : 0;
      totalAvgScore += avg;
      criteriaResults.push({
        criterionId,
        criterionName: data.name,
        maxScore: data.maxScore,
        avgScore: parseFloat(avg.toFixed(2)),
        confirmedCount: count,
      });
    }

    results.push({
      teamId,
      teamName,
      isConfirmedByAll: confirmedEvaluators === totalEvaluators && totalEvaluators > 0,
      confirmedEvaluators,
      totalEvaluators,
      criteriaResults,
      totalAvgScore: parseFloat(totalAvgScore.toFixed(2)),
    });
  }

  // Sort by totalAvgScore descending
  results.sort((a, b) => b.totalAvgScore - a.totalAvgScore);

  return results;
}
