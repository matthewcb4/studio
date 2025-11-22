
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Bot, Dumbbell, BarChart3, History, Settings, Palette } from "lucide-react";

const onboardingSteps = [
  {
    icon: Dumbbell,
    title: "Create & Start Workouts",
    description: "Build your own custom routines in the 'Workouts' tab, then start a session from the Dashboard.",
  },
  {
    icon: Bot,
    title: "Use the AI Guide",
    description: "Let our AI generate a personalized workout for you based on your goals and available equipment. You get one AI workout per day!",
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "Log your body weight and see your strength progression for specific exercises over time on the 'Progress' page.",
  },
  {
    icon: History,
    title: "Review Your History",
    description: "All completed workouts are saved in 'History', where you can review the details of every session.",
  },
  {
    icon: Palette,
    title: "Personalize Appearance",
    description: "Go to Settings to choose your theme. Select from Light, Dark, or Vaporwave to customize the look and feel of the app.",
  },
  {
    icon: Settings,
    title: "Customize Your Setup",
    description: "In Settings, add your equipment, set fitness goals, manage exercises, and even link YouTube videos to your lifts.",
  },
];


interface OnboardingModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onOpenChange, onComplete }: OnboardingModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Welcome to fRepo!</DialogTitle>
          <DialogDescription className="text-center">
            Here’s a quick tour to get you started.
          </DialogDescription>
        </DialogHeader>
        <Carousel className="w-full max-w-xs mx-auto">
            <CarouselContent>
                {onboardingSteps.map((step, index) => (
                <CarouselItem key={index}>
                    <div className="flex flex-col items-center justify-center text-center p-1 gap-4 h-64">
                        <step.icon className="w-16 h-16 text-primary" />
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
        <DialogFooter>
          <Button onClick={onComplete} className="w-full">Get Started</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    