
export type Exercise = {
  id: string;
  name: string;
  category?: string;
  targetMuscles?: string[];  // Specific muscles like 'traps', 'lats_upper', 'lats_lower'
  activityType?: ActivityType;        // Defaults to 'resistance'
  isCardioActivity?: boolean;         // For run, walk, cycle pseudo-exercises
  defaultUnit?: 'reps' | 'seconds' | 'bodyweight' | 'reps-only';
};

export type UserExercisePreference = {
  id: string; // Corresponds to the master Exercise ID
  userId: string;
  videoId?: string | null;
}

export type WorkoutExercise = {
  id: string; // Unique ID for this specific instance of an exercise in a workout
  exerciseId: string; // Refers to the master Exercise ID
  exerciseName: string;
  sets: number;
  reps: string; // e.g., "8-12" or "30"
  unit: 'reps' | 'seconds' | 'bodyweight' | 'reps-only'; // The unit for the 'reps' field value
  supersetId: string; // Used to group exercises into supersets
};

export type CustomWorkout = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  exercises: WorkoutExercise[];
  createdAt?: string; // ISO string for creation date
  updatedAt?: string; // ISO string for last update date
  locationId?: string; // ID of the location this workout was created for
  locationName?: string; // Name of the location (denormalized for display)
};

export type LoggedSet = {
  reps?: number;
  weight?: number;
  duration?: number; // Duration in seconds
  type?: 'normal' | 'warmup' | 'drop' | 'failure';
};

export type LoggedExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: LoggedSet[];
};

// Activity types supported by the app
export type ActivityType = 'resistance' | 'calisthenics' | 'run' | 'walk' | 'cycle' | 'hiit';

// Cardio-specific metrics
export type CardioMetrics = {
  distance?: number;           // in user's preferred unit
  distanceUnit?: 'mi' | 'km';  // miles or kilometers
  avgPace?: string;            // e.g., "9:45 /mi"
  avgHeartRate?: number;       // bpm
  incline?: number;            // percentage (for treadmill)
  elevation?: number;          // feet or meters (for outdoor/GPS)
  calories?: number;           // estimated calories burned
};

export type WorkoutLog = {
  id: string;
  userId: string;
  workoutName: string;
  date: string; // ISO string
  duration: string; // e.g. "45 min"
  activityType?: ActivityType;              // Defaults to 'resistance' if undefined
  exercises?: LoggedExercise[];             // Optional (not used for pure cardio)
  volume?: number;                          // Optional (not used for pure cardio)
  cardioMetrics?: CardioMetrics;            // Optional (only for cardio types)
  musclesWorked?: Record<string, number>;   // Pre-calculated muscle intensities
  rating?: number;
};

export type UserEquipment = {
  id: string;
  userId: string;
  name: string;
};

export type WorkoutLocation = {
  id: string;
  userId: string;
  name: string;                    // "Home", "YMCA Downtown", etc.
  equipment: string[];             // List of equipment names
  icon?: string;                   // Optional emoji: 🏠, 🏋️, etc.
  type: 'home' | 'gym' | 'other';  // Determines equipment input mode
  isDefault?: boolean;             // One location should be marked as default
  createdAt?: string;              // ISO string
};

export type UserProfile = {
  id: string;
  targetWeight?: number;
  weeklyWorkoutGoal?: number;
  weeklyCardioGoal?: number; // Weekly cardio goal in minutes
  weeklyDistanceGoal?: number; // Weekly distance goal in miles
  strengthGoal?: string;
  muscleGoal?: string;
  fatLossGoal?: string;
  availableEquipment?: string[];
  biologicalSex?: 'Male' | 'Female';
  heatmapColorScheme?: 'classic' | 'sunset' | 'ocean' | 'monochrome' | 'neon';
  shareCardTemplate?: 'cosmic' | 'fire' | 'ocean'; // Visual style for share cards
  lastAiWorkoutDate?: string; // YYYY-MM-DD string
  lastAiSuggestionDate?: string; // YYYY-MM-DD string
  hasCompletedOnboarding?: boolean;
  todaysAiWorkout?: object;
  todaysSuggestion?: object;

  // Gamification
  currentStreak?: number;
  longestStreak?: number;
  lastWorkoutDate?: string; // ISO string of last completed workout (any type)
  lifetimeVolume?: number;
  xp?: number;
  level?: number;

  // Workout Locations
  activeLocationId?: string; // ID of the currently selected workout location

  // Media preferences
  preferredMusicApp?: 'spotify' | 'apple-music' | 'youtube-music' | 'amazon-music' | 'pandora' | 'none';

  // Health Connect integration
  healthConnectEnabled?: boolean;

  // Active Workout Program
  activeProgramId?: string;              // ID of the currently active program enrollment

  // Feature Discovery (for new user onboarding)
  discoveryChecklist?: {
    firstWorkout?: boolean;
    firstAiWorkout?: boolean;
    firstWeightLog?: boolean;
    setGoals?: boolean;
    addedEquipment?: boolean;
    firstCardioSession?: boolean;
    viewedProgress?: boolean;
    startedProgram?: boolean;
  };
  dismissedDiscoveryChecklist?: boolean;

  // Review Prompt
  dismissedReviewPrompt?: boolean; // User chose "Don't ask again"
  lastReviewPromptDate?: string;   // ISO date - for 30-day cooldown

  // Leaderboard
  leaderboardSettings?: LeaderboardSettings;
  leaderboardStats?: {
    weekly: Record<LeaderboardMetric, number>;
    monthly: Record<LeaderboardMetric, number>;
    allTime: Record<LeaderboardMetric, number>;
    updatedAt: string;
  };
}

export type ProgressLog = {
  id: string;
  userId: string;
  date: string; // ISO string
  weight: number;
};


export type PRType = 'max_weight' | 'max_volume' | 'best_1rm';

export type PRResult = {
  isPR: boolean;
  type: PRType;
  oldValue: number;
  newValue: number;
};

// Workout Program (stored in global 'programs' collection)
export type WorkoutProgram = {
  id: string;
  name: string;                          // "6-Week Superman Chest"
  description: string;                   // Marketing description
  shortDescription: string;              // One-liner for cards
  durationWeeks: number;                 // 4, 6, 8
  daysPerWeek: number;                   // 3-6 recommended
  price: number;                         // 0 = free, 99 = $0.99 (in cents)
  productId: string;                     // Google Play product ID
  icon: string;                          // Emoji: 🦸, 🔥, 💪
  difficulty: 'beginner' | 'intermediate' | 'advanced';

  // Program structure for AI
  primaryMuscles: string[];              // ['chest', 'shoulders_front', 'triceps']
  secondaryMuscles: string[];            // ['lats', 'biceps']
  muscleEmphasis: Record<string, number>; // { chest: 0.6, shoulders: 0.2, triceps: 0.2 }

  // Weekly progression
  weeklyProgression: {
    week: number;
    phase: string;                       // 'Foundation', 'Volume', 'Intensity', 'Peak'
    intensityModifier: 'standard' | 'high' | 'brutal';
    volumeMultiplier: number;            // 1.0, 1.1, 1.2
    focusNotes: string;                  // Coaching notes for this week
  }[];

  // Display
  coverImageUrl?: string;
  tags: string[];                        // ['chest', 'muscle-gain', 'intermediate']
  isActive: boolean;                     // Admin can disable programs
  createdAt: string;
};

// User's enrollment in a program (stored in user subcollection)
export type UserProgramEnrollment = {
  id: string;
  programId: string;
  programName: string;                   // Denormalized for display
  programIcon: string;                   // Denormalized for display
  durationWeeks: number;                 // Denormalized for progress display
  daysPerWeek: number;                   // Denormalized for progress tracking
  purchasedAt: string;                   // ISO date
  startedAt?: string;                    // ISO date when user started
  currentWeek: number;                   // 1-indexed
  workoutsCompletedThisWeek: number;
  lastWeekReset?: number;                // The week number when workoutsCompletedThisWeek was last reset
  totalWorkoutsCompleted: number;        // Total across all weeks
  isCompleted: boolean;
  isActive: boolean;                     // Is this the currently active program?
  completedAt?: string;                  // ISO date when completed
  isPurchased: boolean;                  // true if purchased or free
  purchaseToken?: string;                // Google Play purchase token for verification
};

/**
 * User feedback and suggestions
 */
export type Feedback = {
  id: string;
  userId: string;
  userEmail?: string;
  displayName?: string;
  type: 'suggestion' | 'feedback' | 'bug';
  category: 'program' | 'general' | 'feature';
  message: string;
  createdAt: string;                     // ISO date
  status?: 'new' | 'reviewed' | 'resolved';
};

// ============================================
// LEADERBOARD TYPES
// ============================================

/**
 * Available metrics for leaderboard ranking
 */
export type LeaderboardMetric =
  | 'totalVolume'
  | 'workoutCount'
  | 'activeDays'
  | 'xpEarned'
  | 'cardioMinutes'
  | 'personalRecords';

/**
 * A single entry on a leaderboard
 */
export type LeaderboardEntry = {
  rank: number;
  displayName: string;           // Safe generated name like "FitHawk#2847"
  customName?: string;           // Optional verified custom name
  avatarEmoji?: string;          // Random emoji avatar (🦁, 🐺, 🦅, etc.)
  value: number;                 // Metric value
  userId: string;                // For friend matching
  isCurrentUser?: boolean;       // Highlight in UI
};

/**
 * User's leaderboard preferences (stored in UserProfile)
 */
export type LeaderboardSettings = {
  optedIn: boolean;
  displayNameType: 'generated' | 'custom';
  generatedName?: string;        // Auto-assigned unique name
  customDisplayName?: string;    // User-chosen name (moderated)
  friendCode?: string;           // 8-char code for receiving friend requests
  searchName?: string;           // Lowercase normalized name for prefix search
};

/**
 * Friend connection for leaderboard comparison
 */
export type FriendConnection = {
  id: string;
  senderId: string;               // Who sent the request
  receiverId: string;             // Who received it
  senderDisplayName?: string;     // Display name of sender for UI
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;              // ISO date
  acceptedAt?: string;            // ISO date when accepted
};

/**
 * A friend in the user's friend list (denormalized for quick access)
 */
export type Friend = {
  id?: string;                   // Document ID (optional, set after read)
  friendUserId: string;          // The friend's user ID
  displayName: string;           // Their leaderboard display name
  avatarEmoji?: string;          // Their emoji avatar
  addedAt: string;               // ISO date
};

/**
 * Pre-computed leaderboard snapshot (stored in /leaderboards collection)
 */
export type LeaderboardSnapshot = {
  id: string;                    // e.g., "weekly_totalVolume_2025_01"
  metric: LeaderboardMetric;
  period: 'weekly' | 'monthly' | 'alltime';
  periodStart?: string;          // ISO date (for weekly/monthly)
  periodEnd?: string;            // ISO date (for weekly/monthly)
  entries: LeaderboardEntry[];   // Top 100 entries
  totalParticipants: number;     // Total opted-in users
  updatedAt: string;             // ISO timestamp
};

// ============================================
// BLOG TYPES
// ============================================

/**
 * Blog post for automated SEO content
 */
export type BlogPost = {
  id: string;
  slug: string;                    // URL-friendly (e.g., "best-chest-workout-beginners")
  title: string;                   // "Best Chest Workout for Beginners"
  excerpt: string;                 // Short description for list view & SEO
  content: string;                 // Full markdown content
  category: 'workouts' | 'nutrition' | 'tips' | 'motivation' | 'programs';
  tags: string[];                  // ["chest", "beginner", "push"]
  publishedAt: string;             // ISO date
  status: 'draft' | 'published';
  seoDescription: string;          // Meta description for SEO
  featuredImage?: string;          // Optional cover image URL
  readingTime?: number;            // Estimated reading time in minutes
};
