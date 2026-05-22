'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { type MuscleGroupIntensities } from './muscle-heatmap';
import { SVGBody, muscleDisplayNames } from './svg-body';
import type { UserProfile } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

interface HeatmapDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  view: 'front' | 'back';
  intensities: MuscleGroupIntensities;
  userProfile: UserProfile | null | undefined;
}

const getHue = (intensity: number) => {
  // Gradient: Blue (0%, hue 240) -> Green (50%, hue 100) -> Red (100%, hue 0)
  return intensity <= 0.5
    ? 240 - (intensity * 2 * 140) // Transition from Blue (240) to deeper Green (100)
    : 100 - ((intensity - 0.5) * 2 * 100); // Transition from Green (100) to Red (0)
};

export function HeatmapDetailModal({ isOpen, onOpenChange, view, intensities, userProfile }: HeatmapDetailModalProps) {
  const bodyType = userProfile?.biologicalSex || 'Male';
  const colorScheme = userProfile?.heatmapColorScheme || 'classic';

  if (!isOpen) return null;

  // Filter which muscle groups are relevant to the current view
  const relevantMuscleGroups = Object.keys(muscleDisplayNames).filter(group => {
    const isFront = ['chest', 'abs', 'biceps', 'quads', 'shoulders_front'].includes(group);
    const hasIntensity = (intensities[group] || 0) > 0;
    return hasIntensity && (view === 'front' ? isFront : !isFront);
  });

  // Sort groups by intensity descending
  relevantMuscleGroups.sort((a, b) => (intensities[b] || 0) - (intensities[a] || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-6 border border-border/50 bg-gradient-to-br from-card to-background shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold tracking-tight">
            {view === 'front' ? 'Front View' : 'Back View'} Muscle Intensity
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            A precise breakdown of vector muscle group engagement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-4">
          <div className="relative w-full max-w-[190px] mx-auto p-2 bg-slate-500/5 dark:bg-slate-500/10 rounded-xl border border-border/40">
            <SVGBody
              view={view}
              biologicalSex={bodyType}
              intensities={intensities}
              colorScheme={colorScheme}
            />
          </div>

          <div className="space-y-3">
            {relevantMuscleGroups.length > 0 ? (
              relevantMuscleGroups.map((group, index) => {
                const intensity = intensities[group] || 0;
                const hue = getHue(intensity);
                const percentage = (intensity * 100).toFixed(0);

                return (
                  <div key={group}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-sm border border-black/10 dark:border-white/10"
                          style={{
                            backgroundColor: colorScheme === 'monochrome'
                              ? `rgb(${Math.round(40 + intensity * 55)}, ${Math.round(40 + intensity * 55)}, ${Math.round(40 + intensity * 55)})`
                              : `hsl(${hue}, 90%, 50%)`
                          }}
                        />
                        <span className="font-semibold text-sm text-foreground">
                          {muscleDisplayNames[group] || group}
                        </span>
                      </div>
                      <span className="font-bold text-sm text-foreground/90">{percentage}%</span>
                    </div>
                    {index < relevantMuscleGroups.length - 1 && <Separator className="mt-3" />}
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 text-sm text-muted-foreground italic">
                No active fatigue tracked in this view
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
