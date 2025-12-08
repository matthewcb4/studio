"use client";

import { useState, useEffect } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";

type Plate = 45 | 35 | 25 | 10 | 5 | 2.5;
const AVAILABLE_PLATES: Plate[] = [45, 35, 25, 10, 5, 2.5];

export function PlateCalculator({ initialWeight }: { initialWeight?: number }) {
    const [targetWeight, setTargetWeight] = useState<string>(initialWeight?.toString() || "");
    const [barWeight, setBarWeight] = useState<string>("45");
    const [plates, setPlates] = useState<Record<number, number>>({});
    const [remainder, setRemainder] = useState<number>(0);

    useEffect(() => {
        if (initialWeight) {
            setTargetWeight(initialWeight.toString());
        }
    }, [initialWeight]);

    useEffect(() => {
        calculatePlates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetWeight, barWeight]);

    const calculatePlates = () => {
        const weight = parseFloat(targetWeight);
        const bar = parseFloat(barWeight);

        if (isNaN(weight) || isNaN(bar) || weight < bar) {
            setPlates({});
            setRemainder(0);
            return;
        }

        let remainingWeight = (weight - bar) / 2; // Weight per side
        const newPlates: Record<number, number> = {};

        AVAILABLE_PLATES.forEach((plate) => {
            const count = Math.floor(remainingWeight / plate);
            if (count > 0) {
                newPlates[plate] = count;
                remainingWeight -= count * plate;
            }
        });

        setPlates(newPlates);
        setRemainder(remainingWeight * 2); // Remainder is total, not per side
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Plate Calculator</DialogTitle>
                    <DialogDescription>
                        Calculate plates required for your target weight.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Target Weight (lbs)</Label>
                            <Input
                                type="number"
                                value={targetWeight}
                                onChange={(e) => setTargetWeight(e.target.value)}
                                placeholder="225"
                                className="text-lg"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bar Weight (lbs)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={barWeight}
                                    onChange={(e) => setBarWeight(e.target.value)}
                                    placeholder="45"
                                    className="text-lg"
                                />
                                <Button variant="outline" size="icon" onClick={() => setBarWeight("45")} title="Reset to 45">
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="min-h-[150px] flex flex-col items-center justify-center bg-secondary/20 rounded-lg p-4 gap-4">
                        {Object.keys(plates).length === 0 ? (
                            <div className="text-muted-foreground text-sm">Enter a valid weight to see plates.</div>
                        ) : (
                            <>
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">PER SIDE</span>
                                    <div className="flex flex-wrap justify-center items-center gap-1">
                                        {/* Visual representation of the bar end */}
                                        <div className="w-1 h-20 bg-muted-foreground/30 mr-1 rounded-sm"></div>

                                        {AVAILABLE_PLATES.map(plate => {
                                            const count = plates[plate];
                                            if (!count) return null;
                                            return Array.from({ length: count }).map((_, i) => (
                                                <div
                                                    key={`${plate}-${i}`}
                                                    className={`
                                        h-16 flex items-center justify-center border-2 border-border shadow-sm text-xs font-bold text-background
                                        ${plate === 45 ? 'w-4 bg-blue-500' : ''}
                                        ${plate === 35 ? 'w-4 bg-yellow-500' : ''}
                                        ${plate === 25 ? 'w-3 bg-green-500' : ''}
                                        ${plate === 10 ? 'w-3 bg-white border-gray-400 !text-black' : ''}
                                        ${plate === 5 ? 'w-2 bg-red-500' : ''}
                                        ${plate === 2.5 ? 'w-2 bg-black' : ''}
                                        rounded-sm
                                    `}
                                                    title={`${plate} lbs`}
                                                >
                                                    {/* Only show text on wider plates if desired, or relying on tooltip/legend */}
                                                </div>
                                            ));
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-wrap justify-center gap-4 text-sm mt-2">
                                    {AVAILABLE_PLATES.map(plate => {
                                        const count = plates[plate];
                                        if (!count) return null;
                                        return (
                                            <div key={plate} className="flex flex-col items-center">
                                                <span className="font-bold text-xl">{count}x</span>
                                                <span className="text-muted-foreground">{plate} lbs</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                        {remainder > 0 && (
                            <div className="text-destructive text-sm font-medium mt-2">
                                Use micro-plates or collars for remaining {remainder.toFixed(1)} lbs
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
