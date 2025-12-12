'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Merge, ArrowRight, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { WorkoutLog, LoggedExercise } from '@/lib/types';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { seedExercises } from '@/lib/seed-data';

interface MergeExercisesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string | undefined;
}

// Get list of valid exercise names from seed data
const validExerciseNames = seedExercises.map(e => e.name).sort();

export function MergeExercisesDialog({ open, onOpenChange, userId }: MergeExercisesDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isMerging, setIsMerging] = useState(false);
    const [exerciseNames, setExerciseNames] = useState<Map<string, number>>(new Map());
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [mergedExercises, setMergedExercises] = useState<Set<string>>(new Set());

    // Get firestore instance
    const app = getApps()[0];
    const db = app ? getFirestore(app) : null;

    // Load all unique exercise names from workout logs
    useEffect(() => {
        if (!open || !userId || !db) return;

        const loadExerciseNames = async () => {
            setIsLoading(true);
            try {
                const logsRef = collection(db, `users/${userId}/workoutLogs`);
                const snapshot = await getDocs(logsRef);

                const nameCount = new Map<string, number>();

                snapshot.docs.forEach(docSnap => {
                    const log = docSnap.data() as WorkoutLog;
                    log.exercises?.forEach((ex: LoggedExercise) => {
                        const name = ex.exerciseName;
                        nameCount.set(name, (nameCount.get(name) || 0) + 1);
                    });
                });

                setExerciseNames(nameCount);
            } catch (error) {
                console.error('Error loading exercise names:', error);
                toast({ title: 'Error', description: 'Failed to load exercises.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        };

        loadExerciseNames();
    }, [open, userId, toast, db]);

    // Find potential duplicates (names that are similar but not exact)
    const exerciseNamesList = useMemo(() => {
        return Array.from(exerciseNames.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
    }, [exerciseNames]);

    // Handle rename/merge
    const handleMerge = async () => {
        if (!selectedExercise || !newName.trim() || !userId) return;
        if (selectedExercise === newName.trim()) {
            toast({ title: 'No Change', description: 'The new name is the same as the old name.' });
            return;
        }

        setIsMerging(true);
        try {
            if (!db) throw new Error('Firestore not available');
            const logsRef = collection(db, `users/${userId}/workoutLogs`);
            const snapshot = await getDocs(logsRef);

            let updatedCount = 0;

            for (const docSnap of snapshot.docs) {
                const log = docSnap.data() as WorkoutLog;
                let needsUpdate = false;

                const updatedExercises = log.exercises?.map((ex: LoggedExercise) => {
                    if (ex.exerciseName === selectedExercise) {
                        needsUpdate = true;
                        return { ...ex, exerciseName: newName.trim() };
                    }
                    return ex;
                });

                if (needsUpdate) {
                    const docRef = doc(db, `users/${userId}/workoutLogs`, docSnap.id);
                    await updateDoc(docRef, { exercises: updatedExercises });
                    updatedCount++;
                }
            }

            // Update local state
            const newCount = exerciseNames.get(selectedExercise) || 0;
            const existingCount = exerciseNames.get(newName.trim()) || 0;
            const newMap = new Map(exerciseNames);
            newMap.delete(selectedExercise);
            newMap.set(newName.trim(), existingCount + newCount);
            setExerciseNames(newMap);

            // Mark as merged
            setMergedExercises(prev => new Set(prev).add(selectedExercise));

            toast({
                title: 'Exercises Merged',
                description: `Renamed "${selectedExercise}" to "${newName}" in ${updatedCount} workout logs.`
            });

            setSelectedExercise(null);
            setNewName('');
        } catch (error) {
            console.error('Error merging exercises:', error);
            toast({ title: 'Error', description: 'Failed to merge exercises.', variant: 'destructive' });
        } finally {
            setIsMerging(false);
        }
    };

    // Check if an exercise name is in the valid seed data list
    const isValidName = (name: string) => validExerciseNames.includes(name);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Merge className="h-5 w-5" />
                        Merge Duplicate Exercises
                    </DialogTitle>
                    <DialogDescription>
                        Select an exercise to rename. All workout logs will be updated with the new name.
                        Names highlighted in green match the standard exercise library.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Scanning workout logs...</span>
                    </div>
                ) : exerciseNamesList.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No exercises found in your workout history.</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="h-[300px] rounded-md border p-4">
                            <div className="space-y-2">
                                {exerciseNamesList.map(([name, count]) => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            setSelectedExercise(name);
                                            // Suggest closest match from valid names
                                            const lowerName = name.toLowerCase();
                                            const match = validExerciseNames.find(v =>
                                                v.toLowerCase() === lowerName ||
                                                v.toLowerCase().replace(/-/g, ' ') === lowerName.replace(/-/g, ' ')
                                            );
                                            setNewName(match || name);
                                        }}
                                        className={`w-full flex items-center justify-between p-2 rounded-md transition-colors text-left ${selectedExercise === name
                                            ? 'bg-primary text-primary-foreground'
                                            : mergedExercises.has(name)
                                                ? 'bg-muted/50 opacity-50'
                                                : 'hover:bg-muted'
                                            }`}
                                        disabled={mergedExercises.has(name)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isValidName(name) ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <span className="h-4 w-4" />
                                            )}
                                            <span className={isValidName(name) ? 'text-green-600 dark:text-green-400' : ''}>
                                                {name}
                                            </span>
                                        </div>
                                        <Badge variant="secondary" className="ml-2">
                                            {count} {count === 1 ? 'log' : 'logs'}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>

                        {selectedExercise && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground mb-1">Current Name</p>
                                        <p className="font-medium">{selectedExercise}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground mb-1">New Name</p>
                                        <Select value={newName} onValueChange={setNewName}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select or type a name" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {validExerciseNames.map(name => (
                                                    <SelectItem key={name} value={name}>{name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Or enter a custom name:</p>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Enter new exercise name"
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    {selectedExercise && (
                        <Button onClick={handleMerge} disabled={isMerging || !newName.trim()}>
                            {isMerging ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Merging...
                                </>
                            ) : (
                                <>
                                    <Merge className="mr-2 h-4 w-4" />
                                    Rename Exercise
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
