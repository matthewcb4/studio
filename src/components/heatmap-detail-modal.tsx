
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HeatPoint, heatmapCoordinates, type MuscleGroupIntensities } from './muscle-heatmap';
import type { UserProfile } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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

export function HeatmapDetailModal({ isOpen, onOpenChange, view, intensities, userProfile }: HeatmapDetailModalProps) {
  const bodyType = userProfile?.biologicalSex || 'Male';
  const imageUrl = view === 'front' ? `/Male_Front.png` : `/Male_Back.png`;
  
  if (!isOpen) return null;

  const relevantMuscleGroups = Object.keys(heatmapCoordinates[bodyType]).filter(group => {
    const isFront = group.includes('front') || ['chest', 'abs', 'biceps', 'quads'].includes(group);
    return view === 'front' ? isFront : !isFront;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-4">
        <DialogHeader>
          <DialogTitle className="text-center">{view === 'front' ? 'Front View' : 'Back View'} Muscle Intensity</DialogTitle>
        </DialogHeader>
        <div className="relative w-full max-w-xs mx-auto mt-4">
            {/* This image is invisible but sets the container's aspect ratio */}
            <Image
                src={imageUrl}
                alt=""
                width={300}
                height={533}
                className="relative object-contain w-full h-auto invisible"
                unoptimized
                aria-hidden="true"
            />
            {/* Layer 1: White Background */}
            <div className="absolute inset-0 bg-white z-0"></div>
            {/* Layer 2: Heatmap Glows */}
            <div className="absolute inset-0 z-10">
                {relevantMuscleGroups.map((group) => {
                    const coords = heatmapCoordinates[bodyType]?.[group];
                    if (!coords) return null;
                    
                    const intensity = intensities[group] || 0;
                    if (intensity === 0) return null;
                    
                    let size = '18%';
                    if (group === 'glutes' || group === 'quads') size = '25%';
                    else if (group === 'lats' || group === 'abs') size = '45%';
                    else if (group.includes('shoulders')) size = '10%';
                    
                    return <HeatPoint key={`${view}-${group}`} intensity={intensity} size={size} coords={coords} bodyType={bodyType} view={view} />;
                })}
            </div>
            {/* Layer 3: Main body outline PNG */}
            <Image
                src={imageUrl}
                alt={`${bodyType} body ${view} view`}
                width={300}
                height={533}
                className="absolute inset-0 object-contain z-20 w-full h-auto"
                unoptimized
            />
            {/* Layer 4: Text Labels */}
            <div className="absolute inset-0 z-30">
                {relevantMuscleGroups.map((group) => {
                    const coords = heatmapCoordinates[bodyType]?.[group];
                    const intensity = intensities[group] || 0;
                    if (!coords || intensity === 0) return null;

                    const isMirrored = (view === 'front' && ['shoulders_front', 'biceps', 'quads'].includes(group)) || (view === 'back' && ['traps', 'shoulders_back', 'lats', 'triceps', 'glutes', 'hamstrings', 'calves'].includes(group));

                    return (
                        <React.Fragment key={`text-${group}`}>
                            <div
                                className="absolute p-1 rounded-md text-white bg-black/50 text-xs font-bold"
                                style={{
                                    top: coords.top,
                                    left: coords.left,
                                    transform: 'translate(-50%, -50%)',
                                    lineHeight: 1,
                                }}
                            >
                                <p>{muscleGroupNames[group] || group}</p>
                                <p className="text-center">{intensity.toFixed(2)}</p>
                            </div>
                            {isMirrored && (
                                <div
                                    className="absolute p-1 rounded-md text-white bg-black/50 text-xs font-bold"
                                    style={{
                                        top: coords.top,
                                        left: `calc(100% - ${coords.left})`,
                                        transform: 'translate(-50%, -50%)',
                                        lineHeight: 1,
                                    }}
                                >
                                    <p>{muscleGroupNames[group] || group}</p>
                                    <p className="text-center">{intensity.toFixed(2)}</p>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
