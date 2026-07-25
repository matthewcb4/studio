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

// Handle GET requests (helps with connection testing and simple HTTP discovery)
export async function GET() {
  return corsResponse({
    jsonrpc: '2.0',
    result: { tools: MCP_TOOLS }
  });
}

// Handle POST requests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    // 1. Handle MCP discovery (Publicly accessible for link connection probe)
    if (method === 'tools/list') {
      return corsResponse({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      });
    }

    // 2. Handle MCP tool executions (Requires authentication check)
    if (method === 'tools/call') {
      let userId: string;
      try {
        userId = await getAuthenticatedUserId(req, true);
      } catch (authErr: any) {
        return corsResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32001, message: authErr.message }
        }, 401);
      }

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

        return corsResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(logs, null, 2)
              }
            ]
          }
        });
      }

      if (name === 'get_user_stats') {
        const docRef = firestore.doc(`users/${userId}/profile/main`);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          return corsResponse({
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `No profile statistics found for user ID: ${userId}`
                }
              ]
            }
          });
        }

        const data = docSnap.data();
        return corsResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2)
              }
            ]
          }
        });
      }

      if (name === 'suggest_workout') {
        // Query recent history to populate suggestWorkoutSetup accurately
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

        // Run the imported suggestion flow logic
        const suggestion = await suggestWorkoutSetup({
          fitnessGoals: args.fitnessGoals || [],
          workoutHistory: recentHistory,
          weeklyWorkoutGoal: args.weeklyWorkoutGoal,
          workoutsThisWeek: args.workoutsThisWeek,
        });

        return corsResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(suggestion, null, 2)
              }
            ]
          }
        });
      }

      if (name === 'log_workout') {
        const { workoutName, duration, activityType, rating, exercises, volume, cardioMetrics } = args;

        // Calculate volume if not explicitly provided for resistance training
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

        return corsResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: `Successfully logged workout "${workoutName}" with ID ${docRef.id} and volume ${calculatedVolume} lbs.`
              }
            ]
          }
        });
      }

      return corsResponse({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${name}` }
      }, 404);
    }

    return corsResponse({
      jsonrpc: '2.0',
      id,
      error: { code: -32600, message: 'Invalid Request' }
    }, 400);

  } catch (error: any) {
    console.error('MCP Server Route Error:', error);
    return corsResponse({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message || 'Internal error' }
    }, 500);
  }
}
