
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

function ShareableSummaryCard({ log, userProfile, isVisible }: { log: WorkoutLog, userProfile: UserProfile, isVisible?: boolean }) {
    return (
        <div className={`bg-background rounded-lg p-6 w-[400px] ${isVisible ? '' : 'absolute -left-[9999px] top-0'}`}>
           <div className="flex justify-between items-start mb-4">
               <div>
                   <h3 className="text-2xl font-bold text-primary">{log.workoutName}</h3>
                   <p className="text-sm text-muted-foreground">Workout Complete!</p>
               </div>
               <Logo className="h-10 w-10" />
           </div>

           <div className="grid grid-cols-2 gap-4 text-center mb-6">
               <div>
                   <p className="text-xs text-muted-foreground">Time</p>
                   <p className="text-2xl font-bold">{log.duration}</p>
               </div>
               <div>
                   <p className="text-xs text-muted-foreground">Volume</p>
                   <p className="text-2xl font-bold">{log.volume.toLocaleString()} lbs</p>
               </div>
           </div>
           
           <MuscleHeatmap userProfile={userProfile} thisWeeksLogs={[log]} isLoading={false} dateRangeLabel="this workout" isCard={false} isSingleWorkout={true} />
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
        <ShareableSummaryCard log={log} userProfile={userProfile} isVisible={false}/>
      </div>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Share Your Workout</DialogTitle>
                <DialogDescription>
                    Here's a preview of the card you can share.
                </DialogDescription>
            </DialogHeader>
            
            <ShareableSummaryCard log={log} userProfile={userProfile} isVisible={true}/>

            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button onClick={handleShare}>Share</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
