"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { workoutLogs } from "@/lib/data";
import type { WorkoutLog } from "@/lib/types";

export default function HistoryPage() {
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  
  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Workout History</h1>
        <p className="text-muted-foreground">
          Review your past training sessions.
        </p>
      </div>

      <Sheet>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Workout</TableHead>
                  <TableHead className="hidden md:table-cell">Duration</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{log.workoutName}</TableCell>
                    <TableCell className="hidden md:table-cell">{log.duration}</TableCell>
                    <TableCell className="text-right">{log.volume.toLocaleString()} lbs</TableCell>
                    <TableCell className="text-right">
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          Details
                        </Button>
                      </SheetTrigger>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {selectedLog && (
          <SheetContent className="sm:max-w-lg w-full">
            <SheetHeader>
              <SheetTitle>{selectedLog.workoutName}</SheetTitle>
              <SheetDescription>
                {format(new Date(selectedLog.date), "eeee, MMMM d, yyyy")}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{selectedLog.duration}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Volume</span>
                    <span className="font-medium">{selectedLog.volume.toLocaleString()} lbs</span>
                </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Logged Exercises</h3>
              {selectedLog.exercises.map((ex, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-semibold">{ex.exerciseName}</h4>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {ex.sets.map((set, setIndex) => (
                      <li key={setIndex} className="flex justify-between">
                        <span>Set {setIndex + 1}</span>
                        <span>{set.weight} lbs x {set.reps} reps</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SheetContent>
        )}
      </Sheet>
    </div>
  );
}
