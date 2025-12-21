
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Check, Loader2, Edit, Save } from 'lucide-react';

import {
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Exercise as MasterExercise, LoggedSet, WorkoutExercise } from '@/lib/types';
import { Label } from '@/components/ui/label';

const quickLogSetSchema = z.object({
    weight: z.coerce.number().min(0, "Weight must be positive.").optional(),
    reps: z.coerce.number().min(1, "Reps must be at least 1.").optional(),
    duration: z.coerce.number().min(1, "Duration must be at least 1 second.").optional(),
    bodyweightPercentage: z.coerce.number().optional(), // 0, 0.65, or 1
});

const quickLogSchema = z.object({
    sets: z.array(quickLogSetSchema).min(1, "Log at least one set."),
});

interface QuickLogFormProps {
    exercise: MasterExercise;
    onLog: (sets: LoggedSet[]) => void;
    onCancel: () => void;
}

const getDefaultSetValues = (unit: string) => {
    switch (unit) {
        case 'seconds':
            return { duration: undefined };
        case 'reps-only':
            return { reps: undefined };
        case 'bodyweight':
            return { weight: undefined, reps: undefined, bodyweightPercentage: 0 };
        case 'reps':
        default:
            return { weight: undefined, reps: undefined };
    }
}

import { Card, CardContent } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";

export function QuickLogForm({ exercise, onLog, onCancel }: QuickLogFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [unit, setUnit] = useState<WorkoutExercise['unit']>(exercise.defaultUnit || 'reps');

    const form = useForm<z.infer<typeof quickLogSchema>>({
        resolver: zodResolver(quickLogSchema),
        defaultValues: {
            sets: [getDefaultSetValues(unit)],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "sets",
    });

    const handleUnitChange = (newUnit: WorkoutExercise['unit']) => {
        setUnit(newUnit);
        // Reset the form fields to match the new unit structure
        replace([getDefaultSetValues(newUnit)]);
    };

    const onSubmit = (data: z.infer<typeof quickLogSchema>) => {
        setIsSubmitting(true);
        onLog(data.sets as LoggedSet[]);
        // No need to set isSubmitting to false, as the component will unmount
    };

    const renderSetInputs = (index: number) => {
        switch (unit) {
            case 'seconds':
                return (
                    <FormField
                        control={form.control}
                        name={`sets.${index}.duration`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl><Input type="number" placeholder="60" {...field} value={field.value ?? ''} className="bg-transparent border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-center text-lg font-medium" /></FormControl>
                                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block mt-1">Duration (s)</FormLabel>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );
            case 'reps-only':
                return (
                    <FormField
                        control={form.control}
                        name={`sets.${index}.reps`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl><Input type="number" placeholder="12" {...field} value={field.value ?? ''} className="bg-transparent border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-center text-lg font-medium" /></FormControl>
                                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block mt-1">Reps</FormLabel>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );
            case 'bodyweight':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`sets.${index}.weight`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} className="bg-transparent border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-center" /></FormControl>
                                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block mt-1">Add. Weight</FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`sets.${index}.reps`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl><Input type="number" placeholder="10" {...field} value={field.value ?? ''} className="bg-transparent border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-center" /></FormControl>
                                        <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block mt-1">Reps</FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name={`sets.${index}.bodyweightPercentage`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block">Bodyweight</FormLabel>
                                    <Select
                                        value={(field.value ?? 0).toString()}
                                        onValueChange={(val) => field.onChange(parseFloat(val))}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="0">Don't Include</SelectItem>
                                            <SelectItem value="0.65">Partial (65%)</SelectItem>
                                            <SelectItem value="1">Full (100%)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                );
            case 'reps':
            default:
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name={`sets.${index}.weight`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" placeholder="135" {...field} value={field.value ?? ''} className="bg-transparent border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-center font-medium" /></FormControl>
                                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block mt-1">Lbs</FormLabel>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`sets.${index}.reps`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl><Input type="number" placeholder="8" {...field} value={field.value ?? ''} className="bg-transparent border-0 border-b border-border rounded-none shadow-none focus-visible:ring-0 focus-visible:border-primary px-0 text-center font-medium" /></FormControl>
                                    <FormLabel className="text-xs text-muted-foreground uppercase tracking-wider text-center block mt-1">Reps</FormLabel>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                );
        }
    };

    return (
        <>
            <DialogHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <DialogTitle>Quick Log: {exercise.name}</DialogTitle>
                        <DialogDescription>
                            Record your sets for this exercise.
                        </DialogDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(prev => !prev)}>
                        {isEditing ? <Save className="h-5 w-5" /> : <Edit className="h-5 w-5" />}
                    </Button>
                </div>
            </DialogHeader>

            {isEditing && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 py-4"
                >
                    <Label>Logging Method</Label>
                    <Select value={unit} onValueChange={(newUnit) => handleUnitChange(newUnit as WorkoutExercise['unit'])}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="reps">Weight & Reps</SelectItem>
                            <SelectItem value="reps-only">Reps Only</SelectItem>
                            <SelectItem value="seconds">Seconds</SelectItem>
                            <SelectItem value="bodyweight">Bodyweight</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="max-h-[50vh] overflow-y-auto pr-2 -mr-2 space-y-3">
                        <AnimatePresence mode='popLayout'>
                            {fields.map((field, index) => (
                                <motion.div
                                    key={field.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card className="overflow-hidden border-border/50 shadow-sm bg-card/50">
                                        <CardContent className="p-3 flex items-center justify-between gap-4">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/50 text-xs font-semibold text-muted-foreground shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                {renderSetInputs(index)}
                                            </div>
                                            <div className="self-center">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <Button type="button" variant="outline" className="w-full border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary" onClick={() => append(getDefaultSetValues(unit))}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Set
                    </Button>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                            Log Exercise
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </>
    )
}
