import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getServerFirestore } from '@/firebase/server';
import { suggestWorkoutSetup } from '@/ai/flows/suggest-workout-flow';
import { randomUUID } from 'crypto';

// ─── MCP Streamable HTTP Transport ───────────────────────────────────────────
// Gemini Spark requires the "Streamable HTTP" transport (MCP spec 2025-03-26).
// This is a single-endpoint, stateless JSON-RPC protocol over POST.
// The old SSE dual-channel transport is deprecated and rejected by Gemini.
//
// Protocol flow:
//   1. Client POSTs { method: "initialize", ... } → server returns capabilities + Mcp-Session-Id header
//   2. Client POSTs { method: "notifications/initialized" } → server returns 204
//   3. Client POSTs { method: "tools/list" } → server returns tool definitions
//   4. Client POSTs { method: "tools/call", params: { name, arguments } } → server executes & returns result
// ─────────────────────────────────────────────────────────────────────────────

// CORS headers for cross-origin requests from gemini.google.com
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

// ─── OPTIONS (CORS Preflight) ────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ─── GET (SSE stream for server-initiated notifications — optional) ──────────
// Gemini may open a GET to listen for server-initiated messages.
// We don't push notifications, so we just keep the stream alive.
export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send an initial comment to confirm the stream is alive
      controller.enqueue(encoder.encode(': ok\n\n'));
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      ...CORS_HEADERS,
    },
  });
}

// ─── DELETE (Session termination) ────────────────────────────────────────────
export async function DELETE() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ─── Helper: resolve userId from request ─────────────────────────────────────
async function getAuthenticatedUserId(req: NextRequest, required: boolean): Promise<string> {
  // 1. Try Firebase ID token
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      if (decodedToken?.uid) return decodedToken.uid;
    } catch (err) {
      console.error('Error verifying Firebase ID token:', err);
    }
  }

  // 2. Try query param or custom header
  const urlUserId = req.nextUrl.searchParams.get('userId');
  const headerUserId = req.headers.get('x-user-id');
  const resolvedId = urlUserId || headerUserId;
  if (resolvedId) return resolvedId;

  if (required) {
    throw new Error('Unauthorized: Provide userId as a query parameter or a Bearer token.');
  }
  return '';
}

// ─── MCP Tool Definitions ────────────────────────────────────────────────────
const MCP_TOOLS = [
  {
    name: 'get_workout_history',
    description: 'Retrieves a list of recent logged workouts for the authenticated user, including exercises, weights, reps, dates, and volumes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of recent workouts to retrieve (default: 10, max: 50)',
        },
      },
    },
  },
  {
    name: 'get_user_stats',
    description: "Retrieves the authenticated user's profile statistics, including current streak, experience points (XP), lifetime volume, and leaderboard statistics.",
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'suggest_workout',
    description: "Suggests a workout routine based on the user's fitness goals and current weekly progress.",
    inputSchema: {
      type: 'object' as const,
      properties: {
        fitnessGoals: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of fitness goals (e.g. Build Muscle, Strength, Cardio, Endurance)',
        },
        weeklyWorkoutGoal: {
          type: 'number',
          description: 'Target number of workouts per week (1-7)',
        },
        workoutsThisWeek: {
          type: 'number',
          description: 'Workouts already completed since Monday',
        },
      },
      required: ['fitnessGoals', 'weeklyWorkoutGoal', 'workoutsThisWeek'],
    },
  },
  {
    name: 'log_workout',
    description: 'Logs a completed workout for the user, storing details about exercises, sets, weights, reps, and duration.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workoutName: {
          type: 'string',
          description: 'Name of the workout (e.g., Upper Body Focus, Evening Run)',
        },
        duration: {
          type: 'string',
          description: 'Duration description (e.g. "45 min", "20 min")',
        },
        activityType: {
          type: 'string',
          enum: ['resistance', 'calisthenics', 'run', 'walk', 'cycle', 'hiit'],
          description: 'The type of exercise activity performed',
        },
        rating: {
          type: 'number',
          minimum: 1,
          maximum: 5,
          description: 'User rating of the workout out of 5 stars',
        },
        exercises: {
          type: 'array',
          description: 'Exercises performed (only for resistance/calisthenics/hiit)',
          items: {
            type: 'object',
            properties: {
              exerciseId: { type: 'string' },
              exerciseName: { type: 'string' },
              sets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    reps: { type: 'number' },
                    weight: { type: 'number' },
                    duration: { type: 'number', description: 'Duration in seconds' },
                    type: { type: 'string', enum: ['normal', 'warmup', 'drop', 'failure'] },
                  },
                },
              },
            },
            required: ['exerciseName', 'sets'],
          },
        },
        volume: {
          type: 'number',
          description: 'Total weight volume in lbs (optional, calculated from exercises if omitted)',
        },
        cardioMetrics: {
          type: 'object',
          description: 'Cardio metrics (only for run/walk/cycle/hiit)',
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
];

// ─── Tool Execution Logic ────────────────────────────────────────────────────
async function executeTool(name: string, args: any, userId: string) {
  const firestore = getServerFirestore();

  switch (name) {
    case 'get_workout_history': {
      const limitVal = Math.min(args?.limit || 10, 50);
      const snapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('workoutLogs')
        .orderBy('date', 'desc')
        .limit(limitVal)
        .get();

      const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] };
    }

    case 'get_user_stats': {
      const docSnap = await firestore.doc(`users/${userId}/profile/main`).get();
      if (!docSnap.exists) {
        return { content: [{ type: 'text', text: `No profile found for user ${userId}.` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(docSnap.data(), null, 2) }] };
    }

    case 'suggest_workout': {
      const histSnap = await firestore
        .collection('users')
        .doc(userId)
        .collection('workoutLogs')
        .orderBy('date', 'desc')
        .limit(7)
        .get();

      const recentHistory = histSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          date: d.date,
          name: d.workoutName,
          volume: d.volume || 0,
          muscleGroups: d.exercises?.flatMap((e: any) => e.targetMuscles || []) || [],
          activityType: d.activityType || 'resistance',
          duration: d.duration,
        };
      });

      const suggestion = await suggestWorkoutSetup({
        fitnessGoals: args.fitnessGoals || [],
        workoutHistory: recentHistory,
        weeklyWorkoutGoal: args.weeklyWorkoutGoal,
        workoutsThisWeek: args.workoutsThisWeek,
      });

      return { content: [{ type: 'text', text: JSON.stringify(suggestion, null, 2) }] };
    }

    case 'log_workout': {
      const { workoutName, duration, activityType, rating, exercises, volume, cardioMetrics } = args;

      let calculatedVolume = volume || 0;
      if (!volume && exercises && Array.isArray(exercises)) {
        calculatedVolume = exercises.reduce((total: number, ex: any) => {
          return total + (ex.sets || []).reduce((sum: number, set: any) => {
            if (set.type === 'warmup') return sum;
            return sum + (set.weight || 0) * (set.reps || 0);
          }, 0);
        }, 0);
      }

      const logDoc = {
        userId,
        workoutName,
        date: new Date().toISOString(),
        duration,
        activityType: activityType || 'resistance',
        volume: calculatedVolume,
        rating: rating || null,
        ...(exercises ? { exercises } : {}),
        ...(cardioMetrics ? { cardioMetrics } : {}),
      };

      const docRef = await firestore
        .collection('users')
        .doc(userId)
        .collection('workoutLogs')
        .add(logDoc);

      return {
        content: [{
          type: 'text',
          text: `Successfully logged workout "${workoutName}" (ID: ${docRef.id}, volume: ${calculatedVolume} lbs).`,
        }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── POST (Main Streamable HTTP handler) ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    // ── 1. initialize ────────────────────────────────────────────────────────
    if (method === 'initialize') {
      const sessionId = randomUUID();
      return jsonResponse(
        {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: 'tonal-tracker-mcp',
              version: '1.0.0',
            },
          },
        },
        200,
        { 'Mcp-Session-Id': sessionId }
      );
    }

    // ── 2. notifications/initialized ─────────────────────────────────────────
    if (method === 'notifications/initialized') {
      // Notification — no response body required
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── 3. notifications/cancelled ───────────────────────────────────────────
    if (method === 'notifications/cancelled') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── 4. ping ──────────────────────────────────────────────────────────────
    if (method === 'ping') {
      return jsonResponse({ jsonrpc: '2.0', id, result: {} });
    }

    // ── 5. tools/list ────────────────────────────────────────────────────────
    if (method === 'tools/list') {
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS },
      });
    }

    // ── 6. resources/list (empty — we expose no resources) ───────────────────
    if (method === 'resources/list') {
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        result: { resources: [] },
      });
    }

    // ── 7. prompts/list (empty — we expose no prompts) ───────────────────────
    if (method === 'prompts/list') {
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        result: { prompts: [] },
      });
    }

    // ── 8. tools/call ────────────────────────────────────────────────────────
    if (method === 'tools/call') {
      const userId = await getAuthenticatedUserId(req, true);
      const { name, arguments: args } = params || {};

      try {
        const result = await executeTool(name, args || {}, userId);
        return jsonResponse({ jsonrpc: '2.0', id, result });
      } catch (toolErr: any) {
        return jsonResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${toolErr.message}` }],
            isError: true,
          },
        });
      }
    }

    // ── Unknown method ───────────────────────────────────────────────────────
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32601, message: `Method not found: ${method}` },
      },
      200
    );
  } catch (error: any) {
    console.error('MCP POST error:', error);
    return jsonResponse(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32603, message: error.message || 'Internal server error' },
      },
      500
    );
  }
}
