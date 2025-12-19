'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { WorkoutProgram, UserProgramEnrollment } from '@/lib/types';
import { Check, Clock, Dumbbell, Lock, Play, Star } from 'lucide-react';

interface ProgramCardProps {
    program: WorkoutProgram;
    enrollment?: UserProgramEnrollment | null;
    onSelect: (program: WorkoutProgram) => void;
    onStart?: (program: WorkoutProgram) => void;
    onContinue?: (enrollment: UserProgramEnrollment) => void;
    variant?: 'store' | 'enrolled';
}

export function ProgramCard({
    program,
    enrollment,
    onSelect,
    onStart,
    onContinue,
    variant = 'store',
}: ProgramCardProps) {
    const isOwned = enrollment?.isPurchased || program.price === 0;
    const isActive = enrollment?.isActive;
    const isCompleted = enrollment?.isCompleted;
    const isFree = program.price === 0;

    // Calculate progress if enrolled
    const progressPercent = enrollment
        ? ((enrollment.currentWeek - 1) / program.durationWeeks) * 100 +
        (enrollment.workoutsCompletedThisWeek / program.daysPerWeek / program.durationWeeks) * 100
        : 0;

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner':
                return 'bg-green-500/20 text-green-600 dark:text-green-400';
            case 'intermediate':
                return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
            case 'advanced':
                return 'bg-red-500/20 text-red-600 dark:text-red-400';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    return (
        <Card
            className={`relative overflow-hidden transition-all hover:shadow-lg cursor-pointer ${isActive ? 'ring-2 ring-primary' : ''
                } ${isCompleted ? 'opacity-75' : ''}`}
            onClick={() => onSelect(program)}
        >
            {/* Active indicator */}
            {isActive && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-0.5 text-xs font-medium rounded-bl-lg">
                    Active
                </div>
            )}

            {/* Completed indicator */}
            {isCompleted && !isActive && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-2 py-0.5 text-xs font-medium rounded-bl-lg flex items-center gap-1">
                    <Check className="h-3 w-3" /> Completed
                </div>
            )}

            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <span className="text-4xl">{program.icon}</span>
                    {!isOwned && (
                        <Badge variant="secondary" className="font-semibold">
                            {isFree ? (
                                'FREE'
                            ) : (
                                <>
                                    <Lock className="h-3 w-3 mr-1" />
                                    ${(program.price / 100).toFixed(2)}
                                </>
                            )}
                        </Badge>
                    )}
                    {isOwned && !enrollment && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            <Check className="h-3 w-3 mr-1" /> Owned
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-lg mt-2">{program.name}</CardTitle>
                <CardDescription className="line-clamp-2">{program.shortDescription}</CardDescription>
            </CardHeader>

            <CardContent className="pb-3">
                <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {program.durationWeeks} weeks
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        <Dumbbell className="h-3 w-3 mr-1" />
                        {program.daysPerWeek}x/week
                    </Badge>
                    <Badge className={`text-xs ${getDifficultyColor(program.difficulty)}`}>
                        {program.difficulty.charAt(0).toUpperCase() + program.difficulty.slice(1)}
                    </Badge>
                </div>

                {/* Progress bar for enrolled programs */}
                {enrollment && !isCompleted && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Week {enrollment.currentWeek} of {program.durationWeeks}</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0">
                {!isOwned && (
                    <Button
                        className="w-full"
                        variant={isFree ? 'default' : 'secondary'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart?.(program);
                        }}
                    >
                        {isFree ? 'Get Free' : 'Purchase'}
                    </Button>
                )}

                {isOwned && !enrollment && (
                    <Button
                        className="w-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart?.(program);
                        }}
                    >
                        <Play className="h-4 w-4 mr-2" /> Start Program
                    </Button>
                )}

                {enrollment && !isCompleted && (
                    <Button
                        className="w-full"
                        variant={isActive ? 'default' : 'secondary'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onContinue?.(enrollment);
                        }}
                    >
                        {isActive ? (
                            <>
                                <Play className="h-4 w-4 mr-2" /> Continue
                            </>
                        ) : (
                            'Make Active'
                        )}
                    </Button>
                )}

                {isCompleted && (
                    <Button
                        className="w-full"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStart?.(program);
                        }}
                    >
                        <Star className="h-4 w-4 mr-2" /> Restart
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
