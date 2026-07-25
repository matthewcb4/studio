import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getServerFirestore } from '@/firebase/server';
import { suggestWorkoutSetup } from '@/ai/flows/suggest-workout-flow';
import { askCoach } from '@/ai/flows/coach-chat-flow';
import { suggestExerciseSwaps } from '@/ai/flows/swap-exercise-flow';
import { randomUUID } from 'crypto';

// ─── MCP Streamable HTTP Transport ───────────────────────────────────────────
// Gemini Spark requires the "Streamable HTTP" transport (MCP spec 2025-03-26).
// Single-endpoint, stateless JSON-RPC protocol over POST.
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, x-user-id',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id',
};

function jsonResponse(data: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(data, {
    status,
    headers: { ...CORS_HEADERS, ...extraHeaders },
  });
}

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ─── GET (SSE keepalive for server-initiated notifications — optional) ───────
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': ok\n\n'));
    },
    cancel() {},
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', ...CORS_HEADERS },
  });
}

// ─── DELETE (session termination) ────────────────────────────────────────────
export async function DELETE() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function getAuthenticatedUserId(req: NextRequest, required: boolean): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await getAuth().verifyIdToken(authHeader.substring(7));
      if (decoded?.uid) return decoded.uid;
    } catch (err) {
      console.error('Token verification error:', err);
    }
  }
  const id = req.nextUrl.searchParams.get('userId') || req.headers.get('x-user-id') || '';
  if (!id && required) throw new Error('Unauthorized: Provide userId query param or Bearer token.');
  return id;
}

// ─── MCP Tool Definitions (14 tools) ─────────────────────────────────────────
const MCP_TOOLS = [
  // ── Original 4 tools ──────────────────────────────────────────────────────
  {
    name: 'get_workout_history',
    description: 'Retrieves recent logged workouts including exercises, weights, reps, dates, volumes, and ratings.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max workouts to retrieve (default 10, max 50)' },
      },
    },
  },
  {
    name: 'get_user_stats',
    description: "Retrieves the user's profile: streak, XP, level, lifetime volume, weekly/monthly/all-time leaderboard stats, and fitness goals.",
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'suggest_workout',
    description: "AI-powered workout suggestion based on fitness goals, recent history, and weekly progress.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        fitnessGoals: { type: 'array', items: { type: 'string' }, description: 'e.g. Build Muscle, Strength, Cardio' },
        weeklyWorkoutGoal: { type: 'number', description: 'Target workouts per week (1-7)' },
        workoutsThisWeek: { type: 'number', description: 'Workouts completed this week so far' },
      },
      required: ['fitnessGoals', 'weeklyWorkoutGoal', 'workoutsThisWeek'],
    },
  },
  {
    name: 'log_workout',
    description: 'Logs a completed workout with exercises, sets, weights, reps, duration, and optional cardio metrics.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workoutName: { type: 'string', description: 'e.g. Upper Body Focus, Evening Run' },
        duration: { type: 'string', description: 'e.g. "45 min"' },
        activityType: { type: 'string', enum: ['resistance', 'calisthenics', 'run', 'walk', 'cycle', 'hiit'] },
        rating: { type: 'number', minimum: 1, maximum: 5 },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              exerciseName: { type: 'string' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    reps: { type: 'number' },
                    weight: { type: 'number' },
                    duration: { type: 'number', description: 'seconds' },
                    type: { type: 'string', enum: ['normal', 'warmup', 'drop', 'failure'] },
                  },
                },
              },
            },
            required: ['exerciseName', 'sets'],
          },
        },
        volume: { type: 'number', description: 'Total lbs (auto-calculated if omitted)' },
        cardioMetrics: {
          type: 'object',
          properties: {
            distance: { type: 'number' },
            distanceUnit: { type: 'string', enum: ['mi', 'km'] },
            avgPace: { type: 'string' },
            avgHeartRate: { type: 'number' },
            calories: { type: 'number' },
          },
        },
      },
      required: ['workoutName', 'duration', 'activityType'],
    },
  },

  // ── NEW: Analytics & Insights ─────────────────────────────────────────────
  {
    name: 'get_exercise_progress',
    description: 'Tracks a specific exercise over time: weight trend, estimated 1RM (Epley formula), and volume progression across sessions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        exerciseName: { type: 'string', description: 'Name of the exercise to track (e.g. "Bench Press")' },
        limit: { type: 'number', description: 'Max sessions to analyze (default 20)' },
      },
      required: ['exerciseName'],
    },
  },
  {
    name: 'get_personal_records',
    description: 'Returns personal records (PRs) for each exercise: heaviest weight, most reps in a single set, and highest single-set volume.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        exerciseName: { type: 'string', description: 'Optional: filter to a specific exercise' },
      },
    },
  },
  {
    name: 'get_weekly_summary',
    description: "Full weekly recap: workouts completed vs target, total volume, cardio minutes, distance, streak status, and XP earned.",
    inputSchema: { type: 'object' as const, properties: {} },
  },

  // ── NEW: Exercise Library ─────────────────────────────────────────────────
  {
    name: 'search_exercises',
    description: 'Search the exercise library by name or muscle group. Returns matching exercises with target muscles and equipment.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search term (exercise name or muscle group)' },
        activityType: { type: 'string', enum: ['resistance', 'calisthenics', 'run', 'walk', 'cycle', 'hiit'], description: 'Optional filter' },
      },
      required: ['query'],
    },
  },

  // ── NEW: AI-Powered ───────────────────────────────────────────────────────
  {
    name: 'coach_chat',
    description: 'Have an AI coaching conversation. Ask questions about training, nutrition, form, recovery, or get motivational support.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'Your message to the AI coach' },
        fitnessGoals: { type: 'array', items: { type: 'string' }, description: 'Optional context about your goals' },
        recentWorkoutsSummary: { type: 'string', description: 'Optional summary of recent workouts for context' },
      },
      required: ['message'],
    },
  },
  {
    name: 'swap_exercise',
    description: 'Get 3 alternative exercises that target the same muscles, based on available equipment and biomechanical compatibility.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        exerciseName: { type: 'string', description: 'The exercise you want to swap out' },
        targetMuscleGroup: { type: 'string', description: 'Primary muscle group (e.g. "Chest", "Quadriceps")' },
        availableEquipment: { type: 'array', items: { type: 'string' }, description: 'Equipment you have (e.g. ["Dumbbells", "Bench", "Cable Machine"])' },
        fitnessGoals: { type: 'array', items: { type: 'string' }, description: 'Optional goals for better recommendations' },
      },
      required: ['exerciseName', 'targetMuscleGroup', 'availableEquipment'],
    },
  },

  // ── NEW: Goal Management ──────────────────────────────────────────────────
  {
    name: 'update_fitness_goals',
    description: 'Update fitness goals, target weight, weekly workout target, weekly cardio goal, or weekly distance goal.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        targetWeight: { type: 'number', description: 'Target body weight in lbs' },
        weeklyWorkoutGoal: { type: 'number', description: 'Target workouts per week (1-7)' },
        weeklyCardioGoal: { type: 'number', description: 'Target cardio minutes per week' },
        weeklyDistanceGoal: { type: 'number', description: 'Target distance in miles per week' },
        strengthGoal: { type: 'string', description: 'Strength goal description' },
        muscleGoal: { type: 'string', description: 'Muscle building goal description' },
        fatLossGoal: { type: 'string', description: 'Fat loss goal description' },
      },
    },
  },

  // ── NEW: Body Weight Tracking ─────────────────────────────────────────────
  {
    name: 'log_body_weight',
    description: 'Log a body weight measurement for today.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        weight: { type: 'number', description: 'Body weight in lbs' },
        date: { type: 'string', description: 'Optional ISO date string (defaults to today)' },
      },
      required: ['weight'],
    },
  },
  {
    name: 'get_body_weight_history',
    description: 'Retrieve body weight measurements over time to track trends.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max entries to retrieve (default 30)' },
      },
    },
  },

  // ── NEW: Leaderboard ──────────────────────────────────────────────────────
  {
    name: 'get_leaderboard',
    description: "View leaderboard rankings. Shows the user's position and top performers across metrics like volume, workout count, and XP.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        metric: { type: 'string', enum: ['totalVolume', 'workoutCount', 'activeDays', 'xpEarned', 'cardioMinutes', 'personalRecords'], description: 'Leaderboard metric (default: totalVolume)' },
        period: { type: 'string', enum: ['weekly', 'monthly', 'alltime'], description: 'Time period (default: weekly)' },
      },
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────
async function executeTool(name: string, args: any, userId: string) {
  const firestore = getServerFirestore();

  switch (name) {
    // ── Original tools ────────────────────────────────────────────────────
    case 'get_workout_history': {
      const limitVal = Math.min(args?.limit || 10, 50);
      const snap = await firestore.collection('users').doc(userId).collection('workoutLogs')
        .orderBy('date', 'desc').limit(limitVal).get();
      return { content: [{ type: 'text', text: JSON.stringify(snap.docs.map(d => ({ id: d.id, ...d.data() })), null, 2) }] };
    }

    case 'get_user_stats': {
      const doc = await firestore.doc(`users/${userId}/profile/main`).get();
      if (!doc.exists) return { content: [{ type: 'text', text: 'No profile found.' }] };
      return { content: [{ type: 'text', text: JSON.stringify(doc.data(), null, 2) }] };
    }

    case 'suggest_workout': {
      const histSnap = await firestore.collection('users').doc(userId).collection('workoutLogs')
        .orderBy('date', 'desc').limit(7).get();
      const recentHistory = histSnap.docs.map(d => {
        const data = d.data();
        return {
          date: data.date, name: data.workoutName, volume: data.volume || 0,
          muscleGroups: data.exercises?.flatMap((e: any) => e.targetMuscles || []) || [],
          activityType: data.activityType || 'resistance', duration: data.duration,
        };
      });
      const suggestion = await suggestWorkoutSetup({
        fitnessGoals: args.fitnessGoals || [], workoutHistory: recentHistory,
        weeklyWorkoutGoal: args.weeklyWorkoutGoal, workoutsThisWeek: args.workoutsThisWeek,
      });
      return { content: [{ type: 'text', text: JSON.stringify(suggestion, null, 2) }] };
    }

    case 'log_workout': {
      const { workoutName, duration, activityType, rating, exercises, volume, cardioMetrics } = args;
      let calcVol = volume || 0;
      if (!volume && exercises?.length) {
        calcVol = exercises.reduce((t: number, ex: any) =>
          t + (ex.sets || []).reduce((s: number, set: any) =>
            set.type === 'warmup' ? s : s + (set.weight || 0) * (set.reps || 0), 0), 0);
      }
      const doc = {
        userId, workoutName, date: new Date().toISOString(), duration,
        activityType: activityType || 'resistance', volume: calcVol, rating: rating || null,
        ...(exercises ? { exercises } : {}), ...(cardioMetrics ? { cardioMetrics } : {}),
      };
      const ref = await firestore.collection('users').doc(userId).collection('workoutLogs').add(doc);
      return { content: [{ type: 'text', text: `Logged "${workoutName}" (ID: ${ref.id}, volume: ${calcVol} lbs).` }] };
    }

    // ── get_exercise_progress ─────────────────────────────────────────────
    case 'get_exercise_progress': {
      const exerciseName = (args.exerciseName || '').toLowerCase();
      const limit = Math.min(args?.limit || 20, 50);
      const snap = await firestore.collection('users').doc(userId).collection('workoutLogs')
        .orderBy('date', 'desc').limit(200).get();

      const sessions: any[] = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        const matchingExercises = (data.exercises || []).filter(
          (e: any) => (e.exerciseName || '').toLowerCase().includes(exerciseName)
        );
        if (matchingExercises.length === 0) continue;

        for (const ex of matchingExercises) {
          const sets = (ex.sets || []).filter((s: any) => s.type !== 'warmup');
          if (sets.length === 0) continue;

          const maxWeight = Math.max(...sets.map((s: any) => s.weight || 0));
          const bestSet = sets.reduce((best: any, s: any) => {
            const vol = (s.weight || 0) * (s.reps || 0);
            return vol > (best.weight || 0) * (best.reps || 0) ? s : best;
          }, sets[0]);

          const est1RM = bestSet.weight && bestSet.reps
            ? Math.round(bestSet.weight * (1 + bestSet.reps / 30))
            : null;

          const totalVolume = sets.reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 0), 0);

          sessions.push({
            date: data.date,
            exerciseName: ex.exerciseName,
            maxWeight,
            bestSet: { weight: bestSet.weight, reps: bestSet.reps },
            estimated1RM: est1RM,
            totalVolume,
            setCount: sets.length,
          });
        }
        if (sessions.length >= limit) break;
      }

      sessions.reverse(); // chronological order
      return { content: [{ type: 'text', text: JSON.stringify({
        exercise: args.exerciseName, sessionsFound: sessions.length, progression: sessions,
      }, null, 2) }] };
    }

    // ── get_personal_records ──────────────────────────────────────────────
    case 'get_personal_records': {
      const filterName = args?.exerciseName ? (args.exerciseName as string).toLowerCase() : null;
      const snap = await firestore.collection('users').doc(userId).collection('workoutLogs')
        .orderBy('date', 'desc').get();

      const prs: Record<string, { heaviestWeight: number; mostReps: number; highestVolume: number; heaviestDate: string; mostRepsDate: string; highestVolumeDate: string }> = {};

      for (const doc of snap.docs) {
        const data = doc.data();
        for (const ex of (data.exercises || [])) {
          const name = ex.exerciseName || 'Unknown';
          if (filterName && !name.toLowerCase().includes(filterName)) continue;

          if (!prs[name]) {
            prs[name] = { heaviestWeight: 0, mostReps: 0, highestVolume: 0, heaviestDate: '', mostRepsDate: '', highestVolumeDate: '' };
          }

          for (const set of (ex.sets || [])) {
            if (set.type === 'warmup') continue;
            const w = set.weight || 0;
            const r = set.reps || 0;
            const v = w * r;

            if (w > prs[name].heaviestWeight) {
              prs[name].heaviestWeight = w;
              prs[name].heaviestDate = data.date;
            }
            if (r > prs[name].mostReps) {
              prs[name].mostReps = r;
              prs[name].mostRepsDate = data.date;
            }
            if (v > prs[name].highestVolume) {
              prs[name].highestVolume = v;
              prs[name].highestVolumeDate = data.date;
            }
          }
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify(prs, null, 2) }] };
    }

    // ── get_weekly_summary ────────────────────────────────────────────────
    case 'get_weekly_summary': {
      const profile = await firestore.doc(`users/${userId}/profile/main`).get();
      const profileData = profile.exists ? profile.data() : {} as any;

      // Calculate Monday 00:00 of this week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const snap = await firestore.collection('users').doc(userId).collection('workoutLogs')
        .where('date', '>=', monday.toISOString()).orderBy('date', 'desc').get();

      let totalVolume = 0;
      let cardioMinutes = 0;
      let totalDistance = 0;
      const musclesHit = new Set<string>();
      const workoutDates = new Set<string>();

      for (const doc of snap.docs) {
        const d = doc.data();
        workoutDates.add(d.date?.substring(0, 10));
        totalVolume += d.volume || 0;

        // Cardio calculations
        if (['run', 'walk', 'cycle', 'hiit'].includes(d.activityType)) {
          const durParts = (d.duration || '0').split(':');
          if (durParts.length === 2) cardioMinutes += parseInt(durParts[0]) || 0;
          else cardioMinutes += parseInt(durParts[0]) || 0;

          if (d.cardioMetrics?.distance) {
            const dist = d.cardioMetrics.distance;
            totalDistance += d.cardioMetrics.distanceUnit === 'km' ? dist * 0.621371 : dist;
          }
        }

        for (const ex of (d.exercises || [])) {
          for (const muscle of (ex.targetMuscles || [])) musclesHit.add(muscle);
        }
      }

      const summary = {
        weekOf: monday.toISOString().substring(0, 10),
        workoutsCompleted: workoutDates.size,
        workoutGoal: profileData?.weeklyWorkoutGoal || 'Not set',
        totalVolume: Math.round(totalVolume),
        cardioMinutes: Math.round(cardioMinutes),
        cardioGoal: profileData?.weeklyCardioGoal || 'Not set',
        totalDistanceMiles: Math.round(totalDistance * 10) / 10,
        distanceGoal: profileData?.weeklyDistanceGoal || 'Not set',
        musclesWorked: Array.from(musclesHit),
        currentStreak: profileData?.currentStreak || 0,
        longestStreak: profileData?.longestStreak || 0,
        xp: profileData?.xp || 0,
        level: profileData?.level || Math.floor((profileData?.xp || 0) / 1000) + 1,
      };

      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
    }

    // ── search_exercises ──────────────────────────────────────────────────
    case 'search_exercises': {
      const query = (args.query || '').toLowerCase();
      let ref = firestore.collection('exercises').orderBy('name', 'asc') as FirebaseFirestore.Query;
      if (args.activityType) {
        ref = ref.where('activityType', '==', args.activityType);
      }
      const snap = await ref.get();

      const matches = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter((ex: any) => {
          const nameMatch = (ex.name || '').toLowerCase().includes(query);
          const muscleMatch = (ex.targetMuscles || []).some((m: string) => m.toLowerCase().includes(query));
          const categoryMatch = (ex.category || '').toLowerCase().includes(query);
          return nameMatch || muscleMatch || categoryMatch;
        })
        .slice(0, 25)
        .map((ex: any) => ({
          name: ex.name,
          targetMuscles: ex.targetMuscles,
          activityType: ex.activityType,
          equipment: ex.equipment,
          category: ex.category,
          defaultUnit: ex.defaultUnit,
        }));

      return { content: [{ type: 'text', text: JSON.stringify({ query: args.query, results: matches, count: matches.length }, null, 2) }] };
    }

    // ── coach_chat ────────────────────────────────────────────────────────
    case 'coach_chat': {
      const result = await askCoach({
        history: [],
        latestMessage: args.message,
        fitnessGoals: args.fitnessGoals,
        recentWorkoutsSummary: args.recentWorkoutsSummary,
      });

      if (result.success && result.reply) {
        return { content: [{ type: 'text', text: result.reply }] };
      }
      return { content: [{ type: 'text', text: `Coach error: ${result.error || 'Unknown error'}` }], isError: true };
    }

    // ── swap_exercise ─────────────────────────────────────────────────────
    case 'swap_exercise': {
      const result = await suggestExerciseSwaps({
        activeExercise: args.exerciseName,
        targetMuscleGroup: args.targetMuscleGroup,
        availableEquipment: args.availableEquipment,
        fitnessGoals: args.fitnessGoals,
      });

      if (result.success && result.recommendations) {
        return { content: [{ type: 'text', text: JSON.stringify(result.recommendations, null, 2) }] };
      }
      return { content: [{ type: 'text', text: `Swap error: ${result.error || 'Unknown error'}` }], isError: true };
    }

    // ── update_fitness_goals ──────────────────────────────────────────────
    case 'update_fitness_goals': {
      const updates: Record<string, any> = {};
      const fields = ['targetWeight', 'weeklyWorkoutGoal', 'weeklyCardioGoal', 'weeklyDistanceGoal', 'strengthGoal', 'muscleGoal', 'fatLossGoal'];
      for (const field of fields) {
        if (args[field] !== undefined && args[field] !== null) {
          updates[field] = args[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: 'text', text: 'No goals provided to update. Specify at least one field.' }] };
      }

      await firestore.doc(`users/${userId}/profile/main`).set(updates, { merge: true });
      return { content: [{ type: 'text', text: `Updated goals: ${Object.entries(updates).map(([k, v]) => `${k} = ${v}`).join(', ')}` }] };
    }

    // ── log_body_weight ───────────────────────────────────────────────────
    case 'log_body_weight': {
      const date = args.date || new Date().toISOString();
      const doc = { userId, date, weight: args.weight };
      const ref = await firestore.collection('users').doc(userId).collection('progressLogs').add(doc);
      return { content: [{ type: 'text', text: `Logged body weight: ${args.weight} lbs on ${date.substring(0, 10)} (ID: ${ref.id})` }] };
    }

    // ── get_body_weight_history ───────────────────────────────────────────
    case 'get_body_weight_history': {
      const limit = Math.min(args?.limit || 30, 100);
      const snap = await firestore.collection('users').doc(userId).collection('progressLogs')
        .orderBy('date', 'desc').limit(limit).get();
      const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      entries.reverse(); // chronological
      return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] };
    }

    // ── get_leaderboard ───────────────────────────────────────────────────
    case 'get_leaderboard': {
      const metric = args?.metric || 'totalVolume';
      const period = args?.period || 'weekly';

      // Get user's own stats
      const profile = await firestore.doc(`users/${userId}/profile/main`).get();
      const profileData = profile.exists ? profile.data() : null;
      const userStats = profileData?.leaderboardStats?.[period] || {};

      // Try to get global leaderboard snapshot
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const snapshotId = `${period}_${metric}_${yearMonth}`;
      const lbDoc = await firestore.doc(`leaderboards/${snapshotId}`).get();

      const result: any = {
        metric, period,
        yourStats: userStats,
      };

      if (lbDoc.exists) {
        const lbData = lbDoc.data();
        result.topEntries = (lbData?.entries || []).slice(0, 10);
        result.totalParticipants = lbData?.totalParticipants || 0;
      } else {
        result.note = 'No leaderboard snapshot found for this period/metric combination.';
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── POST (Streamable HTTP handler) ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    if (method === 'initialize') {
      return jsonResponse({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'tonal-tracker-mcp', version: '1.1.0' },
        },
      }, 200, { 'Mcp-Session-Id': randomUUID() });
    }

    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    if (method === 'ping') {
      return jsonResponse({ jsonrpc: '2.0', id, result: {} });
    }

    if (method === 'tools/list') {
      return jsonResponse({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
    }

    if (method === 'resources/list') {
      return jsonResponse({ jsonrpc: '2.0', id, result: { resources: [] } });
    }

    if (method === 'prompts/list') {
      return jsonResponse({ jsonrpc: '2.0', id, result: { prompts: [] } });
    }

    if (method === 'tools/call') {
      const userId = await getAuthenticatedUserId(req, true);
      const { name, arguments: toolArgs } = params || {};
      try {
        const result = await executeTool(name, toolArgs || {}, userId);
        return jsonResponse({ jsonrpc: '2.0', id, result });
      } catch (toolErr: any) {
        return jsonResponse({
          jsonrpc: '2.0', id,
          result: { content: [{ type: 'text', text: `Error: ${toolErr.message}` }], isError: true },
        });
      }
    }

    return jsonResponse({ jsonrpc: '2.0', id: id ?? null, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (error: any) {
    console.error('MCP POST error:', error);
    return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32603, message: error.message || 'Internal error' } }, 500);
  }
}
