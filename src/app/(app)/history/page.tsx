
"use client";

import { useState, useMemo } from "react";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { WorkoutLog } from "@/lib/types";
import { useCollection, useUser, useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StarRating({ rating }: { rating: number }) {
    if (rating < 1) return null;
    return (
        <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className="w-4 h-4"
                    fill={star <= rating ? 'hsl(var(--primary))' : 'transparent'}
                    stroke="currentColor"
                />
            ))}
        </div>
    )
}

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
          {log.rating && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rating</span>
              <StarRating rating={log.rating} />
            </div>
          )}
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
  const { toast } = useToast();

  const workoutLogsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
  }, [firestore, user]);
  
  const { data: workoutLogs, isLoading } = useCollection<WorkoutLog>(workoutLogsQuery);

  const handleDeleteLog = (logId: string) => {
    if (!user) return;
    const logDocRef = doc(firestore, `users/${user.uid}/workoutLogs`, logId);
    deleteDocumentNonBlocking(logDocRef);
    toast({
      title: "Workout Log Deleted",
      description: "The workout log has been successfully removed.",
    });
  };

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
                  <TableHead>Volume</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={6} className="text-center">Loading history...</TableCell></TableRow>}
                {!isLoading && workoutLogs?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center">No workout logs yet.</TableCell></TableRow>}
                {workoutLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>{log.workoutName}</TableCell>
                    <TableCell className="hidden md:table-cell">{log.duration}</TableCell>
                    <TableCell>{log.volume.toLocaleString()} lbs</TableCell>
                    <TableCell>
                        {log.rating ? <StarRating rating={log.rating} /> : <span className="text-muted-foreground text-xs">N/A</span>}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex flex-col items-center gap-2">
                          <SheetTrigger asChild>
                              <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                  className="w-[70px]"
                              >
                                  Details
                              </Button>
                          </SheetTrigger>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon" className="w-8 h-8">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete this workout log.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteLog(log.id)}>
                                          Delete
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                       </div>
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

    