'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, addDoc, updateDoc, query, where } from 'firebase/firestore';
import { Sparkles, Trophy, ShoppingBag, Play, ChevronRight, Info, Calendar, Dumbbell, TrendingUp, Pause, ShoppingCart, Loader2, Lightbulb } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useBilling, getDisplayPrice } from '@/hooks/use-billing';

import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { ProgramCard } from '@/components/program-card';
import { FeedbackDialog } from '@/components/feedback-dialog';
import { getPrograms, getProgramById } from '@/lib/program-data';
import type { WorkoutProgram, UserProgramEnrollment, UserProfile } from '@/lib/types';

export default function ProgramsPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    // Billing hook for in-app purchases
    const { isAvailable: isBillingAvailable, isProgramOwned, purchaseProgram, productDetails } = useBilling();

    const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isPurchasing, setIsPurchasing] = useState(false);

    // Get all available programs
    const allPrograms = useMemo(() => getPrograms(), []);

    // User profile for active program
    const userProfileRef = useMemoFirebase(
        () => (user ? doc(firestore, `users/${user.uid}/profile/main`) : null),
        [firestore, user]
    );
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    // User's program enrollments
    const enrollmentsRef = useMemoFirebase(
        () => (user ? collection(firestore, `users/${user.uid}/programEnrollments`) : null),
        [firestore, user]
    );
    const { data: enrollments, isLoading: isLoadingEnrollments } = useCollection<UserProgramEnrollment>(enrollmentsRef);

    // Find enrollment for a program
    const getEnrollment = (programId: string) => {
        return enrollments?.find((e) => e.programId === programId && !e.isCompleted) || null;
    };

    // Get active enrollment
    const activeEnrollment = useMemo(() => {
        if (!userProfile?.activeProgramId || !enrollments) return null;
        return enrollments.find((e) => e.id === userProfile.activeProgramId) || null;
    }, [userProfile, enrollments]);

    // Separate owned and available programs
    const ownedPrograms = useMemo(() => {
        if (!enrollments) return [];
        const ownedIds = new Set(enrollments.map((e) => e.programId));
        return allPrograms.filter((p) => ownedIds.has(p.id) || p.price === 0);
    }, [allPrograms, enrollments]);

    const availablePrograms = useMemo(() => {
        if (!enrollments) return allPrograms.filter((p) => p.price > 0);
        const ownedIds = new Set(enrollments.map((e) => e.programId));
        return allPrograms.filter((p) => !ownedIds.has(p.id) && p.price > 0);
    }, [allPrograms, enrollments]);

    const handleSelectProgram = (program: WorkoutProgram) => {
        setSelectedProgram(program);
        setIsDetailOpen(true);
    };

    const handleStartProgram = async (program: WorkoutProgram) => {
        if (!user || !enrollmentsRef) return;

        setIsEnrolling(true);

        try {
            // Check if already enrolled
            const existingEnrollment = enrollments?.find((e) => e.programId === program.id && !e.isCompleted);

            if (existingEnrollment) {
                // Just set as active
                await setActiveProgram(existingEnrollment.id);
                toast({
                    title: 'Program Activated!',
                    description: `${program.name} is now your active program.`,
                });
            } else {
                // Create new enrollment
                const newEnrollment: Omit<UserProgramEnrollment, 'id'> = {
                    programId: program.id,
                    programName: program.name,
                    programIcon: program.icon,
                    durationWeeks: program.durationWeeks,
                    daysPerWeek: program.daysPerWeek,
                    purchasedAt: new Date().toISOString(),
                    startedAt: new Date().toISOString(),
                    currentWeek: 1,
                    workoutsCompletedThisWeek: 0,
                    totalWorkoutsCompleted: 0,
                    isCompleted: false,
                    isActive: true,
                    isPurchased: program.price === 0, // Free program is automatically "purchased"
                };

                const docRef = await addDoc(enrollmentsRef, newEnrollment);

                // Set as active program
                await setActiveProgram(docRef.id);

                toast({
                    title: 'Program Started! 🎉',
                    description: `You've started ${program.name}. Head to AI Guide to get your first workout!`,
                });
            }

            setIsDetailOpen(false);
            router.push('/guide');
        } catch (error) {
            console.error('Error starting program:', error);
            toast({
                title: 'Error',
                description: 'Failed to start program. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsEnrolling(false);
        }
    };

    const setActiveProgram = async (enrollmentId: string) => {
        if (!userProfileRef || !enrollmentsRef) return;

        // Update user profile
        await setDocumentNonBlocking(userProfileRef, { activeProgramId: enrollmentId }, { merge: true });

        // Mark all enrollments as inactive, then mark this one as active
        if (enrollments) {
            for (const enrollment of enrollments) {
                if (enrollment.id !== enrollmentId && enrollment.isActive) {
                    await updateDoc(doc(enrollmentsRef, enrollment.id), { isActive: false });
                }
            }
        }

        // Mark this enrollment as active
        await updateDoc(doc(enrollmentsRef, enrollmentId), { isActive: true });
    };

    const handleContinueProgram = async (enrollment: UserProgramEnrollment) => {
        if (!enrollment.isActive) {
            await setActiveProgram(enrollment.id);
            toast({
                title: 'Program Activated!',
                description: `${enrollment.programName} is now your active program.`,
            });
        }
        router.push('/guide');
    };

    const handlePauseProgram = async () => {
        if (!userProfileRef || !activeEnrollment || !enrollmentsRef) return;

        try {
            // Clear active program from profile
            await setDocumentNonBlocking(userProfileRef, { activeProgramId: null }, { merge: true });

            // Mark the enrollment as inactive (but keep progress)
            await updateDoc(doc(enrollmentsRef, activeEnrollment.id), { isActive: false });

            toast({
                title: 'Program Paused',
                description: 'You can resume anytime from the Programs page. AI will now suggest ad-hoc workouts.',
            });
        } catch (error) {
            console.error('Error pausing program:', error);
            toast({
                title: 'Error',
                description: 'Failed to pause program. Please try again.',
                variant: 'destructive',
            });
        }
    };

    const handlePurchaseProgram = async (program: WorkoutProgram) => {
        if (!user || !program) return;

        setIsPurchasing(true);
        try {
            const result = await purchaseProgram(program.id);

            if (result.success) {
                toast({
                    title: 'Purchase Successful! 🎉',
                    description: `You now own ${program.name}. Let's get started!`,
                });
                // After purchase, start the program
                await handleStartProgram(program);
            } else if (result.error !== 'Purchase cancelled') {
                toast({
                    title: 'Purchase Failed',
                    description: result.error || 'Something went wrong. Please try again.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error purchasing program:', error);
            toast({
                title: 'Error',
                description: 'Failed to complete purchase. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsPurchasing(false);
        }
    };

    const isLoading = isLoadingProfile || isLoadingEnrollments;
    const selectedProgramEnrollment = selectedProgram ? getEnrollment(selectedProgram.id) : null;

    // Check if selected program is owned (free or purchased)
    const isSelectedProgramOwned = selectedProgram
        ? isProgramOwned(selectedProgram.id, selectedProgram.price === 0, user?.email)
        : false;

    return (
        <>
            {/* Program Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    {selectedProgram && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-4xl sm:text-5xl shrink-0">{selectedProgram.icon}</span>
                                    <div className="min-w-0 flex-1">
                                        <DialogTitle className="text-lg sm:text-xl truncate">{selectedProgram.name}</DialogTitle>
                                        <DialogDescription className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <Badge variant="outline" className="text-xs">{selectedProgram.durationWeeks} weeks</Badge>
                                            <Badge variant="outline" className="text-xs">{selectedProgram.daysPerWeek}x/week</Badge>
                                            <Badge
                                                className={`text-xs ${selectedProgram.difficulty === 'beginner'
                                                        ? 'bg-green-500/20 text-green-600'
                                                        : selectedProgram.difficulty === 'intermediate'
                                                            ? 'bg-yellow-500/20 text-yellow-600'
                                                            : 'bg-red-500/20 text-red-600'
                                                    }`}
                                            >
                                                {selectedProgram.difficulty}
                                            </Badge>
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-4">
                                <p className="text-muted-foreground">{selectedProgram.description}</p>

                                {/* Weekly Progression */}
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                                        <Calendar className="h-4 w-4" /> Weekly Progression
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedProgram.weeklyProgression.map((week) => (
                                            <div
                                                key={week.week}
                                                className={`p-3 rounded-lg border ${selectedProgramEnrollment?.currentWeek === week.week
                                                    ? 'bg-primary/10 border-primary'
                                                    : 'bg-muted/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">
                                                        Week {week.week}: {week.phase}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            week.intensityModifier === 'brutal'
                                                                ? 'bg-red-500/20 text-red-600 border-red-500/30'
                                                                : week.intensityModifier === 'high'
                                                                    ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30'
                                                                    : ''
                                                        }
                                                    >
                                                        {week.intensityModifier}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">{week.focusNotes}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Focus Areas */}
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                                        <Dumbbell className="h-4 w-4" /> Focus Areas
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedProgram.primaryMuscles.map((muscle) => (
                                            <Badge key={muscle} variant="default" className="capitalize">
                                                {muscle.replace(/_/g, ' ')}
                                            </Badge>
                                        ))}
                                        {selectedProgram.secondaryMuscles.map((muscle) => (
                                            <Badge key={muscle} variant="secondary" className="capitalize">
                                                {muscle.replace(/_/g, ' ')}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                {isSelectedProgramOwned || selectedProgramEnrollment?.isPurchased ? (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleStartProgram(selectedProgram)}
                                        disabled={isEnrolling}
                                    >
                                        {isEnrolling ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting...
                                            </>
                                        ) : selectedProgramEnrollment ? (
                                            <>
                                                <Play className="h-4 w-4 mr-2" /> Continue Program
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4 mr-2" /> Start Program
                                            </>
                                        )}
                                    </Button>
                                ) : isBillingAvailable ? (
                                    <Button
                                        className="w-full"
                                        onClick={() => handlePurchaseProgram(selectedProgram)}
                                        disabled={isPurchasing}
                                    >
                                        {isPurchasing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="h-4 w-4 mr-2" />
                                                Buy for ${(selectedProgram.price / 100).toFixed(2)}
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button className="w-full" variant="secondary" disabled>
                                        Purchase in Play Store App - ${(selectedProgram.price / 100).toFixed(2)}
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Programs</h1>
                        <p className="text-muted-foreground">Structured workout plans to reach your goals</p>
                    </div>
                </div>

                {/* Active Program Banner */}
                {activeEnrollment && (
                    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30">
                        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{activeEnrollment.programIcon}</span>
                                <div>
                                    <p className="font-semibold">{activeEnrollment.programName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Week {activeEnrollment.currentWeek} of {activeEnrollment.durationWeeks} •{' '}
                                        {activeEnrollment.workoutsCompletedThisWeek}/{activeEnrollment.daysPerWeek} workouts this week
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button variant="outline" size="sm" onClick={handlePauseProgram} className="flex-1 sm:flex-none">
                                    <Pause className="h-4 w-4 mr-1" /> Pause
                                </Button>
                                <Button size="sm" onClick={() => router.push('/guide')} className="flex-1 sm:flex-none">
                                    Continue <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="your-programs" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="your-programs" className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" /> Your Programs
                        </TabsTrigger>
                        <TabsTrigger value="store" className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" /> Store
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="your-programs" className="space-y-4">
                        {isLoading ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-64" />
                                ))}
                            </div>
                        ) : ownedPrograms.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {ownedPrograms.map((program) => (
                                    <ProgramCard
                                        key={program.id}
                                        program={program}
                                        enrollment={getEnrollment(program.id)}
                                        onSelect={handleSelectProgram}
                                        onStart={handleStartProgram}
                                        onContinue={handleContinueProgram}
                                        onPurchase={handlePurchaseProgram}
                                        variant="enrolled"
                                        isBillingAvailable={isBillingAvailable}
                                        isProgramOwned={isProgramOwned(program.id, program.price === 0, user?.email)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="text-center py-12">
                                <CardContent>
                                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">No Programs Yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Get started with a free program or browse the store!
                                    </p>
                                    <Button onClick={() => (document.querySelector('[value="store"]') as HTMLElement)?.click()}>
                                        Browse Programs
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="store" className="space-y-6">
                        {/* Free Programs */}
                        <div>
                            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-green-500" /> Free Programs
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {allPrograms
                                    .filter((p) => p.price === 0)
                                    .map((program) => (
                                        <ProgramCard
                                            key={program.id}
                                            program={program}
                                            enrollment={getEnrollment(program.id)}
                                            onSelect={handleSelectProgram}
                                            onStart={handleStartProgram}
                                            onContinue={handleContinueProgram}
                                            onPurchase={handlePurchaseProgram}
                                            isBillingAvailable={isBillingAvailable}
                                            isProgramOwned={isProgramOwned(program.id, program.price === 0, user?.email)}
                                        />
                                    ))}
                            </div>
                        </div>

                        {/* Premium Programs */}
                        <div>
                            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" /> Premium Programs
                            </h2>
                            {availablePrograms.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {availablePrograms.map((program) => (
                                        <ProgramCard
                                            key={program.id}
                                            program={program}
                                            enrollment={getEnrollment(program.id)}
                                            onSelect={handleSelectProgram}
                                            onStart={handleStartProgram}
                                            onContinue={handleContinueProgram}
                                            onPurchase={handlePurchaseProgram}
                                            isBillingAvailable={isBillingAvailable}
                                            isProgramOwned={isProgramOwned(program.id, program.price === 0, user?.email)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Card className="text-center py-8">
                                    <CardContent>
                                        <Trophy className="h-10 w-10 mx-auto text-yellow-500 mb-3" />
                                        <p className="text-muted-foreground">You own all available programs!</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Coming Soon Notice */}
                        <Card className="bg-muted/50">
                            <CardContent className="flex items-center justify-between gap-3 p-4">
                                <div className="flex items-center gap-3">
                                    <Info className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <p className="text-sm text-muted-foreground">
                                        More programs coming soon!
                                    </p>
                                </div>
                                <FeedbackDialog
                                    type="suggestion"
                                    category="program"
                                    trigger={
                                        <Button variant="outline" size="sm" className="shrink-0">
                                            <Lightbulb className="h-4 w-4 mr-2" />
                                            Suggest a Program
                                        </Button>
                                    }
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}
