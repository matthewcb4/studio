
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Bot, Dumbbell, Target, ChevronRight, Sparkles, Home, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Goal options for step 1
const GOAL_OPTIONS = [
  { id: 'build_muscle', label: 'Build Muscle', icon: '💪', description: 'Gain size and strength' },
  { id: 'lose_fat', label: 'Lose Fat', icon: '🔥', description: 'Burn calories & lean out' },
  { id: 'get_stronger', label: 'Get Stronger', icon: '🏋️', description: 'Increase max lifts' },
  { id: 'general_fitness', label: 'General Fitness', icon: '🎯', description: 'Stay healthy & active' },
];

// Equipment presets for step 2
const EQUIPMENT_PRESETS = [
  {
    id: 'bodyweight',
    label: 'Just Bodyweight',
    icon: Home,
    description: 'No equipment needed',
    equipment: ['Bodyweight'],
  },
  {
    id: 'home_gym',
    label: 'Home Gym',
    icon: Dumbbell,
    description: 'Dumbbells, bench, basics',
    equipment: ['Bodyweight', 'Dumbbells', 'Adjustable Bench', 'Pull-up Bar', 'Resistance Bands'],
  },
  {
    id: 'full_gym',
    label: 'Full Gym',
    icon: Building2,
    description: 'Commercial gym access',
    equipment: ['Bodyweight', 'Barbell', 'Dumbbells', 'Cable Machine', 'Lat Pulldown', 'Leg Press', 'Smith Machine', 'Bench Press', 'Squat Rack', 'Pull-up Bar'],
  },
];

interface OnboardingWizardProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete: (data: {
    primaryGoal: string;
    weeklyWorkoutGoal: number;
    equipment: string[];
  }) => Promise<void>;
}

export function OnboardingModal({ isOpen, onOpenChange, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Goals
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState([3]);

  // Step 2: Equipment
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!primaryGoal || !selectedPreset) return;

    setIsSubmitting(true);
    const preset = EQUIPMENT_PRESETS.find(p => p.id === selectedPreset);

    try {
      await onComplete({
        primaryGoal,
        weeklyWorkoutGoal: weeklyGoal[0],
        equipment: preset?.equipment || ['Bodyweight'],
      });

      // Navigate to AI Guide for first workout
      router.push('/guide?firstWorkout=true');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = primaryGoal !== null;
  const canProceedStep2 = selectedPreset !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {step === 1 && "Welcome to fRepo! 🎉"}
            {step === 2 && "Your Equipment"}
            {step === 3 && "Ready to Start!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1 && "Let's set up your fitness journey in 3 quick steps."}
            {step === 2 && "Where do you typically work out?"}
            {step === 3 && "Your AI-powered workout is waiting."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all",
                s === step ? "w-8 bg-primary" : "w-2 bg-muted",
                s < step && "bg-primary/50"
              )}
            />
          ))}
        </div>

        {/* Step 1: Goals */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-base font-medium">What's your main goal?</Label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setPrimaryGoal(goal.id)}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-lg border-2 transition-all text-center",
                      primaryGoal === goal.id
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl mb-1">{goal.icon}</span>
                    <span className="font-medium text-sm">{goal.label}</span>
                    <span className="text-xs text-muted-foreground">{goal.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-base font-medium">Workouts per week</Label>
                <span className="text-2xl font-bold text-primary">{weeklyGoal[0]}</span>
              </div>
              <Slider
                value={weeklyGoal}
                onValueChange={setWeeklyGoal}
                min={1}
                max={7}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 day</span>
                <span>7 days</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="grid gap-3">
              {EQUIPMENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
                    selectedPreset === preset.id
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-full",
                    selectedPreset === preset.id ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <preset.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{preset.label}</p>
                    <p className="text-sm text-muted-foreground">{preset.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {preset.equipment.slice(0, 3).join(', ')}
                      {preset.equipment.length > 3 && ` +${preset.equipment.length - 3} more`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Don't worry, you can customize this in Settings later.
            </p>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center py-8 space-y-4">
            <div className="relative">
              <div className="p-6 rounded-full bg-primary/10">
                <Bot className="h-16 w-16 text-primary" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Let's Create Your First Workout!</h3>
              <p className="text-muted-foreground">
                Our AI will generate a personalized workout based on your goals and equipment.
                You can also explore our <strong>structured programs</strong> for guided progression! ✨
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex-1 sm:flex-initial"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Create My First Workout
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}