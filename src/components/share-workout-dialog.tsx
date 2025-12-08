
'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { MuscleHeatmap } from '@/components/muscle-heatmap';
import Logo from '@/components/logo';
import type { WorkoutLog, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Flame, Trophy, Calendar, Dumbbell, Timer } from 'lucide-react';
import { format } from 'date-fns';

function ShareableSummaryCard({ log, userProfile, isVisible }: { log: WorkoutLog, userProfile: UserProfile, isVisible?: boolean }) {
    // Determine gradient based on intensity or just a cool default
    // Using a vibrant dark theme gradient
    const gradientClass = "bg-gradient-to-br from-indigo-900 via-purple-900 to-black";

    return (
        <div
            className={`relative overflow-hidden rounded-3xl w-[400px] h-[700px] text-white shadow-2xl ${gradientClass} ${isVisible ? '' : 'absolute -left-[9999px] top-0'}`}
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            {/* Background Texture/Effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-500 rounded-full blur-3xl opacity-20" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20" />

            <div className="relative z-10 flex flex-col h-full p-8 justify-between">

                {/* Header */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                <Logo className="h-6 w-6 text-white" />
                            </div>
                            <span className="font-bold text-lg tracking-wider opacity-90">FITNESS REPO</span>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-medium text-white/80">
                            {format(new Date(log.date), "MMM d, yyyy")}
                        </div>
                    </div>
                </div>

                {/* Main Content: Heatmap & Title */}
                <div className="flex flex-col items-center flex-1 justify-center space-y-6">
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                            WORKOUT
                        </h1>
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-tight leading-tight line-clamp-2 px-2">
                            {log.workoutName}
                        </h2>
                    </div>

                    <div className="relative w-full aspect-square max-w-[320px]">
                        {/* We pass a custom className or style to override default text colors for the dark card */}
                        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-4 shadow-inner border border-white/5">
                            <MuscleHeatmap
                                userProfile={userProfile}
                                thisWeeksLogs={[log]}
                                isLoading={false}
                                dateRangeLabel=""
                                isCard={false}
                                isSingleWorkout={true}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
                            <Dumbbell className="w-3 h-3" /> Volume
                        </div>
                        <span className="text-2xl font-black text-white">
                            {(log.volume / 1000).toFixed(1)}k <span className="text-sm font-normal text-white/60">lbs</span>
                        </span>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
                            <Timer className="w-3 h-3" /> Duration
                        </div>
                        <span className="text-2xl font-black text-white">
                            {log.duration}
                        </span>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-md rounded-2xl p-4 border border-orange-500/20 flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-orange-200 text-xs font-bold uppercase tracking-wider">
                            <Flame className="w-3 h-3 text-orange-400" /> Streak
                        </div>
                        <span className="text-2xl font-black text-orange-50">
                            {userProfile.currentStreak || 0} <span className="text-sm font-normal text-orange-200/70">days</span>
                        </span>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 backdrop-blur-md rounded-2xl p-4 border border-yellow-500/20 flex flex-col items-start space-y-1">
                        <div className="flex items-center gap-2 text-yellow-200 text-xs font-bold uppercase tracking-wider">
                            <Trophy className="w-3 h-3 text-yellow-400" /> Level
                        </div>
                        <span className="text-2xl font-black text-yellow-50">
                            {userProfile.level || 1}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">
                        Generated by Fitness Repo
                    </p>
                </div>
            </div>
        </div>
    );
}

interface ShareWorkoutDialogProps {
    log: WorkoutLog;
    userProfile: UserProfile;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function ShareWorkoutDialog({ log, userProfile, isOpen, onOpenChange }: ShareWorkoutDialogProps) {
    const { toast } = useToast();
    const shareCardRef = useRef<HTMLDivElement>(null);

    const handleShare = async () => {
        if (!shareCardRef.current || !log) return;

        const playStoreUrl = "https://play.google.com/store/apps/details?id=app.frepo.twa";
        const shareText = `I just crushed the '${log.workoutName}' workout on fRepo, lifting a total of ${log.volume.toLocaleString()} lbs! Come join me and track your own progress!`;

        try {
            const canvas = await html2canvas(shareCardRef.current, {
                useCORS: true,
                backgroundColor: null,
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

            if (blob && navigator.share && navigator.canShare) {
                const file = new File([blob], 'workout.png', { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'My fRepo Workout',
                        text: shareText,
                        url: playStoreUrl,
                        files: [file],
                    });
                    return;
                }
            }

            // Fallback for desktop or if image share fails
            const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(playStoreUrl)}&quote=${encodeURIComponent(shareText)}`;
            window.open(facebookShareUrl, '_blank', 'width=600,height=400');

        } catch (error) {
            console.error("Sharing failed:", error);
            toast({
                title: "Sharing Failed",
                description: "Could not share workout. Please try again.",
                variant: "destructive"
            });
            // Ensure fallback still runs if there's an error
            const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(playStoreUrl)}&quote=${encodeURIComponent(shareText)}`;
            window.open(facebookShareUrl, '_blank', 'width=600,height=400');
        }
    };

    return (
        <>
            <div ref={shareCardRef}>
                <ShareableSummaryCard log={log} userProfile={userProfile} isVisible={false} />
            </div>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Your Workout</DialogTitle>
                        <DialogDescription>
                            Here's a preview of the card you can share.
                        </DialogDescription>
                    </DialogHeader>

                    <ShareableSummaryCard log={log} userProfile={userProfile} isVisible={true} />

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button onClick={handleShare}>Share</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
