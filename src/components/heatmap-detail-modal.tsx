
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HeatPoint, heatmapCoordinates, type MuscleGroupIntensities } from './muscle-heatmap';
import type { UserProfile } from '@/lib/types';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface HeatmapDetailModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  view: 'front' | 'back';
  intensities: MuscleGroupIntensities;
  userProfile: UserProfile | null | undefined;
}

const muscleGroupNames: Record<string, string> = {
    shoulders_front: 'Front Shoulders',
    shoulders_back: 'Rear Shoulders',
    chest: 'Chest',
    abs: 'Abs',
    biceps: 'Biceps',
    quads: 'Quads',
    traps: 'Traps',
    lats: 'Lats',
    back_lower: 'Lower Back',
    triceps: 'Triceps',
    glutes: 'Glutes',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
};

const getHue = (intensity: number) => {
    // Gradient: Blue (0%, hue 240) -> Green (50%, hue 100) -> Red (100%, hue 0)
    return intensity <= 0.5
        ? 240 - (intensity * 2 * 140) // Transition from Blue (240) to deeper Green (100)
        : 100 - ((intensity - 0.5) * 2 * 100); // Transition from Green (100) to Red (0)
}

export function HeatmapDetailModal({ isOpen, onOpenChange, view, intensities, userProfile }: HeatmapDetailModalProps) {
  const bodyType = userProfile?.biologicalSex || 'Male';
  const imageUrl = view === 'front' ? `/Male_Front.png` : `/Male_Back.png`;
  
  if (!isOpen) return null;

  const relevantMuscleGroups = Object.keys(heatmapCoordinates[bodyType]).filter(group => {
    const isFront = group.includes('front') || ['chest', 'abs', 'biceps', 'quads'].includes(group);
    const hasIntensity = (intensities[group] || 0) > 0;
    return hasIntensity && (view === 'front' ? isFront : !isFront);
  });
  
  // Sort groups by intensity descending
  relevantMuscleGroups.sort((a, b) => (intensities[b] || 0) - (intensities[a] || 0));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{view === 'front' ? 'Front View' : 'Back View'} Muscle Intensity</DialogTitle>
           <DialogDescription className="text-center">
            A breakdown of muscle group engagement.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-4">
            <div className="relative w-full max-w-xs mx-auto">
                {/* Layer 1: Background Color */}
                <div className="absolute inset-0 bg-white z-0"></div>

                {/* Layer 2: Heatmap Glows */}
                <div className="absolute inset-0 z-10">
                    {relevantMuscleGroups.map((group) => {
                        const coords = heatmapCoordinates[bodyType]?.[group];
                        if (!coords) return null;
                        
                        const intensity = intensities[group] || 0;
                        if (intensity === 0) return null;
                        
                        let size = '18%';
                        if (group === 'glutes' || group === 'quads') {
                            size = '25%';
                        } else if (group === 'lats' || group === 'abs') {
                            size = '45%';
                        } else if (group === 'chest') {
                            size = '20%';
                        } else if (group.includes('shoulders')) {
                            size = '10%';
                        }
                        
                        return <HeatPoint key={`${view}-${group}`} intensity={intensity} size={size} coords={coords} bodyType={bodyType} view={view} />;
                    })}
                </div>
                {/* Layer 3: Main body outline PNG */}
                <Image
                    src={imageUrl}
                    alt={`${bodyType} body ${view} view`}
                    width={300}
                    height={533}
                    className="relative object-contain z-20 w-full h-auto"
                    unoptimized
                />
            </div>
            
            <div className="space-y-3">
                {relevantMuscleGroups.map((group, index) => {
                    const intensity = intensities[group] || 0;
                    const hue = getHue(intensity);
                    const percentage = (intensity * 100).toFixed(0);

                    return (
                        <div key={group}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-4 w-4 rounded-sm"
                                        style={{ backgroundColor: `hsl(${hue}, 90%, 50%)` }}
                                    />
                                    <span className="font-medium text-sm">{muscleGroupNames[group] || group}</span>
                                </div>
                                <span className="font-semibold text-sm">{percentage}%</span>
                            </div>
                             {index < relevantMuscleGroups.length - 1 && <Separator className="mt-3"/>}
                        </div>
                    );
                })}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
