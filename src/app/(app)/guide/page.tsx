'use client';

import { Bot, Dumbbell } from 'lucide-react';

export default function GuidePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <Bot className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Fitness Guide</h1>
          <p className="text-muted-foreground">
            Let our AI craft the perfect workout for you.
          </p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 border-2 border-dashed rounded-lg">
        <Dumbbell className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Your Workout Plan Awaits</h2>
        <p className="text-muted-foreground text-center">We'll rebuild the workout generation form here.</p>
      </div>
    </div>
  );
}
