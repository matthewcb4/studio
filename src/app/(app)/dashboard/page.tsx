"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isWithinInterval, subDays } from "date-fns";
import { useCollection, useUser, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking, addDoc, addDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import type { CustomWorkout, WorkoutLog, UserProfile, ProgressLog, Exercise, LoggedSet, UserEquipment, WorkoutLocation } from "@/lib/types";
import { Dumbbell, Target, TrendingDown, TrendingUp, Star, Play, Plus, Zap, Trophy, Flame } from "lucide-react";
import { MuscleHeatmap, type MuscleGroupIntensities } from "@/components/muscle-heatmap";
import { HeatmapDetailModal } from "@/components/heatmap-detail-modal";
import { OnboardingModal } from "@/components/onboarding-modal";
import { MuscleGroupVolumeChart } from "@/components/muscle-group-chart";
import { QuickLogForm } from "@/components/quick-log-form";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";


const parseDuration = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
        const [minutes, seconds] = parts.map(Number);
        return minutes * 60 + seconds;
    }
    return 0;
};

function UserStatsCard({ userProfile }: { userProfile: UserProfile | null | undefined }) {
    if (!userProfile) return null;

    const level = userProfile.level || 1;
    const xp = userProfile.xp || 0;
    const progress = (xp % 1000) / 10; // (XP % 1000) / 1000 * 100

    return (
        <Card className="bg-gradient-to-br from-card to-secondary/30">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                    <span>Level {level}</span>
                    <Trophy className="w-5 h-5 text-yellow-500" />
                </CardTitle>
                <CardDescription>User Stats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>XP Progress</span>
                        <span className="text-muted-foreground">{xp % 1000} / 1000</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-2 bg-background/50 rounded-lg">
                        <Flame className="w-6 h-6 text-orange-500 mb-1" />
                        <span className="text-2xl font-bold">{userProfile.currentStreak || 0}</span>
                        <span className="text-xs text-muted-foreground">Day Streak</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-background/50 rounded-lg">
                        <Zap className="w-6 h-6 text-blue-500 mb-1" />
                        <span className="text-xs font-bold mt-1">
                            {(userProfile.lifetimeVolume || 0).toLocaleString()} lbs
                        </span>
                        <span className="text-xs text-muted-foreground">Lifetime Volume</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ProgressSummaryCard() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() =>
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
        , [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    const progressLogsQuery = useMemoFirebase(() =>
        user ? query(collection(firestore, `users/${user.uid}/progressLogs`), orderBy("date", "desc"), limit(1)) : null
        , [firestore, user]);
    const { data: latestProgress, isLoading: isLoadingProgress } = useCollection<ProgressLog>(progressLogsQuery);

    const isLoading = isLoadingProfile || isLoadingProgress;
    const currentWeight = latestProgress?.[0]?.weight;
    const targetWeight = userProfile?.targetWeight;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Progress Summary</CardTitle>
                    <CardDescription>Loading your progress...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">Calculating...</div>
                </CardContent>
            </Card>
        );
    }

    if (!targetWeight) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Set Your Goal</CardTitle>
                    <CardDescription>Add a target weight in settings to see your progress.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/settings">Go to Settings</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (!currentWeight) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Log Your Weight</CardTitle>
                    <CardDescription>Log your weight on the progress page to see your status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/progress">Log Progress</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const diff = Math.round((currentWeight - targetWeight) * 10) / 10;
    const isAbove = diff > 0;
    const isAtGoal = diff === 0;

    let message;
    if (isAtGoal) {
        message = "You've hit your target weight. Amazing work!";
    } else if (isAbove) {
        message = `You are ${diff} lbs above your target. Keep pushing!`;
    } else {
        message = `You are ${Math.abs(diff)} lbs away from your target. You're getting closer!`;
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Progress to Goal</CardTitle>
                <CardDescription>Your journey to {targetWeight} lbs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    {isAtGoal ? <Target className="w-8 h-8 text-green-500" /> : isAbove ? <TrendingDown className="w-8 h-8 text-yellow-500" /> : <TrendingUp className="w-8 h-8 text-blue-500" />}
                    <div className="text-3xl font-bold">{currentWeight} <span className="text-lg text-muted-foreground">lbs</span></div>
                </div>
                <p className="text-sm text-muted-foreground">{message}</p>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
    const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
    const [dateRange, setDateRange] = useState('7');

    const [heatmapModalOpen, setHeatmapModalOpen] = useState(false);
    const [selectedHeatmapView, setSelectedHeatmapView] = useState<'front' | 'back' | null>(null);
    const [muscleIntensities, setMuscleIntensities] = useState<MuscleGroupIntensities>({});

    const [workoutToStart, setWorkoutToStart] = useState<CustomWorkout | null>(null);



    const customWorkoutsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/customWorkouts`);
    }, [firestore, user]);
    const { data: customWorkouts, isLoading: isLoadingWorkouts } = useCollection<CustomWorkout>(customWorkoutsQuery);

    const allWorkoutLogsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
    }, [firestore, user]);

    const { data: allLogs, isLoading: isLoadingLogs } = useCollection<WorkoutLog>(allWorkoutLogsQuery);

    const filteredLogs = useMemo(() => {
        if (!allLogs) return [];
        const now = new Date();
        const days = parseInt(dateRange, 10);
        const startDate = subDays(now, days);

        return allLogs.filter(log => {
            const logDate = new Date(log.date);
            return isWithinInterval(logDate, { start: startDate, end: now });
        });
    }, [allLogs, dateRange]);


    const exercisesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'exercises'), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);

    const userProfileRef = useMemoFirebase(() =>
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
        , [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    // Equipment collection (for migration)
    const equipmentCollection = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/equipment`) : null
        , [firestore, user]);
    const { data: oldEquipment, isLoading: isLoadingEquipment } = useCollection<UserEquipment>(equipmentCollection);

    // Locations collection
    const locationsCollection = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/locations`) : null
        , [firestore, user]);
    const { data: locations, isLoading: isLoadingLocations } = useCollection<WorkoutLocation>(locationsCollection);

    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (userProfile && !userProfile.hasCompletedOnboarding) {
            // Use a timeout to ensure the state update doesn't happen during the initial render
            const timer = setTimeout(() => setShowOnboarding(true), 50);
            return () => clearTimeout(timer);
        }
    }, [userProfile]);

    // Migration: Create "Home" location from existing equipment for users without locations
    useEffect(() => {
        const migrateEquipment = async () => {
            // Wait for all data to load
            if (isLoadingLocations || isLoadingEquipment || !user || !locationsCollection) return;

            // Only migrate if user has no locations but has old equipment
            if (locations && locations.length > 0) return;
            if (!oldEquipment || oldEquipment.length === 0) return;

            console.log('Migrating equipment to Home location...');

            const homeLocation: Omit<WorkoutLocation, 'id'> = {
                userId: user.uid,
                name: "Home",
                equipment: oldEquipment.map(e => e.name),
                icon: "🏠",
                type: 'home',
                isDefault: true,
                createdAt: new Date().toISOString(),
            };

            try {
                const newLocationDoc = await addDocumentNonBlocking(locationsCollection, homeLocation);

                // Update profile with active location
                if (userProfileRef && newLocationDoc) {
                    await setDocumentNonBlocking(userProfileRef, {
                        activeLocationId: newLocationDoc.id,
                    }, { merge: true });
                }

                console.log('Equipment migration complete!');
            } catch (error) {
                console.error('Error migrating equipment:', error);
            }
        };

        migrateEquipment();
    }, [user, locations, oldEquipment, isLoadingLocations, isLoadingEquipment, locationsCollection, userProfileRef]);


    const loggingExercise = useMemo(() => {
        if (selectedExerciseId && masterExercises) {
            return masterExercises.find(ex => ex.id === selectedExerciseId) || null;
        }
        return null;
    }, [selectedExerciseId, masterExercises]);

    const handleHeatmapView = (view: 'front' | 'back') => {
        setSelectedHeatmapView(view);
        setHeatmapModalOpen(true);
    };

    const handleOnboardingComplete = () => {
        if (userProfileRef) {
            const updates: Partial<UserProfile> = { hasCompletedOnboarding: true };
            // Set default equipment if none exists
            if (!userProfile?.availableEquipment || userProfile.availableEquipment.length === 0) {
                updates.availableEquipment = ['Bodyweight'];
            }
            setDocumentNonBlocking(userProfileRef, updates, { merge: true });
        }
        setShowOnboarding(false);
        router.push('/settings?open=fitness-goals');
    };

    const handleQuickLog = async (exercise: Exercise, sets: LoggedSet[]) => {
        if (!user) return;

        const totalVolume = sets.reduce((acc, set) => acc + (set.weight || 0) * (set.reps || 0), 0);

        const workoutLog = {
            userId: user.uid,
            workoutName: `Quick Log: ${exercise.name}`,
            date: new Date().toISOString(),
            duration: "00:00", // Not tracked for quick logs
            exercises: [{
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                sets: sets
            }],
            volume: totalVolume,
        };
        const logsCollection = collection(firestore, `users/${user.uid}/workoutLogs`);
        await addDoc(logsCollection, workoutLog);
        toast({
            title: "Exercise Logged!",
            description: `${exercise.name} has been added to your history.`
        });
        setIsQuickLogOpen(false);
        setSelectedExerciseId(null);
    };

    const recentLogs = useMemo(() => allLogs?.slice(0, 5) || [], [allLogs]);

    const dashboardStats = useMemo(() => {
        const volume = filteredLogs.reduce((acc, log) => acc + (log.volume || 0), 0);
        const workouts = filteredLogs.length;
        const timeInSeconds = filteredLogs.reduce((acc, log) => acc + parseDuration(log.duration), 0);
        const timeInMinutes = Math.floor(timeInSeconds / 60);

        return { volume, workouts, time: timeInMinutes };
    }, [filteredLogs]);

    const hasData = useMemo(() => (allLogs?.length || 0) > 0, [allLogs]);

    const dateRangeLabel = useMemo(() => {
        const option = {
            '1': "Last 24 hours",
            '3': "Last 3 days",
            '7': "Last 7 days",
            '14': "Last 14 days",
            '30': "Last 30 days",
        }[dateRange];
        return option || `Last ${dateRange} days`;
    }, [dateRange]);

    const isLoading = isLoadingLogs;
    // Only wait for exercises if we actually have logs to map them to.
    // If logs are loaded and empty, we can render the empty state immediately.
    const shouldWaitForExercises = hasData && isLoadingExercises;

    const exerciseOptions = useMemo(() => {
        if (!masterExercises) return [];
        return masterExercises.map(ex => ({ value: ex.id, label: ex.name }));
    }, [masterExercises]);

    // Prioritize recent workouts for Quick Start
    const quickStartWorkouts = useMemo(() => {
        if (!customWorkouts) return [];
        // Simple logic: just show the most recently created for now
        // A better enhancement later would be to track 'lastPlayed'
        return [...customWorkouts].sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return dateB - dateA;
        }).slice(0, 3);
    }, [customWorkouts]);


    return (
        <>
            <OnboardingModal isOpen={showOnboarding} onOpenChange={setShowOnboarding} onComplete={handleOnboardingComplete} />

            {selectedHeatmapView && (
                <HeatmapDetailModal
                    isOpen={heatmapModalOpen}
                    onOpenChange={setHeatmapModalOpen}
                    view={selectedHeatmapView}
                    intensities={muscleIntensities}
                    userProfile={userProfile}
                />
            )}

            <div className="flex flex-col gap-4 md:gap-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <div className="w-[180px]">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Time range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Last 24 hours</SelectItem>
                                <SelectItem value="3">Last 3 days</SelectItem>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="14">Last 14 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <UserStatsCard userProfile={userProfile} />

                    <Card className="lg:col-span-1 flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle>Quick Start</CardTitle>
                            <CardDescription>
                                Jump back into your recent routines.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-3">
                            {isLoadingWorkouts ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : quickStartWorkouts.length > 0 ? (
                                <div className="space-y-2">
                                    {quickStartWorkouts.map(workout => (
                                        <div key={workout.id}>
                                            <Button
                                                variant="secondary"
                                                className="w-full justify-between"
                                                onClick={() => setWorkoutToStart(workout)}
                                            >
                                                <span className="truncate">{workout.name}</span>
                                                <Play className="h-4 w-4 ml-2 opacity-50" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                    <p className="text-sm text-muted-foreground mb-4">No custom workouts yet.</p>
                                    <Button size="sm" asChild>
                                        <Link href="/workouts?edit=new">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create One
                                        </Link>
                                    </Button>
                                </div>
                            )}
                            {quickStartWorkouts.length > 0 && (
                                <Button variant="ghost" size="sm" className="w-full mt-auto" asChild>
                                    <Link href="/workouts">View All Workouts</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {hasData ? (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle>Total Volume</CardTitle>
                                <CardDescription>{dateRangeLabel}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{dashboardStats.volume.toLocaleString()} lbs</div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 text-center">
                            <Dumbbell className="mx-auto h-12 w-12 text-muted-foreground" />
                            <CardTitle className="mt-4">Start Your Journey</CardTitle>
                            <CardDescription>
                                Complete your first workout to unlock your dashboard.
                            </CardDescription>
                            <Button className="mt-4" asChild>
                                <Link href="/workouts">Browse Workouts</Link>
                            </Button>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Log</CardTitle>
                            <CardDescription>
                                Log a single exercise on the fly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                <Combobox
                                    options={exerciseOptions || []}
                                    value={selectedExerciseId || ''}
                                    onSelect={setSelectedExerciseId}
                                    placeholder="Select an exercise..."
                                    searchPlaceholder="Search exercises..."
                                />
                                <Button disabled={!selectedExerciseId} onClick={() => setIsQuickLogOpen(true)}>Log Exercise</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <ProgressSummaryCard />

                    <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <MuscleHeatmap
                            userProfile={userProfile}
                            thisWeeksLogs={filteredLogs}
                            isLoading={isLoading}
                            dateRangeLabel={dateRangeLabel}
                            onIntensitiesChange={setMuscleIntensities}
                            onViewClick={handleHeatmapView}
                        />
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <MuscleGroupVolumeChart
                            filteredLogs={filteredLogs}
                            masterExercises={masterExercises}
                            isLoading={isLoading || shouldWaitForExercises}
                            dateRangeLabel={dateRangeLabel}
                        />
                    </div>

                    <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>
                                A log of your most recent workouts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Workout</TableHead>
                                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                                        <TableHead className="hidden sm:table-cell">Rating</TableHead>
                                        <TableHead className="text-right">Total Volume</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingLogs && (
                                        <>
                                            <TableRow>
                                                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                                            </TableRow>
                                        </>
                                    )}
                                    {!isLoadingLogs && recentLogs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No recent workouts found.</TableCell></TableRow>}
                                    {recentLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div className="font-medium">{log.workoutName}</div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {format(new Date(log.date), "PPP")}
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                {log.rating ? (
                                                    <div className="flex items-center">
                                                        {log.rating} <Star className="w-3 h-3 ml-1 fill-primary text-primary" />
                                                    </div>
                                                ) : "-"}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {log.volume?.toLocaleString() || 0} lbs
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <Dialog open={isQuickLogOpen} onOpenChange={(open) => { if (!open) { setSelectedExerciseId(null); setIsQuickLogOpen(false); } }}>
                    <DialogContent>
                        {loggingExercise && <QuickLogForm exercise={loggingExercise} onLog={(sets) => handleQuickLog(loggingExercise, sets)} onCancel={() => { setIsQuickLogOpen(false); setSelectedExerciseId(null); }} />}
                    </DialogContent>
                </Dialog>
            </div>

            <AlertDialog open={!!workoutToStart} onOpenChange={(open) => !open && setWorkoutToStart(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Start "{workoutToStart?.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you ready to begin this workout?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            if (workoutToStart) {
                                router.push(`/workout/${workoutToStart.id}`);
                            }
                        }}>
                            Start Workout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
