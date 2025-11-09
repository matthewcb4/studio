"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { WorkoutLog } from "@/lib/types";
import { useCollection, useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";


function WorkoutLogDetail({ log }: { log: WorkoutLog }) {
  return (
    <SheetContent className="sm:max-w-lg w-full">
      <SheetHeader>
        <SheetTitle>{log.workoutName}</SheetTitle>
        <SheetDescription>
          {format(new Date(log.date), "eeee, MMMM d, yyyy")}
        </SheetDescription>
      </SheetHeader>
      <div className="py-4 space-y-4">
          <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{log.duration}</span>
          </div>
          <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Volume</span>
              <span className="font-medium">{log.volume.toLocaleString()} lbs</span>
          </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Logged Exercises</h3>
        {log.exercises.map((ex, index) => (
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
  )
}


export default function HistoryPage() {
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();

  const workoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
  }, [firestore, user]);
  
  const { data: workoutLogs, isLoading } = useCollection<WorkoutLog>(workoutLogsQuery);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Workout History</h1>
        <p className="text-muted-foreground">
          Review your past training sessions.
        </p>
      </div>

      <Sheet onOpenChange={(isOpen) => !isOpen && setSelectedLog(null)}>
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
                {isLoading && <TableRow><TableCell colSpan={5} className="text-center">Loading history...</TableCell></TableRow>}
                {!isLoading && workoutLogs?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No workout logs yet.</TableCell></TableRow>}
                {workoutLogs?.map((log) => (
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
        
        {selectedLog && <WorkoutLogDetail log={selectedLog} />}
      </Sheet>
    </div>
  );
}
