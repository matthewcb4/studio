'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronRight, X, Sparkles, Target, Dumbbell, Scale, MapPin, Flame, TrendingUp, Bookmark } from 'lucide-react';
import type { UserProfile, WorkoutLog, ProgressLog, WorkoutLocation } from '@/lib/types';
import { setDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

type FeatureItem = {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    isCompleted: boolean;
};

type FeatureDiscoveryCardProps = {
    userProfile: UserProfile | null | undefined;
    workoutLogs: WorkoutLog[] | null | undefined;
    progressLogs: ProgressLog[] | null | undefined;
    locations: WorkoutLocation[] | null | undefined;
};

export function FeatureDiscoveryCard({
    userProfile,
    workoutLogs,
    progressLogs,
    locations,
}: FeatureDiscoveryCardProps) {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
        , [firestore, user]);

    // Calculate feature completion status
    const features: FeatureItem[] = useMemo(() => {
        const checklist = userProfile?.discoveryChecklist || {};
        const hasResistanceWorkout = workoutLogs?.some(log => !log.activityType || log.activityType === 'resistance' || log.activityType === 'calisthenics');
        const hasCardioWorkout = workoutLogs?.some(log => log.activityType && ['run', 'walk', 'cycle', 'hiit'].includes(log.activityType));
        const hasAiWorkout = !!userProfile?.lastAiWorkoutDate;
        const hasWeightLog = (progressLogs?.length || 0) > 0;
        const hasGoals = !!(userProfile?.weeklyWorkoutGoal || userProfile?.weeklyCardioGoal || userProfile?.targetWeight);
        const hasLocation = (locations?.length || 0) > 0;
        const hasViewedProgress = checklist.viewedProgress || false;
        const hasStartedProgram = !!userProfile?.activeProgramId;

        return [
            {
                id: 'firstWorkout',
                label: 'Complete a Workout',
                description: 'Finish your first resistance workout',
                icon: <Dumbbell className="w-4 h-4" />,
                href: '/workouts',
                isCompleted: hasResistanceWorkout || checklist.firstWorkout || false,
            },
            {
                id: 'firstAiWorkout',
                label: 'Generate AI Workout',
                description: 'Let AI create a personalized workout',
                icon: <Sparkles className="w-4 h-4" />,
                href: '/guide',
                isCompleted: hasAiWorkout || checklist.firstAiWorkout || false,
            },
            {
                id: 'startedProgram',
                label: 'Start a Program',
                description: 'Follow a structured workout plan',
                icon: <Bookmark className="w-4 h-4" />,
                href: '/programs',
                isCompleted: hasStartedProgram || checklist.startedProgram || false,
            },
            {
                id: 'setGoals',
                label: 'Set Your Goals',
                description: 'Configure your weekly fitness targets',
                icon: <Target className="w-4 h-4" />,
                href: '/settings?open=fitness-goals',
                isCompleted: hasGoals || checklist.setGoals || false,
            },
            {
                id: 'addedEquipment',
                label: 'Add Equipment',
                description: 'Set up your workout location',
                icon: <MapPin className="w-4 h-4" />,
                href: '/settings?open=locations',
                isCompleted: hasLocation || checklist.addedEquipment || false,
            },
            {
                id: 'firstWeightLog',
                label: 'Log Your Weight',
                description: 'Track your body weight progress',
                icon: <Scale className="w-4 h-4" />,
                href: '/progress',
                isCompleted: hasWeightLog || checklist.firstWeightLog || false,
            },
            {
                id: 'firstCardioSession',
                label: 'Log Cardio Session',
                description: 'Track a run, walk, or cycle',
                icon: <Flame className="w-4 h-4" />,
                href: '/dashboard',
                isCompleted: hasCardioWorkout || checklist.firstCardioSession || false,
            },
            {
                id: 'viewedProgress',
                label: 'Check Your Progress',
                description: 'View your analytics and trends',
                icon: <TrendingUp className="w-4 h-4" />,
                href: '/progress',
                isCompleted: hasViewedProgress,
            },
        ];
    }, [userProfile, workoutLogs, progressLogs, locations]);

    const completedCount = features.filter(f => f.isCompleted).length;
    const totalCount = features.length;
    const progressPercent = (completedCount / totalCount) * 100;
    const allComplete = completedCount === totalCount;

    // Don't show if dismissed or all complete
    if (userProfile?.dismissedDiscoveryChecklist || allComplete) {
        return null;
    }

    const handleDismiss = async () => {
        if (!userProfileRef) return;
        await setDocumentNonBlocking(userProfileRef, { dismissedDiscoveryChecklist: true }, { merge: true });
    };

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10">
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Get Started with fRepo
                        </CardTitle>
                        <CardDescription>
                            Complete these steps to unlock the full potential of your fitness journey
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={handleDismiss}
                        title="Dismiss checklist"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                            {completedCount}/{totalCount} complete
                            {completedCount > 0 && completedCount < totalCount && ' 🔥'}
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Feature list */}
                <div className="grid gap-2">
                    {features.map((feature) => (
                        <Link
                            key={feature.id}
                            href={feature.isCompleted ? '#' : feature.href}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${feature.isCompleted
                                ? 'bg-green-500/10 cursor-default'
                                : 'bg-background/50 hover:bg-background'
                                }`}
                            onClick={(e) => feature.isCompleted && e.preventDefault()}
                        >
                            <div className={`p-1.5 rounded-full ${feature.isCompleted
                                ? 'bg-green-500/20 text-green-600'
                                : 'bg-muted text-muted-foreground'
                                }`}>
                                {feature.isCompleted ? <Check className="w-4 h-4" /> : feature.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${feature.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                    {feature.label}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {feature.description}
                                </p>
                            </div>
                            {!feature.isCompleted && (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
