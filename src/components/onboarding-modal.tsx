
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
import { Bot, Dumbbell, BarChart3, History, Settings } from "lucide-react";

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
    icon: Settings,
    title: "Customize Your Setup",
    description: "Head to 'Settings' to add your equipment, manage exercises, and set your personal fitness goals.",
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Welcome to Tonal Tracker!</DialogTitle>
          <DialogDescription className="text-center">
            Here’s a quick tour to get you started.
          </DialogDescription>
        </DialogHeader>
        <Carousel className="w-full">
            <CarouselContent>
                {onboardingSteps.map((step, index) => (
                <CarouselItem key={index}>
                    <div className="p-1">
                        <div className="flex h-[300px] items-center justify-center p-6 flex-col gap-4 text-center">
                            <step.icon className="w-16 h-16 text-primary" />
                            <h3 className="text-xl font-semibold">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                        </div>
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
