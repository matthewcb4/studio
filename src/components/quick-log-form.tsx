
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Check, Loader2 } from 'lucide-react';

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
import type { Exercise as MasterExercise, LoggedSet } from '@/lib/types';

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

export function QuickLogForm({ exercise, onLog, onCancel }: QuickLogFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const unit = exercise.defaultUnit || 'reps';

    const form = useForm<z.infer<typeof quickLogSchema>>({
        resolver: zodResolver(quickLogSchema),
        defaultValues: {
            sets: [{}],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "sets",
    });

    const onSubmit = (data: z.infer<typeof quickLogSchema>) => {
        setIsSubmitting(true);
        onLog(data.sets);
        setIsSubmitting(false);
        onCancel();
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
                                <FormControl><Input type="number" placeholder="60" {...field} /></FormControl>
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
                                <FormControl><Input type="number" placeholder="12" {...field} /></FormControl>
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
                                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
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
                                        <FormControl><Input type="number" placeholder="10" {...field} /></FormControl>
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
                                    <FormControl><Input type="number" placeholder="135" {...field} /></FormControl>
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
                                    <FormControl><Input type="number" placeholder="8" {...field} /></FormControl>
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
                <DialogTitle>Quick Log: {exercise.name}</DialogTitle>
                <DialogDescription>
                    Record your sets for this exercise. This will create a new entry in your workout history.
                </DialogDescription>
            </DialogHeader>
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
                    
                    <Button type="button" variant="outline" onClick={() => append({})}>
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
