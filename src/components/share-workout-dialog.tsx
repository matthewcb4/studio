
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
import type { WorkoutLog, UserProfile, PRResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Flame, Trophy, Calendar, Dumbbell, Timer, Download, Share2, Medal } from 'lucide-react';
import { format } from 'date-fns';

function ShareableSummaryCard({ log, userProfile, prs = [] }: { log: WorkoutLog, userProfile: UserProfile, prs?: (PRResult & { exerciseId: string })[] }) {
    // Determine gradient based on intensity or just a cool default
    // Using a vibrant dark theme gradient
    const gradientClass = "bg-gradient-to-br from-indigo-900 via-purple-900 to-black";

    return (
        <div
            className={`relative overflow-hidden rounded-3xl w-full max-w-[360px] aspect-[9/16] text-white shadow-2xl ${gradientClass} mx-auto`}
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            {/* Background Texture/Effects */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-500 rounded-full blur-3xl opacity-20" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20" />

            <div className="relative z-10 flex flex-col h-full p-6 justify-between">

                {/* Header */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-xl">
                                <Logo className="h-5 w-5 text-white" />
                            </div>
                            <span className="font-bold text-base tracking-wider opacity-90">FITNESS REPO</span>
                        </div>
                        <div className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-medium text-white/80">
                            {format(new Date(log.date), "MMM d, yyyy")}
                        </div>
                    </div>
                </div>

                {/* Main Content: Heatmap & Title */}
                <div className="flex flex-col items-center flex-1 justify-center space-y-2 my-1">
                    <div className="text-center space-y-0.5">
                        <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                            WORKOUT
                        </h1>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 uppercase tracking-tight leading-tight line-clamp-2 px-2">
                            {log.workoutName}
                        </h2>
                    </div>

                    <div className="relative w-full aspect-square max-w-[240px]">
                        {/* We pass a custom className or style to override default text colors for the dark card */}
                        <div className="bg-white/5 rounded-3xl p-3 shadow-inner border border-white/5 w-full h-full flex items-center justify-center">
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
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10 flex flex-col items-start space-y-0.5">
                        <div className="flex items-center gap-1.5 text-white/60 text-[10px] font-bold uppercase tracking-wider">
                            <Dumbbell className="w-3 h-3" /> Volume
                        </div>
                        <span className="text-lg font-black text-white">
                            {(log.volume / 1000).toFixed(1)}k <span className="text-xs font-normal text-white/60">lbs</span>
                        </span>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10 flex flex-col items-start space-y-0.5">
                        <div className="flex items-center gap-1.5 text-white/60 text-[10px] font-bold uppercase tracking-wider">
                            <Timer className="w-3 h-3" /> Duration
                        </div>
                        <span className="text-lg font-black text-white">
                            {log.duration}
                        </span>
                    </div>

                    {prs.length > 0 ? (
                        <div className="bg-yellow-500/20 rounded-2xl p-2.5 border border-yellow-500/20 flex flex-col items-start space-y-0.5 col-span-2">
                            <div className="flex items-center gap-1.5 text-yellow-200 text-[10px] font-bold uppercase tracking-wider">
                                <Medal className="w-3 h-3 text-yellow-400" /> New Records
                            </div>
                            <span className="text-lg font-black text-yellow-50">
                                {prs.length} <span className="text-xs font-normal text-yellow-200/70">PRs Broken</span>
                            </span>
                        </div>
                    ) : (
                        <div className="bg-orange-500/20 rounded-2xl p-2.5 border border-orange-500/20 flex flex-col items-start space-y-0.5">
                            <div className="flex items-center gap-1.5 text-orange-200 text-[10px] font-bold uppercase tracking-wider">
                                <Flame className="w-3 h-3 text-orange-400" /> Streak
                            </div>
                            <span className="text-lg font-black text-orange-50">
                                {userProfile.currentStreak || 0} <span className="text-xs font-normal text-orange-200/70">days</span>
                            </span>
                        </div>
                    )}

                    {prs.length === 0 && (
                        <div className="bg-purple-500/20 rounded-2xl p-2.5 border border-purple-500/20 flex flex-col items-start space-y-0.5">
                            <div className="flex items-center gap-1.5 text-purple-200 text-[10px] font-bold uppercase tracking-wider">
                                <Trophy className="w-3 h-3 text-purple-400" /> Level
                            </div>
                            <span className="text-lg font-black text-purple-50">
                                {userProfile.level || 1}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-[8px] uppercase tracking-[0.2em] text-white/40 font-bold">
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
    prs?: (PRResult & { exerciseId: string })[];
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function ShareWorkoutDialog({ log, userProfile, prs, isOpen, onOpenChange }: ShareWorkoutDialogProps) {
    const { toast } = useToast();
    const shareCardRef = useRef<HTMLDivElement>(null);

    const handleShare = async () => {
        // Find the div inside the dialog
        const cardElement = document.getElementById('share-card-container');
        if (!cardElement || !log) return;

        const playStoreUrl = "https://play.google.com/store/apps/details?id=app.frepo.twa";
        const shareText = `I just crushed the '${log.workoutName}' workout on fRepo, lifting a total of ${log.volume.toLocaleString()} lbs! Come join me and track your own progress!`;

        try {
            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 2, // Higher quality
                backgroundColor: null,
            });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

            if (blob && navigator.share && navigator.canShare) {
                const file = new File([blob], 'workout.png', { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'My fRepo Workout',
                        text: `${shareText}\n\n${playStoreUrl}`,
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

    const handleDownload = async () => {
        const cardElement = document.getElementById('share-card-container');
        if (!cardElement || !log) return;
        try {
            const canvas = await html2canvas(cardElement, {
                useCORS: true,
                scale: 2,
                backgroundColor: null,
            });
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `frepo-workout-${format(new Date(log.date), 'yyyy-MM-dd')}.png`;
            link.href = url;
            link.click();
            toast({ title: "Image Saved", description: "Workout card downloaded to your device." });
        } catch (error) {
            console.error("Download failed:", error);
            toast({ title: "Download Failed", description: "Could not save image.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Your Workout</DialogTitle>
                    <DialogDescription>
                        Here's a preview of the card you can share.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-center p-2" id="share-card-container">
                    <ShareableSummaryCard log={log} userProfile={userProfile} prs={prs} />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="outline" onClick={handleDownload} className="gap-2">
                        <Download className="h-4 w-4" /> Save Image
                    </Button>
                    <Button onClick={handleShare} className="gap-2">
                        <Share2 className="h-4 w-4" /> Share
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

