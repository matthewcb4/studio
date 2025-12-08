
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
        // Capture the off-screen, fixed-size card for perfect consistency
        const cardElement = document.getElementById('hidden-share-card');
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
        const cardElement = document.getElementById('hidden-share-card');
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
                </Button>
                <Button onClick={handleShare} className="gap-2">
                    <Share2 className="h-4 w-4" /> Share
                </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog >
    );
}

