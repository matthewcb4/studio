/**
 * Blog Post Topics Database
 * 
 * A curated list of SEO-optimized fitness topics for automated blog generation.
 * Each topic includes target keywords and category for optimal SEO performance.
 */

export interface BlogTopic {
    topic: string;
    category: 'workouts' | 'nutrition' | 'tips' | 'motivation' | 'programs';
    targetKeywords: string[];
    priority: 'high' | 'medium' | 'low';
}

export const BLOG_TOPICS: BlogTopic[] = [
    // ==========================================
    // WORKOUTS - High Search Volume
    // ==========================================
    {
        topic: "Best Chest Workout for Beginners: Build a Strong Foundation",
        category: "workouts",
        targetKeywords: ["chest workout for beginners", "beginner chest exercises", "how to build chest"],
        priority: "high",
    },
    {
        topic: "The Ultimate Back Workout: 6 Exercises for a V-Taper",
        category: "workouts",
        targetKeywords: ["back workout", "v-taper workout", "lat exercises"],
        priority: "high",
    },
    {
        topic: "Leg Day Essentials: The Complete Lower Body Workout Guide",
        category: "workouts",
        targetKeywords: ["leg day workout", "lower body exercises", "leg exercises at gym"],
        priority: "high",
    },
    {
        topic: "How to Build Bigger Arms: The Complete Bicep and Tricep Guide",
        category: "workouts",
        targetKeywords: ["arm workout", "how to get bigger arms", "bicep tricep exercises"],
        priority: "high",
    },
    {
        topic: "Shoulder Workout for Mass: Build Boulder Shoulders",
        category: "workouts",
        targetKeywords: ["shoulder workout", "deltoid exercises", "shoulder exercises for mass"],
        priority: "high",
    },
    {
        topic: "Full Body Workout Routine for Beginners (3 Days Per Week)",
        category: "workouts",
        targetKeywords: ["full body workout", "beginner workout routine", "3 day workout"],
        priority: "high",
    },
    {
        topic: "Home Workout Without Equipment: Build Muscle Anywhere",
        category: "workouts",
        targetKeywords: ["home workout no equipment", "bodyweight exercises", "workout at home"],
        priority: "high",
    },
    {
        topic: "Push Pull Legs Routine: The Most Effective Split for Gains",
        category: "workouts",
        targetKeywords: ["push pull legs", "PPL workout", "best workout split"],
        priority: "high",
    },
    {
        topic: "Core Workout for Six Pack Abs: Beyond Just Crunches",
        category: "workouts",
        targetKeywords: ["ab workout", "core exercises", "how to get abs"],
        priority: "high",
    },
    {
        topic: "Dumbbell Only Workout: Full Body Routine You Can Do Anywhere",
        category: "workouts",
        targetKeywords: ["dumbbell workout", "dumbbell exercises", "full body dumbbell routine"],
        priority: "high",
    },

    // ==========================================
    // TIPS - Technique & Form
    // ==========================================
    {
        topic: "How to Do a Proper Deadlift: Form Guide & Common Mistakes",
        category: "tips",
        targetKeywords: ["deadlift form", "how to deadlift", "deadlift technique"],
        priority: "high",
    },
    {
        topic: "Bench Press Form: Complete Guide to Pressing More Weight Safely",
        category: "tips",
        targetKeywords: ["bench press form", "how to bench press", "bench press technique"],
        priority: "high",
    },
    {
        topic: "Squat Form Guide: How to Squat Without Knee Pain",
        category: "tips",
        targetKeywords: ["squat form", "how to squat", "squat without knee pain"],
        priority: "high",
    },
    {
        topic: "How to Break Through a Strength Plateau: 7 Proven Methods",
        category: "tips",
        targetKeywords: ["strength plateau", "how to lift more weight", "break through plateau"],
        priority: "medium",
    },
    {
        topic: "Mind-Muscle Connection: The Secret to Better Gains",
        category: "tips",
        targetKeywords: ["mind muscle connection", "how to feel muscles working", "muscle activation"],
        priority: "medium",
    },
    {
        topic: "How to Warm Up Properly Before Lifting: A Complete Guide",
        category: "tips",
        targetKeywords: ["warm up before lifting", "gym warm up", "pre workout stretching"],
        priority: "medium",
    },
    {
        topic: "Progressive Overload Explained: The Key to Building Muscle",
        category: "tips",
        targetKeywords: ["progressive overload", "how to build muscle", "muscle growth principles"],
        priority: "high",
    },
    {
        topic: "Rest Between Sets: How Long Should You Actually Wait?",
        category: "tips",
        targetKeywords: ["rest between sets", "how long to rest", "rest period gym"],
        priority: "medium",
    },
    {
        topic: "How Many Sets and Reps for Muscle Growth? The Science",
        category: "tips",
        targetKeywords: ["sets and reps for muscle growth", "how many sets", "optimal rep range"],
        priority: "high",
    },
    {
        topic: "Compound vs Isolation Exercises: When to Use Each",
        category: "tips",
        targetKeywords: ["compound exercises", "isolation exercises", "compound vs isolation"],
        priority: "medium",
    },

    // ==========================================
    // NUTRITION
    // ==========================================
    {
        topic: "How Much Protein Do You Really Need to Build Muscle?",
        category: "nutrition",
        targetKeywords: ["protein for muscle", "how much protein", "protein requirements"],
        priority: "high",
    },
    {
        topic: "Pre-Workout Nutrition: What to Eat Before the Gym",
        category: "nutrition",
        targetKeywords: ["pre workout meal", "what to eat before gym", "pre workout nutrition"],
        priority: "medium",
    },
    {
        topic: "Post-Workout Nutrition: The Anabolic Window Myth",
        category: "nutrition",
        targetKeywords: ["post workout nutrition", "anabolic window", "what to eat after workout"],
        priority: "medium",
    },
    {
        topic: "Bulking vs Cutting: Complete Guide to Body Recomposition",
        category: "nutrition",
        targetKeywords: ["bulking vs cutting", "body recomposition", "how to bulk"],
        priority: "high",
    },
    {
        topic: "Best Foods for Muscle Building: A Complete Shopping List",
        category: "nutrition",
        targetKeywords: ["foods for muscle building", "muscle building diet", "best protein sources"],
        priority: "medium",
    },

    // ==========================================
    // MOTIVATION
    // ==========================================
    {
        topic: "How to Stay Consistent at the Gym: 10 Strategies That Work",
        category: "motivation",
        targetKeywords: ["gym consistency", "how to stay motivated gym", "workout motivation"],
        priority: "high",
    },
    {
        topic: "Morning Workout vs Evening Workout: Which Is Better?",
        category: "motivation",
        targetKeywords: ["morning workout", "best time to workout", "workout timing"],
        priority: "medium",
    },
    {
        topic: "How to Get Back to the Gym After a Long Break",
        category: "motivation",
        targetKeywords: ["returning to gym", "starting gym again", "getting back in shape"],
        priority: "medium",
    },
    {
        topic: "Setting Realistic Fitness Goals: The SMART Method",
        category: "motivation",
        targetKeywords: ["fitness goals", "setting gym goals", "realistic workout goals"],
        priority: "low",
    },
    {
        topic: "Overcoming Gym Anxiety: A Beginner's Guide",
        category: "motivation",
        targetKeywords: ["gym anxiety", "nervous at gym", "workout anxiety"],
        priority: "medium",
    },

    // ==========================================
    // PROGRAMS
    // ==========================================
    {
        topic: "4-Week Beginner Workout Plan: From Zero to Hero",
        category: "programs",
        targetKeywords: ["beginner workout plan", "4 week workout", "starting gym program"],
        priority: "high",
    },
    {
        topic: "6-Week Muscle Building Program for Intermediate Lifters",
        category: "programs",
        targetKeywords: ["muscle building program", "6 week workout plan", "hypertrophy program"],
        priority: "high",
    },
    {
        topic: "12-Week Strength Building Program: Get Seriously Strong",
        category: "programs",
        targetKeywords: ["strength program", "get stronger", "12 week workout"],
        priority: "medium",
    },
    {
        topic: "Fat Loss Workout Plan: Burn Fat While Keeping Muscle",
        category: "programs",
        targetKeywords: ["fat loss workout", "burn fat keep muscle", "cutting workout plan"],
        priority: "high",
    },
    {
        topic: "5-Day Workout Split for Maximum Muscle Growth",
        category: "programs",
        targetKeywords: ["5 day workout split", "bro split", "bodybuilding split"],
        priority: "medium",
    },

    // ==========================================
    // ADDITIONAL HIGH-VALUE TOPICS
    // ==========================================
    {
        topic: "How to Track Your Workouts: The Key to Faster Progress",
        category: "tips",
        targetKeywords: ["track workouts", "workout log", "gym progress tracking"],
        priority: "high",
    },
    {
        topic: "Supersets Explained: How to Use Them for Faster Workouts",
        category: "tips",
        targetKeywords: ["supersets", "superset workout", "how to superset"],
        priority: "medium",
    },
    {
        topic: "Drop Sets: The Intensity Technique for Serious Gains",
        category: "tips",
        targetKeywords: ["drop sets", "intensity techniques", "advanced lifting techniques"],
        priority: "low",
    },
    {
        topic: "Cable Exercises: 15 Best Exercises for Every Muscle Group",
        category: "workouts",
        targetKeywords: ["cable exercises", "cable machine workout", "cable exercises for chest"],
        priority: "medium",
    },
    {
        topic: "Barbell vs Dumbbell: Which Builds More Muscle?",
        category: "tips",
        targetKeywords: ["barbell vs dumbbell", "free weights comparison", "best equipment for muscle"],
        priority: "medium",
    },
    {
        topic: "How to Increase Your Bench Press: 10 Tips That Work",
        category: "tips",
        targetKeywords: ["increase bench press", "bench more weight", "bench press tips"],
        priority: "high",
    },
    {
        topic: "Pull-Up Progression: From Zero to 10+ Reps",
        category: "workouts",
        targetKeywords: ["pull up progression", "how to do pull ups", "pull up for beginners"],
        priority: "high",
    },
    {
        topic: "Glute Workout: Build a Stronger, Better Looking Posterior",
        category: "workouts",
        targetKeywords: ["glute workout", "glute exercises", "build glutes"],
        priority: "high",
    },
    {
        topic: "Machine vs Free Weights: Pros and Cons Explained",
        category: "tips",
        targetKeywords: ["machines vs free weights", "gym machines", "weight machines"],
        priority: "medium",
    },
    {
        topic: "Gym Etiquette: Unwritten Rules Every Lifter Should Know",
        category: "motivation",
        targetKeywords: ["gym etiquette", "gym rules", "gym manners"],
        priority: "low",
    },
];

/**
 * Get the next topic to generate a blog post about.
 * Prioritizes high-priority topics first, then medium, then low.
 * Uses a simple round-robin approach based on the current date.
 */
export function getNextTopic(usedSlugs: string[] = []): BlogTopic | null {
    // Prioritize topics with high > medium > low
    const sortedTopics = [...BLOG_TOPICS].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Filter out already used topics (based on slug similarity)
    const availableTopics = sortedTopics.filter(topic => {
        const slug = topic.topic
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 60);
        return !usedSlugs.includes(slug);
    });

    if (availableTopics.length === 0) {
        return null; // All topics have been used
    }

    // Use date-based selection for deterministic daily picks
    const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const topicIndex = dayOfYear % availableTopics.length;

    return availableTopics[topicIndex];
}

/**
 * Get topics by category
 */
export function getTopicsByCategory(category: BlogTopic['category']): BlogTopic[] {
    return BLOG_TOPICS.filter(t => t.category === category);
}

/**
 * Get all unique categories
 */
export function getCategories(): BlogTopic['category'][] {
    return ['workouts', 'nutrition', 'tips', 'motivation', 'programs'];
}
