import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getServerFirestore } from '@/firebase/server';
import { suggestWorkoutSetup } from '@/ai/flows/suggest-workout-flow';

// CORS headers to allow cross-origin requests (necessary for web MCP clients like Gemini Spark)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
};

// Helper function to return JSON responses with correct CORS headers
function corsResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: CORS_HEADERS,
  });
}

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Global in-memory map of active SSE clients
// Note: In Cloud Run, instances run concurrently and share this map.
const sseClients = new Map<string, ReadableStreamDefaultController>();

// Helper to authenticate the user and get their uid securely
async function getAuthenticatedUserId(req: NextRequest, isToolCall: boolean): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      if (decodedToken?.uid) {
        return decodedToken.uid;
      }
    } catch (err) {
      console.error('Error verifying Firebase ID token:', err);
    }
  }

  // Get userId from custom headers or query params (essential for Gemini Spark URL binding)
  const urlUserId = req.nextUrl.searchParams.get('userId');
  const headerUserId = req.headers.get('x-user-id');
  const resolvedId = urlUserId || headerUserId;

  if (resolvedId) {
    return resolvedId;
  }

  if (isToolCall) {
    throw new Error('Unauthorized: Missing valid user ID. Please provide userId in the query parameter (e.g. ?userId=YOUR_USER_ID) or Authorization header.');
  }

  return '';
}

// Define the exposed tools matching the MCP standard
const MCP_TOOLS = [
  {
    name: 'get_workout_history',
    description: 'Retrieves a list of recent logged workouts for the authenticated user, including exercises, weights, reps, dates, and volumes.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Maximum number of recent workouts to retrieve (default: 10, max: 50)' 
        }
      }
    }
  },
  {
    name: 'get_user_stats',
    description: 'Retrieves the authenticated user\'s profile statistics, including current streak, experience points (XP), lifetime volume, and leaderboard statistics.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'suggest_workout',
    description: 'Suggests a workout routine based on the user\'s fitness goals and current weekly progress.',
    inputSchema: {
      type: 'object',
      properties: {
        fitnessGoals: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of fitness goals (e.g. Build Muscle, Strength, Cardio, Endurance)'
        },
        weeklyWorkoutGoal: {
          type: 'number',
          description: 'Target number of workouts per week (1-7)'
        },
        workoutsThisWeek: {
          type: 'number',
          description: 'Workouts already completed since Monday'
        }
      },
      required: ['fitnessGoals', 'weeklyWorkoutGoal', 'workoutsThisWeek']
    }
  },
  {
    name: 'log_workout',
    description: 'Logs a completed workout for the user, storing details about exercises, sets, weights, reps, and duration.',
    inputSchema: {
      type: 'object',
      properties: {
        workoutName: { 
          type: 'string', 
          description: 'Name of the workout (e.g., Upper Body Focus, Evening Run)' 
        },
        duration: { 
          type: 'string', 
          description: 'Duration description (e.g. "45 min", "20 min")' 
        },
        activityType: { 
          type: 'string', 
          enum: ['resistance', 'calisthenics', 'run', 'walk', 'cycle', 'hiit'],
          description: 'The type of exercise activity performed' 
        },
        rating: { 
          type: 'number', 
          minimum: 1, 
          maximum: 5, 
          description: 'User rating of the workout out of 5 stars' 
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
                    type: { type: 'string', enum: ['normal', 'warmup', 'drop', 'failure'] }
                  }
                }
              }
            },
            required: ['exerciseName', 'sets']
          }
        },
        volume: { 
          type: 'number', 
          description: 'Total weight volume in lbs (optional, will be calculated from exercises if not provided)' 
        },
        cardioMetrics: {
          type: 'object',
          description: 'Cardio metrics (only for run/walk/cycle/hiit)',
          properties: {
            distance: { type: 'number' },
            distanceUnit: { type: 'string', enum: ['mi', 'km'] },
            avgPace: { type: 'string' },
            avgHeartRate: { type: 'number' },
            calories: { type: 'number' }
          }
        }
      },
      required: ['workoutName', 'duration', 'activityType']
    }
  }
];

// Handle GET requests (establishes the Server-Sent Events stream for MCP)
export async function GET(req: NextRequest) {
  const urlUserId = req.nextUrl.searchParams.get('userId') || '';
  const sessionId = Math.random().toString(36).substring(7);
  
  const host = req.headers.get('host') || 'frepo.app';
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  // Define the POST messages url containing the sessionId and userId
  const postUrl = `${protocol}://${host}/api/mcp?sessionId=${sessionId}&userId=${urlUserId}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      sseClients.set(sessionId, controller);
      // Immediately send the endpoint mapping event
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${postUrl}\n\n`));
    },
    cancel() {
      sseClients.delete(sessionId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      ...CORS_HEADERS
    }
  });
}

// Handle POST requests (receives JSON-RPC messages and routes responses back via the GET stream)
export async function POST(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const body = await req.json();
    const { method, params, id } = body;

    let jsonRpcResponse: any = null;

    // 1. Handle MCP discovery
    if (method === 'tools/list') {
      jsonRpcResponse = {
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      };
    }

    // 2. Handle MCP tool executions
    else if (method === 'tools/call') {
      let userId = '';
      try {
        userId = await getAuthenticatedUserId(req, true);
      } catch (authErr: any) {
        jsonRpcResponse = {
          jsonrpc: '2.0',
          id,
          error: { code: -32001, message: authErr.message }
        };
      }

      if (!jsonRpcResponse) {
        const { name, arguments: args } = params || {};
        const firestore = getServerFirestore();

        if (name === 'get_workout_history') {
          const limitVal = Math.min(args?.limit || 10, 50);
          const snapshot = await firestore
            .collection('users')
            .doc(userId)
            .collection('workoutLogs')
            .orderBy('date', 'desc')
            .limit(limitVal)
            .get();

          const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          jsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }]
            }
          };
        }

        else if (name === 'get_user_stats') {
          const docRef = firestore.doc(`users/${userId}/profile/main`);
          const docSnap = await docRef.get();

          if (!docSnap.exists) {
            jsonRpcResponse = {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: `No profile statistics found for user ID: ${userId}` }]
              }
            };
          } else {
            jsonRpcResponse = {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(docSnap.data(), null, 2) }]
              }
            };
          }
        }

        else if (name === 'suggest_workout') {
          const historySnapshot = await firestore
            .collection('users')
            .doc(userId)
            .collection('workoutLogs')
            .orderBy('date', 'desc')
            .limit(7)
            .get();

          const recentHistory = historySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              date: data.date,
              name: data.workoutName,
              volume: data.volume || 0,
              muscleGroups: data.exercises?.flatMap((e: any) => e.targetMuscles || []) || [],
              activityType: data.activityType || 'resistance',
              duration: data.duration
            };
          });

          const suggestion = await suggestWorkoutSetup({
            fitnessGoals: args.fitnessGoals || [],
            workoutHistory: recentHistory,
            weeklyWorkoutGoal: args.weeklyWorkoutGoal,
            workoutsThisWeek: args.workoutsThisWeek,
          });

          jsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(suggestion, null, 2) }]
            }
          };
        }

        else if (name === 'log_workout') {
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
            ...(cardioMetrics ? { cardioMetrics } : {})
          };

          const docRef = await firestore
            .collection('users')
            .doc(userId)
            .collection('workoutLogs')
            .add(logDoc);

          jsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `Successfully logged workout "${workoutName}" with ID ${docRef.id} and volume ${calculatedVolume} lbs.`
              }]
            }
          };
        }

        else {
          jsonRpcResponse = {
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Method not found: ${name}` }
          };
        }
      }
    }

    if (!jsonRpcResponse) {
      jsonRpcResponse = {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request' }
      };
    }

    // Standard SSE transport flow: Send response over the active GET SSE stream
    if (sessionId && sseClients.has(sessionId)) {
      const controller = sseClients.get(sessionId);
      if (controller) {
        try {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(jsonRpcResponse)}\n\n`));
          
          return new Response(null, {
            status: 202,
            headers: CORS_HEADERS
          });
        } catch (err) {
          console.error('Failed to push SSE message:', err);
        }
      }
    }

    // Direct HTTP JSON-RPC fallback response
    return corsResponse(jsonRpcResponse);

  } catch (error: any) {
    console.error('MCP Server Route Error:', error);
    const errResp = {
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message || 'Internal error' }
    };
    return corsResponse(errResp, 500);
  }
}
