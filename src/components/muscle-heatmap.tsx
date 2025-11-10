
'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { UserProfile, WorkoutLog, Exercise } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';


// Mapping from exercise category to a simpler muscle group
const categoryToMuscleGroup: Record<string, string> = {
  'Chest': 'chest',
  'Back': 'back',
  'Shoulders': 'shoulders',
  'Legs': 'legs',
  'Arms': 'arms',
  'Biceps': 'arms',
  'Triceps': 'arms',
  'Core': 'core',
};

// Simplified coordinate system for heatmap points on the body outline
// Values are percentages for top and left positioning.
const heatmapCoordinates: Record<'Male' | 'Female', Record<string, { top: string; left: string }>> = {
  Male: {
    shoulders: { top: '23%', left: '38%' },
    chest: { top: '28%', left: '50.5%' },
    back: { top: '35.5%', left: '51.5%' },
    core: { top: '42%', left: '50.5%' },
    arms: { top: '26%', left: '44%' },
    legs: { top: '70%', left: '42%' },
  },
  Female: {
    shoulders: { top: '23%', left: '38%' },
    chest: { top: '28%', left: '50.5%' },
    back: { top: '35.5%', left: '51.5%' },
    core: { top: '42%', left: '50.5%' },
    arms: { top: '26%', left: '44%' },
    legs: { top: '70%', left: '42%' },
  },
};

const HeatPoint = ({ intensity, size, coords }: { intensity: number; size: string; coords: { top: string, left: string } }) => {
  const isMirrored = ['arms', 'shoulders', 'legs'].includes(Object.keys(heatmapCoordinates.Male).find(key => heatmapCoordinates.Male[key] === coords) || '');

  // Gradient: Blue (0%, hue 240) -> Green (50%, hue 100) -> Red (100%, hue 0)
  // Adjusted green hue from 120 to 100 for a deeper shade.
  const hue = intensity <= 0.5
    ? 240 - (intensity * 2 * 140) // Transition from Blue (240) to deeper Green (100)
    : 100 - ((intensity - 0.5) * 2 * 100); // Transition from Green (100) to Red (0)
  const color = `hsl(${hue}, 100%, 40%)`;

  const renderPoints = () => {
    const points = [
      <div
        key="main"
        className="absolute rounded-full"
        style={{
          top: coords.top,
          left: coords.left,
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transform: 'translate(-50%, -50%)',
          opacity: Math.max(0.8, intensity * 0.9),
          filter: `blur(14px)`,
          zIndex: 10,
        }}
      />
    ];
    if (isMirrored) {
      points.push(
        <div
          key="mirrored"
          className="absolute rounded-full"
          style={{
            top: coords.top,
            left: `calc(100% - ${coords.left})`,
            width: size,
            height: size,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            opacity: Math.max(0.8, intensity * 0.9),
            filter: `blur(14px)`,
            zIndex: 10,
          }}
        />
      );
    }
    return points;
  };

  return <>{renderPoints()}</>;
};

const HeatmapLabels = ({ bodyType }: { bodyType: 'Male' | 'Female' }) => {
    const coords = heatmapCoordinates[bodyType];

    const labelStyle: React.CSSProperties = {
        position: 'absolute',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '10px',
        textAlign: 'center',
        transform: 'translate(-50%, -50%)',
        textTransform: 'uppercase',
        zIndex: 15,
        pointerEvents: 'none',
    };

    const isMirrored = (group: string) => ['arms', 'shoulders', 'legs'].includes(group);

    return (
        <>
            {Object.entries(coords).map(([group, pos]) => (
                <React.Fragment key={group}>
                    <div style={{ ...labelStyle, top: pos.top, left: pos.left }}>
                        {group}
                    </div>
                    {isMirrored(group) && (
                         <div style={{ ...labelStyle, top: pos.top, left: `calc(100% - ${pos.left})` }}>
                            {group}
                        </div>
                    )}
                </React.Fragment>
            ))}
        </>
    );
};

interface MuscleHeatmapProps {
  userProfile?: UserProfile | null;
  thisWeeksLogs: WorkoutLog[];
  isLoading: boolean;
}

export function MuscleHeatmap({ userProfile, thisWeeksLogs, isLoading }: MuscleHeatmapProps) {
  const firestore = useFirestore();

  const exercisesQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'exercises')) : null,
    [firestore]
  );
  const { data: masterExercises, isLoading: isLoadingExercises } = useCollection<Exercise>(exercisesQuery);
  
  const muscleGroupIntensities = useMemo(() => {
    // Hardcoded values for visualization
    return {
        arms: 1,      // 100%
        core: 0.5,    // 50%
        legs: 1,      // 100%
        chest: 0.75,  // 75%
        back: 0.3,    // 30%
        shoulders: 0, // 0%
    };

  }, [thisWeeksLogs, masterExercises, userProfile]);

  const bodyType = userProfile?.biologicalSex || 'Male';
  const bodyImageUrl = bodyType === 'Female'
    ? "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Female.png"
    : "https://raw.githubusercontent.com/matthewcb4/public_resources/main/Male_black.png";
    
  if (isLoading || isLoadingExercises) {
    return <div className="text-center p-8">Loading heatmap...</div>;
  }
  
  const allPossibleMuscleGroups = ['shoulders', 'chest', 'back', 'core', 'arms', 'legs'];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="absolute inset-0 bg-white z-0"></div>

      <div className="absolute inset-0 z-10">
        {allPossibleMuscleGroups.map((group) => {
          const coords = heatmapCoordinates[bodyType]?.[group];
          if (!coords) return null;
          
          const intensity = muscleGroupIntensities[group as keyof typeof muscleGroupIntensities] || 0;
          const isLegs = group === 'legs';
          const size = isLegs ? '40%' : '35%';

          return <HeatPoint key={group} intensity={intensity} size={size} coords={coords} />;
        })}
      </div>
      
      <HeatmapLabels bodyType={bodyType} />

      <Image
        src={bodyImageUrl}
        alt={`${bodyType} body outline`}
        width={400}
        height={711}
        className="relative object-contain z-20 mix-blend-multiply w-full h-auto"
        unoptimized
      />
    </div>
  );
}
