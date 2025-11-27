
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

const quickLogSetSchema = z.object({
    weight: z.coerce.number().min(0, "Weight must be positive.").optional(),
    reps: z.coerce.number().min(1, "Reps must be at least 1.").optional(),
    duration: z.coerce.number().min(1, "Duration must be at least 1 second.").optional(),
    includeBodyweight: z.boolean().optional(),
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
            return { weight: undefined, reps: undefined, includeBodyweight: false };
        case 'reps':
        default:
            return { weight: undefined, reps: undefined };
    }
}

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
                                <FormLabel>Duration (s)</FormLabel>
                                <FormControl><Input type="number" placeholder="60" {...field} value={field.value ?? ''} /></FormControl>
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
                                <FormLabel>Reps</FormLabel>
                                <FormControl><Input type="number" placeholder="12" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                );
            case 'bodyweight':
                 return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                             <FormField
                                control={form.control}
                                name={`sets.${index}.weight`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Add. Weight</FormLabel>
                                        <FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name={`sets.${index}.reps`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reps</FormLabel>
                                        <FormControl><Input type="number" placeholder="10" {...field} value={field.value ?? ''} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name={`sets.${index}.includeBodyweight`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                        Include Bodyweight
                                    </FormLabel>
                                </FormItem>
                            )}
                        />
                    </div>
                );
            case 'reps':
            default:
                return (
                    <div className="grid grid-cols-2 gap-2">
                         <FormField
                            control={form.control}
                            name={`sets.${index}.weight`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Weight (lbs)</FormLabel>
                                    <FormControl><Input type="number" placeholder="135" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`sets.${index}.reps`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reps</FormLabel>
                                    <FormControl><Input type="number" placeholder="8" {...field} value={field.value ?? ''} /></FormControl>
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
                <div className="space-y-2 py-4">
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
                </div>
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-end gap-2 p-3 border rounded-md">
                                <div className="font-medium text-sm text-muted-foreground pt-7">Set {index + 1}</div>
                                <div className="flex-1">
                                    {renderSetInputs(index)}
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive h-9 w-9 mb-1">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    
                    <Button type="button" variant="outline" onClick={() => append(getDefaultSetValues(unit))}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Set
                    </Button>
                    
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                             Log Exercise
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </>
    )
}
