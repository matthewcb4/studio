
"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
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
  SheetClose,
  SheetFooter,
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
import type { WorkoutLog, LoggedSet, UserProfile } from "@/lib/types";
import { useCollection, useUser, useFirestore, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Trash2, Star, Edit, Loader2, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareWorkoutDialog } from "@/components/share-workout-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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
    <SheetContent className="sm:max-w-lg w-full flex flex-col">
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
          <span className="font-medium">{(log.volume || 0).toLocaleString()} lbs</span>
        </div>
        {log.rating && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rating</span>
            <StarRating rating={log.rating} />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto -mx-1 pr-1">
        <div className="space-y-4 px-1">
          <h3 className="font-semibold text-lg">Logged Exercises</h3>
          {(log.exercises || []).map((ex, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <h4 className="font-semibold">{ex.exerciseName}</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {ex.sets.map((set, setIndex) => (
                  <li key={setIndex} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span>Set {setIndex + 1}</span>
                      {set.type && set.type !== 'normal' && (
                        <Badge variant="secondary" className="text-xs h-5">
                          {set.type}
                        </Badge>
                      )}
                    </div>
                    <span>{set.weight} lbs x {set.reps} reps</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SheetContent>
  )
}

function EditWorkoutLog({ log, onSave, onCancel }: { log: WorkoutLog, onSave: (updatedLog: WorkoutLog) => void, onCancel: () => void }) {
  const [editedLog, setEditedLog] = useState<WorkoutLog>(log);
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = (field: keyof WorkoutLog, value: string) => {
    setEditedLog(prev => ({ ...prev, [field]: value }));
  };

  const handleSetChange = (exIndex: number, setIndex: number, field: keyof LoggedSet, value: string) => {
    const newExercises = [...(editedLog.exercises || [])];
    const newSets = [...newExercises[exIndex].sets];

    const updatedSet = { ...newSets[setIndex], [field]: field === 'type' ? value : (parseFloat(value) || 0) };
    newSets[setIndex] = updatedSet;

    newExercises[exIndex] = { ...newExercises[exIndex], sets: newSets };
    setEditedLog(prev => ({ ...prev, exercises: newExercises }));
  };

  const handleSaveChanges = () => {
    setIsSaving(true);
    // Recalculate volume
    const totalVolume = (editedLog.exercises || []).reduce(
      (total, ex) =>
        total + ex.sets.reduce((sum, set) => {
          if (set.type === 'warmup') return sum;
          return sum + (set.weight || 0) * (set.reps || 0);
        }, 0),
      0
    );
    onSave({ ...editedLog, volume: totalVolume });
    // isSaving will be reset by the parent component closing the sheet
  };

  return (
    <SheetContent className="sm:max-w-lg w-full flex flex-col">
      <SheetHeader>
        <SheetTitle>Edit Workout Log</SheetTitle>
        <SheetDescription>
          Modify the details of your logged workout session.
        </SheetDescription>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto p-1 -mx-1">
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="workoutName">Workout Name</Label>
            <Input
              id="workoutName"
              value={editedLog.workoutName}
              onChange={e => handleFieldChange('workoutName', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={format(parseISO(editedLog.date), 'yyyy-MM-dd')}
              onChange={e => handleFieldChange('date', new Date(e.target.value).toISOString())}
            />
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-lg mt-4">Logged Exercises</h3>
            {(editedLog.exercises || []).map((ex, exIndex) => (
              <div key={exIndex} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{ex.exerciseName}</h4>
                <div className="mt-2 space-y-2">
                  {ex.sets.map((set, setIndex) => (
                    <div key={setIndex} className="grid grid-cols-[1fr_1fr_1fr_1.5fr] items-center gap-2">
                      <Label className="text-sm text-muted-foreground">Set {setIndex + 1}</Label>
                      <Input
                        type="number"
                        placeholder="Weight"
                        value={set.weight || ''}
                        onChange={e => handleSetChange(exIndex, setIndex, 'weight', e.target.value)}
                        className="h-8"
                      />
                      <Input
                        type="number"
                        placeholder="Reps"
                        value={set.reps || ''}
                        onChange={e => handleSetChange(exIndex, setIndex, 'reps', e.target.value)}
                        className="h-8"
                      />
                      <Select
                        value={set.type || 'normal'}
                        onValueChange={(val) => handleSetChange(exIndex, setIndex, 'type', val as any)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="warmup">Warmup</SelectItem>
                          <SelectItem value="drop">Drop</SelectItem>
                          <SelectItem value="failure">Failure</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </SheetClose>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </SheetFooter>
    </SheetContent>
  );
}


export default function HistoryPage() {
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [sharingLog, setSharingLog] = useState<WorkoutLog | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const workoutLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, `users/${user.uid}/workoutLogs`), orderBy("date", "desc"));
  }, [firestore, user]);

  const { data: workoutLogs, isLoading } = useCollection<WorkoutLog>(workoutLogsQuery);

  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const handleDeleteLog = (logId: string) => {
    if (!user) return;
    const logDocRef = doc(firestore, `users/${user.uid}/workoutLogs`, logId);
    deleteDocumentNonBlocking(logDocRef);
    toast({
      title: "Workout Log Deleted",
      description: "The workout log has been successfully removed.",
    });
  };

  const handleSaveLog = (updatedLog: WorkoutLog) => {
    if (!user || !editingLog) return;
    const logDocRef = doc(firestore, `users/${user.uid}/workoutLogs`, editingLog.id);
    updateDocumentNonBlocking(logDocRef, updatedLog);
    toast({
      title: "Workout Log Updated",
      description: "Your changes have been saved successfully."
    });
    setEditingLog(null); // Close the sheet
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Workout History</h1>
        <p className="text-muted-foreground">
          Review your past training sessions.
        </p>
      </div>

      {sharingLog && userProfile && (
        <ShareWorkoutDialog
          log={sharingLog}
          userProfile={userProfile}
          isOpen={!!sharingLog}
          onOpenChange={(isOpen) => { if (!isOpen) setSharingLog(null) }}
        />
      )}

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
                    <TableCell>{(log.volume || 0).toLocaleString()} lbs</TableCell>
                    <TableCell>
                      {log.rating ? <StarRating rating={log.rating} /> : <span className="text-muted-foreground text-xs">N/A</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <SheetTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            Details
                          </Button>
                        </SheetTrigger>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setEditingLog(log)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setSharingLog(log)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" className="h-9 w-9">
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

      <Sheet open={!!editingLog} onOpenChange={(isOpen) => !isOpen && setEditingLog(null)}>
        {editingLog && <EditWorkoutLog log={editingLog} onSave={handleSaveLog} onCancel={() => setEditingLog(null)} />}
      </Sheet>
    </div>
  );
}
