'use client';

import React, { useState } from 'react';

export type BodyView = 'front' | 'back';
export type BiologicalSex = 'Male' | 'Female';

export interface SVGBodyProps {
  view: BodyView;
  biologicalSex: BiologicalSex;
  intensities: Record<string, number>;
  colorScheme?: string;
  onMuscleHover?: (muscleKey: string | null, event?: React.MouseEvent) => void;
  onMuscleClick?: (muscleKey: string) => void;
  selectedMuscle?: string | null;
}

// Muscle names mapping for premium labels
export const muscleDisplayNames: Record<string, string> = {
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

// Premium HSL interpolation helper matching the main component
function getHSLColor(intensity: number, scheme: string = 'classic'): string {
  // If intensity is 0, return a subtle neutral styling (translucent dark)
  if (intensity <= 0) return 'rgba(148, 163, 184, 0.15)'; // Tailwind slate-400 equivalent translucent

  const schemes: Record<string, { low: number; mid: number; high: number }> = {
    classic: { low: 240, mid: 100, high: 0 },    // Blue -> Green -> Red
    sunset: { low: 280, mid: 35, high: 350 },    // Purple -> Orange -> Pink-Red
    ocean: { low: 200, mid: 180, high: 160 },    // Deep Blue -> Teal -> Aqua
    neon: { low: 180, mid: 280, high: 60 },      // Cyan -> Magenta -> Yellow
  };

  const colors = schemes[scheme] || schemes.classic;
  let h: number;
  let s = 85; // Vibrant saturation
  let l = 45; // Sleek lightness

  if (intensity <= 0.5) {
    const t = intensity * 2;
    h = colors.low + (colors.mid - colors.low) * t;
  } else {
    const t = (intensity - 0.5) * 2;
    h = colors.mid + (colors.high - colors.mid) * t;
  }

  // Handle monochrome special case
  if (scheme === 'monochrome') {
    const gray = Math.round(40 + intensity * 55);
    return `rgb(${gray}, ${gray}, ${gray})`;
  }

  return `hsl(${Math.round(h)}, ${s}%, ${l}%)`;
}

export function SVGBody({
  view,
  biologicalSex,
  intensities,
  colorScheme = 'classic',
  onMuscleHover,
  onMuscleClick,
  selectedMuscle,
}: SVGBodyProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const handleMouseEnter = (muscleKey: string, e: React.MouseEvent) => {
    setHoveredGroup(muscleKey);
    if (onMuscleHover) {
      onMuscleHover(muscleKey, e);
    }
  };

  const handleMouseLeave = () => {
    setHoveredGroup(null);
    if (onMuscleHover) {
      onMuscleHover(null);
    }
  };

  const handleMuscleClick = (muscleKey: string) => {
    if (onMuscleClick) {
      onMuscleClick(muscleKey);
    }
  };

  // Render path helper with styling
  const renderMusclePath = (
    muscleKey: string,
    pathData: string,
    displayName: string
  ) => {
    const intensity = intensities[muscleKey] || 0;
    const baseColor = getHSLColor(intensity, colorScheme);
    const isHovered = hoveredGroup === muscleKey || selectedMuscle === muscleKey;
    
    // Aesthetic glows and fills
    const strokeColor = isHovered 
      ? 'var(--accent-glow, #f59e0b)' 
      : 'rgba(255, 255, 255, 0.35)';
    const strokeWidth = isHovered ? '2' : '0.8';

    return (
      <path
        d={pathData}
        className="muscle-path transition-all duration-300 ease-in-out"
        style={{
          fill: baseColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          filter: isHovered 
            ? `drop-shadow(0 0 6px ${intensity > 0 ? baseColor : 'rgba(245, 158, 11, 0.7)'})` 
            : 'none',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => handleMouseEnter(muscleKey, e)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleMuscleClick(muscleKey)}
        aria-label={`${displayName}: ${(intensity * 100).toFixed(0)}% fatigue`}
      >
        <title>{`${displayName}: ${(intensity * 100).toFixed(0)}% fatigue`}</title>
      </path>
    );
  };

  // Coordinate viewBox: 0 0 200 360
  // Clean, highly-stylized fit muscular outlines
  
  // MALE FRONT
  const renderMaleFront = () => (
    <>
      {/* Background Silhouette Outline - Aesthetic V-Taper Gym Model */}
      <path
        d="M 100,52 
           L 94,52 
           C 86,52 80,53 74,56 
           C 64,60 56,66 56,76 
           C 56,84 58,92 60,98 
           C 54,102 46,110 46,120 
           C 46,130 48,136 50,142 
           C 45,152 44,164 45,174 
           C 46,184 50,192 55,200 
           C 56,204 57,208 58,212 
           L 60,212 
           C 62,208 63,204 63,200 
           C 64,192 64,184 63,174 
           L 62,142 
           C 65,134 68,124 72,118 
           C 72,130 76,146 80,158 
           C 82,164 82,170 82,176 
           C 80,182 76,188 76,195 
           C 72,205 64,218 64,232 
           C 64,246 72,264 78,276 
           C 72,286 70,300 70,314 
           C 70,326 78,338 84,346 
           L 80,350 L 100,350 
           L 120,350 
           L 116,346 
           C 122,338 130,326 130,314 
           C 130,300 128,286 122,276 
           C 128,264 136,246 136,232 
           C 136,218 128,205 124,195 
           C 124,188 120,182 118,176 
           C 118,170 118,164 120,158 
           C 124,146 128,130 128,118 
           C 132,124 135,134 138,142 
           C 137,174 137,184 136,200 
           C 137,204 138,208 140,212 
           L 142,212 
           C 143,208 144,204 145,200 
           C 150,192 154,184 155,174 
           C 156,164 155,152 150,142 
           C 152,136 154,130 154,120 
           C 154,110 146,102 140,98 
           C 142,92 144,84 144,76 
           C 144,66 136,60 126,56 
           C 120,53 114,52 106,52 
           L 100,52 Z"
        fill="rgba(30, 41, 59, 0.04)"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Muscular Neck & Head */}
      <ellipse cx="100" cy="28" rx="8" ry="11" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />
      <path d="M 95,38 L 95,52 L 105,52 L 105,38 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />

      {/* Chest - Defined Pectorals */}
      {renderMusclePath('chest', 
        "M 100,70 L 100,98 C 84,98 76,96 72,92 C 68,88 68,76 72,72 C 82,71 92,70 100,70 Z " +
        "M 100,70 L 100,98 C 116,98 124,96 128,92 C 132,88 132,76 128,72 C 118,71 108,70 100,70 Z", 
        "Chest"
      )}

      {/* Front Shoulders (Capped Deltoids) */}
      {renderMusclePath('shoulders_front',
        "M 72,62 C 64,65 58,72 58,80 C 58,88 62,94 68,98 C 72,94 74,86 75,76 Z " +
        "M 128,62 C 136,65 142,72 142,80 C 142,88 138,94 132,98 C 128,94 126,86 125,76 Z",
        "Front Shoulders"
      )}

      {/* Biceps (Defined athletic peak) */}
      {renderMusclePath('biceps',
        "M 68,96 C 62,102 54,110 52,118 C 50,124 52,132 56,134 C 60,134 64,124 68,114 Z " +
        "M 132,96 C 138,102 146,110 148,118 C 150,124 148,132 144,134 C 140,134 136,124 132,114 Z",
        "Biceps"
      )}

      {/* Abs - Stylized 6-Pack Grid */}
      {renderMusclePath('abs',
        "M 82,102 L 118,102 L 114,166 L 100,172 L 86,166 Z " +
        "M 84,106 L 116,106 L 115,122 L 85,122 Z " +
        "M 85,125 L 115,125 L 114,142 L 86,142 Z " +
        "M 86,145 L 114,145 L 113,162 L 87,162 Z",
        "Abs"
      )}

      {/* Quads (Muscular sweeps) */}
      {renderMusclePath('quads',
        "M 78,180 L 98,186 L 96,254 L 74,246 Z " +
        "M 122,180 L 102,186 L 104,254 L 126,246 Z",
        "Quads"
      )}
    </>
  );

  // MALE BACK
  const renderMaleBack = () => (
    <>
      {/* Background Silhouette Outline */}
      <path
        d="M 100,52 
           L 94,52 
           C 86,52 80,53 74,56 
           C 64,60 56,66 56,76 
           C 56,84 58,92 60,98 
           C 54,102 46,110 46,120 
           C 46,130 48,136 50,142 
           C 45,152 44,164 45,174 
           C 46,184 50,192 55,200 
           C 56,204 57,208 58,212 
           L 60,212 
           C 62,208 63,204 63,200 
           C 64,192 64,184 63,174 
           L 62,142 
           C 65,134 68,124 72,118 
           C 72,130 76,146 80,158 
           C 82,164 82,170 82,176 
           C 80,182 76,188 76,195 
           C 72,205 64,218 64,232 
           C 64,246 72,264 78,276 
           C 72,286 70,300 70,314 
           C 70,326 78,338 84,346 
           L 80,350 L 100,350 
           L 120,350 
           L 116,346 
           C 122,338 130,326 130,314 
           C 130,300 128,286 122,276 
           C 136,246 136,232 136,232 
           C 136,218 128,205 124,195 
           C 124,188 120,182 118,176 
           C 118,170 118,164 120,158 
           C 124,146 128,130 128,118 
           C 132,124 135,134 138,142 
           C 137,174 137,184 136,200 
           C 137,204 138,208 140,212 
           L 142,212 
           C 143,208 144,204 145,200 
           C 150,192 154,184 155,174 
           C 156,164 155,152 150,142 
           C 152,136 154,130 154,120 
           C 154,110 146,102 140,98 
           C 142,92 144,84 144,76 
           C 144,66 136,60 126,56 
           C 120,53 114,52 106,52 
           L 100,52 Z"
        fill="rgba(30, 41, 59, 0.04)"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Neck & Head */}
      <ellipse cx="100" cy="28" rx="8" ry="11" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />
      <path d="M 95,38 L 95,52 L 105,52 L 105,38 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />

      {/* Traps (Upper back diamond) */}
      {renderMusclePath('traps',
        "M 100,52 L 76,68 L 88,96 L 100,102 L 112,96 L 124,68 Z",
        "Traps"
      )}

      {/* Rear Shoulders */}
      {renderMusclePath('shoulders_back',
        "M 72,62 C 64,65 58,72 58,80 C 58,88 62,94 68,98 C 72,94 74,86 75,76 Z " +
        "M 128,62 C 136,65 142,72 142,80 C 142,88 138,94 132,98 C 128,94 126,86 125,76 Z",
        "Rear Shoulders"
      )}

      {/* Triceps */}
      {renderMusclePath('triceps',
        "M 68,96 C 62,102 54,110 52,118 C 50,124 52,132 56,134 C 60,134 64,124 68,114 Z " +
        "M 132,96 C 138,102 146,110 148,118 C 150,124 148,132 144,134 C 140,134 136,124 132,114 Z",
        "Triceps"
      )}

      {/* Lats (Broad wings) */}
      {renderMusclePath('lats',
        "M 74,96 L 98,98 L 98,142 L 82,146 Z " +
        "M 126,96 L 102,98 L 102,142 L 118,146 Z",
        "Lats"
      )}

      {/* Lower Back */}
      {renderMusclePath('back_lower',
        "M 82,146 L 118,146 L 116,172 L 100,176 L 84,172 Z",
        "Lower Back"
      )}

      {/* Glutes (Strong round shape) */}
      {renderMusclePath('glutes',
        "M 76,176 L 124,176 C 126,196 118,216 100,220 C 82,216 74,196 76,176 Z",
        "Glutes"
      )}

      {/* Hamstrings */}
      {renderMusclePath('hamstrings',
        "M 76,222 L 98,226 L 96,274 L 78,268 Z " +
        "M 124,222 L 102,226 L 104,274 L 122,268 Z",
        "Hamstrings"
      )}

      {/* Calves (Diamond diamond curves) */}
      {renderMusclePath('calves',
        "M 78,280 L 94,282 L 92,328 L 82,326 Z " +
        "M 122,280 L 106,282 L 108,328 L 118,326 Z",
        "Calves"
      )}
    </>
  );

  // FEMALE FRONT
  const renderFemaleFront = () => (
    <>
      {/* Background Silhouette Outline - Fit Hourglass Athletic Cut */}
      <path
        d="M 100,52 
           L 95,52 
           C 88,52 82,53 76,56 
           C 68,60 60,66 60,76 
           C 60,84 61,92 63,98 
           C 58,102 52,110 52,120 
           C 52,130 53,136 55,142 
           C 51,152 51,164 52,174 
           C 53,184 56,192 60,200 
           C 61,204 62,208 62,212 
           L 64,212 
           C 65,208 66,204 66,200 
           C 67,192 67,184 66,174 
           L 65,142 
           C 68,134 71,124 74,118 
           C 75,130 79,146 83,158 
           C 85,164 85,170 85,176 
           C 83,182 75,188 75,195 
           C 71,205 67,218 67,232 
           C 67,246 74,264 80,276 
           C 74,286 73,300 73,314 
           C 73,326 79,338 85,346 
           L 82,350 L 100,350 
           L 118,350 
           L 115,346 
           C 121,338 127,326 127,314 
           C 127,300 126,286 120,276 
           C 126,264 133,246 133,232 
           C 133,218 125,205 125,195 
           C 125,188 121,182 115,176 
           C 115,170 115,164 117,158 
           C 121,146 125,130 126,118 
           C 129,124 132,132 135,142 
           C 134,174 133,184 134,200 
           C 134,204 135,208 136,212 
           L 138,212 
           C 138,208 139,204 140,200 
           C 144,192 147,184 148,174 
           C 149,164 149,152 145,142 
           C 147,136 148,130 148,120 
           C 148,110 142,102 137,98 
           C 139,92 140,84 140,76 
           C 140,66 132,60 124,56 
           C 118,53 112,52 105,52 
           L 100,52 Z"
        fill="rgba(30, 41, 59, 0.04)"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Proportional Head & Neck */}
      <ellipse cx="100" cy="28" rx="8" ry="11" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />
      <path d="M 96,38 L 96,52 L 104,52 L 104,38 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />

      {/* Chest (Toned Bustline shape) */}
      {renderMusclePath('chest',
        "M 100,72 L 100,98 C 86,98 78,94 74,90 C 71,86 71,76 74,72 C 83,72 92,72 100,72 Z " +
        "M 100,72 L 100,98 C 114,98 122,94 126,90 C 129,86 129,76 126,72 C 117,72 108,72 100,72 Z",
        "Chest"
      )}

      {/* Front Shoulders (Sleek Delts) */}
      {renderMusclePath('shoulders_front',
        "M 74,62 C 67,65 61,72 61,80 C 61,88 65,94 71,98 C 74,94 76,86 77,76 Z " +
        "M 126,62 C 133,65 139,72 139,80 C 139,88 135,94 129,98 C 126,94 124,86 123,76 Z",
        "Front Shoulders"
      )}

      {/* Biceps (Toned, active lines) */}
      {renderMusclePath('biceps',
        "M 70,96 C 65,102 58,110 56,118 C 54,124 56,132 60,134 C 64,134 67,124 70,114 Z " +
        "M 130,96 C 135,102 142,110 144,118 C 146,124 144,132 140,134 C 136,134 133,124 130,114 Z",
        "Biceps"
      )}

      {/* Abs (Toned slim waist outline) */}
      {renderMusclePath('abs',
        "M 85,102 L 115,102 L 112,166 L 100,172 L 88,166 Z " +
        "M 87,105 L 113,105 L 112,122 L 88,122 Z " +
        "M 88,125 L 112,125 L 111,142 L 89,142 Z " +
        "M 89,145 L 111,145 L 110,162 L 90,162 Z",
        "Abs"
      )}

      {/* Quads (Sleek leg definitions) */}
      {renderMusclePath('quads',
        "M 80,180 L 98,186 L 96,254 L 76,246 Z " +
        "M 120,180 L 102,186 L 104,254 L 124,246 Z",
        "Quads"
      )}
    </>
  );

  // FEMALE BACK
  const renderFemaleBack = () => (
    <>
      {/* Background Silhouette Outline */}
      <path
        d="M 100,52 
           L 95,52 
           C 88,52 82,53 76,56 
           C 68,60 60,66 60,76 
           C 60,84 61,92 63,98 
           C 58,102 52,110 52,120 
           C 52,130 53,136 55,142 
           C 51,152 51,164 52,174 
           C 53,184 56,192 60,200 
           C 61,204 62,208 62,212 
           L 64,212 
           C 65,208 66,204 66,200 
           C 67,192 67,184 66,174 
           L 65,142 
           C 68,134 71,124 74,118 
           C 75,130 79,146 83,158 
           C 85,164 85,170 85,176 
           C 83,182 75,188 75,195 
           C 71,205 67,218 67,232 
           C 67,246 74,264 80,276 
           C 74,286 73,300 73,314 
           C 73,326 79,338 85,346 
           L 82,350 L 100,350 
           L 118,350 
           L 115,346 
           C 121,338 127,326 127,314 
           C 127,300 126,286 120,276 
           C 126,264 133,246 133,232 
           C 133,218 125,205 125,195 
           C 125,188 121,182 115,176 
           C 115,170 115,164 117,158 
           C 121,146 125,130 126,118 
           C 129,124 132,132 135,142 
           C 134,174 133,184 134,200 
           C 134,204 135,208 136,212 
           L 138,212 
           C 138,208 139,204 140,200 
           C 144,192 147,184 148,174 
           C 149,164 149,152 145,142 
           C 147,136 148,130 148,120 
           C 148,110 142,102 137,98 
           C 139,92 140,84 140,76 
           C 140,66 132,60 124,56 
           C 118,53 112,52 105,52 
           L 100,52 Z"
        fill="rgba(30, 41, 59, 0.04)"
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Proportional Head & Neck */}
      <ellipse cx="100" cy="28" rx="8" ry="11" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />
      <path d="M 96,38 L 96,52 L 104,52 L 104,38 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.5" />

      {/* Traps */}
      {renderMusclePath('traps',
        "M 100,52 L 78,68 L 90,96 L 100,102 L 110,96 L 122,68 Z",
        "Traps"
      )}

      {/* Rear Shoulders */}
      {renderMusclePath('shoulders_back',
        "M 74,62 C 67,65 61,72 61,80 C 61,88 65,94 71,98 C 74,94 76,86 77,76 Z " +
        "M 126,62 C 133,65 139,72 139,80 C 139,88 135,94 129,98 C 126,94 124,86 123,76 Z",
        "Rear Shoulders"
      )}

      {/* Triceps */}
      {renderMusclePath('triceps',
        "M 70,96 C 65,102 58,110 56,118 C 54,124 56,132 60,134 C 64,134 67,124 70,114 Z " +
        "M 130,96 C 135,102 142,110 144,118 C 146,124 144,132 140,134 C 136,134 133,124 130,114 Z",
        "Triceps"
      )}

      {/* Lats (Broad toned lats) */}
      {renderMusclePath('lats',
        "M 76,96 L 98,98 L 98,142 L 84,146 Z " +
        "M 124,96 L 102,98 L 102,142 L 116,146 Z",
        "Lats"
      )}

      {/* Lower Back */}
      {renderMusclePath('back_lower',
        "M 84,146 L 116,146 L 114,172 L 100,176 L 86,172 Z",
        "Lower Back"
      )}

      {/* Glutes (Toned shape) */}
      {renderMusclePath('glutes',
        "M 74,176 L 126,176 C 129,196 120,216 100,220 C 80,216 71,196 74,176 Z",
        "Glutes"
      )}

      {/* Hamstrings */}
      {renderMusclePath('hamstrings',
        "M 80,180 L 98,186 L 96,254 L 76,246 Z " +
        "M 120,180 L 102,186 L 104,254 L 124,246 Z",
        "Hamstrings"
      )}

      {/* Calves */}
      {renderMusclePath('calves',
        "M 78,280 L 94,282 L 92,328 L 82,326 Z " +
        "M 122,280 L 106,282 L 108,328 L 118,326 Z",
        "Calves"
      )}
    </>
  );

  return (
    <svg
      viewBox="0 0 200 360"
      className="w-full h-full select-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      {biologicalSex === 'Male'
        ? (view === 'front' ? renderMaleFront() : renderMaleBack())
        : (view === 'front' ? renderFemaleFront() : renderFemaleBack())
      }
    </svg>
  );
}
