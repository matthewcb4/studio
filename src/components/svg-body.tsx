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
  if (intensity <= 0) return 'rgba(100, 116, 139, 0.15)'; // Tailwind slate-500 equivalent translucent

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
      : 'rgba(255, 255, 255, 0.25)';
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
            ? `drop-shadow(0 0 5px ${intensity > 0 ? baseColor : 'rgba(245, 158, 11, 0.6)'})` 
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
  // Clean, stylized silhouette definitions
  
  // MALE FRONT
  const renderMaleFront = () => (
    <>
      {/* Background Silhouette Outline */}
      <path
        d="M 100,20 C 112,20 115,35 115,48 C 115,58 110,65 100,68 C 90,65 85,58 85,48 C 85,35 88,20 100,20 Z 
           M 100,68 L 100,78 
           M 100,78 C 82,78 68,90 62,100 C 58,106 50,118 42,130 C 38,136 34,145 36,155 C 38,162 46,164 52,156 L 60,140 L 62,185 C 64,195 68,202 70,210 L 76,260 L 80,310 L 86,345 C 87,348 94,348 96,345 L 98,300 L 100,220 L 102,300 L 104,345 C 106,348 113,348 114,345 L 120,310 L 124,260 L 130,210 C 132,202 136,195 138,185 L 140,140 L 148,156 C 154,164 162,162 164,155 C 166,145 162,136 158,130 C 150,118 142,106 138,100 C 132,90 118,78 100,78 Z"
        fill="rgba(30, 41, 59, 0.05)"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Head & Neck (Neutral Aesthetic) */}
      <path d="M 94,68 C 96,73 104,73 106,68 L 105,78 L 95,78 Z M 100,28 C 108,28 110,38 110,48 C 110,55 106,60 100,62 C 94,60 90,55 90,48 C 90,38 92,28 100,28 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.4" />

      {/* Chest */}
      {renderMusclePath('chest', 
        "M 100,105 L 100,132 C 86,132 80,126 76,122 C 72,118 72,108 76,104 C 84,103 94,104 100,105 Z " +
        "M 100,105 L 100,132 C 114,132 120,126 124,122 C 128,118 128,108 124,104 C 116,103 106,104 100,105 Z", 
        "Chest"
      )}

      {/* Front Shoulders (Left & Right Delts) */}
      {renderMusclePath('shoulders_front',
        "M 74,94 C 71,94 65,99 64,104 C 62,112 63,122 68,126 C 71,122 73,114 74,106 Z " +
        "M 126,94 C 129,94 135,99 136,104 C 138,112 137,122 132,126 C 129,122 127,114 126,106 Z",
        "Front Shoulders"
      )}

      {/* Biceps */}
      {renderMusclePath('biceps',
        "M 62,116 C 58,122 54,128 50,135 C 48,138 48,142 52,143 C 55,143 59,136 62,130 Z " +
        "M 138,116 C 142,122 146,128 150,135 C 152,138 152,142 148,143 C 145,143 141,136 138,130 Z",
        "Biceps"
      )}

      {/* Abs */}
      {renderMusclePath('abs',
        "M 88,136 L 112,136 L 114,188 L 100,195 L 86,188 Z M 89,140 L 111,140 L 110,154 L 90,154 Z M 90,157 L 110,157 L 109,170 L 91,170 Z M 91,173 L 109,173 L 108,185 L 92,185 Z",
        "Abs"
      )}

      {/* Quads */}
      {renderMusclePath('quads',
        "M 75,200 L 98,206 L 96,268 L 78,260 Z " +
        "M 125,200 L 102,206 L 104,268 L 122,260 Z",
        "Quads"
      )}
    </>
  );

  // MALE BACK
  const renderMaleBack = () => (
    <>
      {/* Background Silhouette Outline */}
      <path
        d="M 100,20 C 112,20 115,35 115,48 C 115,58 110,65 100,68 C 90,65 85,58 85,48 C 85,35 88,20 100,20 Z 
           M 100,68 L 100,78 
           M 100,78 C 82,78 68,90 62,100 C 58,106 50,118 42,130 C 38,136 34,145 36,155 C 38,162 46,164 52,156 L 60,140 L 62,185 C 64,195 68,202 70,210 L 76,260 L 80,310 L 86,345 C 87,348 94,348 96,345 L 98,300 L 100,220 L 102,300 L 104,345 C 106,348 113,348 114,345 L 120,310 L 124,260 L 130,210 C 132,202 136,195 138,185 L 140,140 L 148,156 C 154,164 162,162 164,155 C 166,145 162,136 158,130 C 150,118 142,106 138,100 C 132,90 118,78 100,78 Z"
        fill="rgba(30, 41, 59, 0.05)"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Head & Neck (Neutral Aesthetic) */}
      <path d="M 94,68 C 96,73 104,73 106,68 L 105,78 L 95,78 Z M 100,28 C 108,28 110,38 110,48 C 110,55 106,60 100,62 C 94,60 90,55 90,48 C 90,38 92,28 100,28 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.4" />

      {/* Traps */}
      {renderMusclePath('traps',
        "M 100,82 L 84,95 L 92,110 L 100,114 L 108,110 L 116,95 Z",
        "Traps"
      )}

      {/* Rear Shoulders */}
      {renderMusclePath('shoulders_back',
        "M 74,94 C 71,94 65,99 64,104 C 62,112 63,122 68,126 C 71,122 73,114 74,106 Z M 126,94 C 129,94 135,99 136,104 C 138,112 137,122 132,126 C 129,122 127,114 126,106 Z",
        "Rear Shoulders"
      )}

      {/* Triceps */}
      {renderMusclePath('triceps',
        "M 62,116 C 58,122 54,128 50,135 C 48,138 48,142 52,143 C 55,143 59,136 62,130 Z M 138,116 C 142,122 146,128 150,135 C 152,138 152,142 148,143 C 145,143 141,136 138,130 Z",
        "Triceps"
      )}

      {/* Lats */}
      {renderMusclePath('lats',
        "M 78,118 L 98,120 L 98,162 L 84,166 Z " +
        "M 122,118 L 102,120 L 102,162 L 116,166 Z",
        "Lats"
      )}

      {/* Lower Back */}
      {renderMusclePath('back_lower',
        "M 85,166 L 115,166 L 114,188 L 100,192 L 86,188 Z",
        "Lower Back"
      )}

      {/* Glutes */}
      {renderMusclePath('glutes',
        "M 74,192 L 126,192 C 128,210 120,230 100,234 C 80,230 72,210 74,192 Z",
        "Glutes"
      )}

      {/* Hamstrings */}
      {renderMusclePath('hamstrings',
        "M 75,236 L 98,240 L 96,290 L 78,284 Z " +
        "M 125,236 L 102,240 L 104,290 L 122,284 Z",
        "Hamstrings"
      )}

      {/* Calves */}
      {renderMusclePath('calves',
        "M 78,296 L 94,298 L 92,342 L 82,340 Z " +
        "M 122,296 L 106,298 L 108,342 L 118,340 Z",
        "Calves"
      )}
    </>
  );

  // FEMALE FRONT
  const renderFemaleFront = () => (
    <>
      {/* Background Silhouette Outline - Curvier hips/shoulders proportion */}
      <path
        d="M 100,20 C 111,20 114,33 114,46 C 114,56 109,63 100,66 C 91,63 86,56 86,46 C 86,33 89,20 100,20 Z 
           M 100,66 L 100,76 
           M 100,76 C 84,76 72,87 66,96 C 62,102 54,115 46,127 C 42,133 38,142 40,152 C 42,159 49,161 55,153 L 62,137 L 64,180 C 64,192 60,204 58,216 L 66,262 L 72,308 L 79,345 C 80,348 88,348 90,345 L 94,298 L 98,220 L 100,220 L 102,220 L 106,298 L 110,345 C 112,348 120,348 121,345 L 128,308 L 134,262 L 142,216 C 140,204 136,192 136,180 L 138,137 L 145,153 C 151,161 158,159 160,152 C 162,142 158,133 154,127 C 146,115 138,102 134,96 C 128,87 116,76 100,76 Z"
        fill="rgba(30, 41, 59, 0.05)"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Head & Neck (Neutral Aesthetic) */}
      <path d="M 94,66 C 96,71 104,71 106,66 L 105,76 L 95,76 Z M 100,28 C 107,28 109,37 109,46 C 109,53 105,58 100,60 C 95,58 91,53 91,46 C 91,37 93,28 100,28 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.4" />

      {/* Chest */}
      {renderMusclePath('chest',
        "M 100,105 L 100,128 C 87,128 82,123 78,119 C 75,115 75,106 78,103 C 85,102 94,103 100,105 Z " +
        "M 100,105 L 100,128 C 113,128 118,123 122,119 C 125,115 125,106 122,103 C 115,102 106,103 100,105 Z",
        "Chest"
      )}

      {/* Front Shoulders */}
      {renderMusclePath('shoulders_front',
        "M 76,93 C 73,93 68,97 67,102 C 65,110 66,119 71,123 C 73,119 75,112 76,105 Z " +
        "M 124,93 C 127,93 132,97 133,102 C 135,110 134,119 129,123 C 127,119 125,112 124,105 Z",
        "Front Shoulders"
      )}

      {/* Biceps */}
      {renderMusclePath('biceps',
        "M 65,114 C 61,120 57,126 54,132 C 52,135 52,139 56,140 C 59,140 62,133 65,127 Z " +
        "M 135,114 C 139,120 143,126 146,132 C 148,135 148,139 144,140 C 141,140 138,133 135,127 Z",
        "Biceps"
      )}

      {/* Abs - Narrower silhouette */}
      {renderMusclePath('abs',
        "M 90,132 L 110,132 L 112,180 L 100,186 L 88,180 Z M 91,135 L 109,135 L 108,148 L 92,148 Z M 92,151 L 108,151 L 107,163 L 93,163 Z M 93,166 L 107,166 L 106,177 L 94,177 Z",
        "Abs"
      )}

      {/* Quads */}
      {renderMusclePath('quads',
        "M 76,192 L 98,197 L 96,258 L 80,250 Z " +
        "M 124,192 L 102,197 L 104,258 L 120,250 Z",
        "Quads"
      )}
    </>
  );

  // FEMALE BACK
  const renderFemaleBack = () => (
    <>
      {/* Background Silhouette Outline */}
      <path
        d="M 100,20 C 111,20 114,33 114,46 C 114,56 109,63 100,66 C 91,63 86,56 86,46 C 86,33 89,20 100,20 Z 
           M 100,66 L 100,76 
           M 100,76 C 84,76 72,87 66,96 C 62,102 54,115 46,127 C 42,133 38,142 40,152 C 42,159 49,161 55,153 L 62,137 L 64,180 C 64,192 60,204 58,216 L 66,262 L 72,308 L 79,345 C 80,348 88,348 90,345 L 94,298 L 98,220 L 100,220 L 102,220 L 106,298 L 110,345 C 112,348 120,348 121,345 L 128,308 L 134,262 L 142,216 C 140,204 136,192 136,180 L 138,137 L 145,153 C 151,161 158,159 160,152 C 162,142 158,133 154,127 C 146,115 138,102 134,96 C 128,87 116,76 100,76 Z"
        fill="rgba(30, 41, 59, 0.05)"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-slate-300 dark:text-slate-700 transition-colors duration-300"
      />

      {/* Head & Neck */}
      <path d="M 94,66 C 96,71 104,71 106,66 L 105,76 L 95,76 Z M 100,28 C 107,28 109,37 109,46 C 109,53 105,58 100,60 C 95,58 91,53 91,46 C 91,37 93,28 100,28 Z" fill="currentColor" className="text-slate-200 dark:text-slate-800" opacity="0.4" />

      {/* Traps */}
      {renderMusclePath('traps',
        "M 100,80 L 85,92 L 93,106 L 100,110 L 107,106 L 115,92 Z",
        "Traps"
      )}

      {/* Rear Shoulders */}
      {renderMusclePath('shoulders_back',
        "M 76,93 C 73,93 68,97 67,102 C 65,110 66,119 71,123 C 73,119 75,112 76,105 Z M 124,93 C 127,93 132,97 133,102 C 135,110 134,119 129,123 C 127,119 125,112 124,105 Z",
        "Rear Shoulders"
      )}

      {/* Triceps */}
      {renderMusclePath('triceps',
        "M 65,114 C 61,120 57,126 54,132 C 52,135 52,139 56,140 C 59,140 62,133 65,127 Z M 135,114 C 139,120 143,126 146,132 C 148,135 148,139 144,140 C 141,140 138,133 135,127 Z",
        "Triceps"
      )}

      {/* Lats */}
      {renderMusclePath('lats',
        "M 79,115 L 98,117 L 98,155 L 85,158 Z " +
        "M 121,115 L 102,117 L 102,155 L 115,158 Z",
        "Lats"
      )}

      {/* Lower Back */}
      {renderMusclePath('back_lower',
        "M 86,158 L 114,158 L 113,178 L 100,182 L 87,178 Z",
        "Lower Back"
      )}

      {/* Glutes - More pronounced hip flare */}
      {renderMusclePath('glutes',
        "M 72,183 L 128,183 C 131,202 122,224 100,228 C 78,224 69,202 72,183 Z",
        "Glutes"
      )}

      {/* Hamstrings */}
      {renderMusclePath('hamstrings',
        "M 74,230 L 98,233 L 96,280 L 78,274 Z " +
        "M 126,230 L 102,233 L 104,280 L 122,274 Z",
        "Hamstrings"
      )}

      {/* Calves */}
      {renderMusclePath('calves',
        "M 76,286 L 92,288 L 90,332 L 80,330 Z " +
        "M 124,286 L 108,288 L 110,332 L 120,330 Z",
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
