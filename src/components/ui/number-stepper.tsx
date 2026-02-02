"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
    className?: string;
}

export function NumberStepper({
    value,
    onChange,
    min = 0,
    max = 500,
    step = 5,
    label,
    suffix,
    className,
}: NumberStepperProps) {
    const [isHolding, setIsHolding] = useState<'inc' | 'dec' | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const increment = useCallback(() => {
        onChange(Math.min(max, value + step));
    }, [onChange, max, value, step]);

    const decrement = useCallback(() => {
        onChange(Math.max(min, value - step));
    }, [onChange, min, value, step]);

    // Handle hold-to-repeat
    useEffect(() => {
        if (isHolding) {
            // Start slow, then speed up
            timeoutRef.current = setTimeout(() => {
                intervalRef.current = setInterval(() => {
                    if (isHolding === 'inc') increment();
                    else decrement();
                }, 80);
            }, 300);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [isHolding, increment, decrement]);

    const handleStart = (direction: 'inc' | 'dec') => {
        setIsHolding(direction);
        if (direction === 'inc') increment();
        else decrement();
    };

    const handleEnd = () => {
        setIsHolding(null);
    };

    return (
        <div className={cn("flex flex-col items-center gap-1", className)}>
            {label && (
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
            )}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        "bg-secondary hover:bg-secondary/80 active:bg-secondary/60",
                        "transition-colors touch-none select-none",
                        value <= min && "opacity-30 pointer-events-none"
                    )}
                    onMouseDown={() => handleStart('dec')}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={() => handleStart('dec')}
                    onTouchEnd={handleEnd}
                    disabled={value <= min}
                >
                    <Minus className="w-5 h-5" />
                </button>

                <div className="flex items-baseline justify-center min-w-[80px]">
                    <span className="text-2xl font-bold tabular-nums">{value}</span>
                    {suffix && (
                        <span className="text-sm text-muted-foreground ml-1">{suffix}</span>
                    )}
                </div>

                <button
                    type="button"
                    className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full",
                        "bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground",
                        "transition-colors touch-none select-none",
                        value >= max && "opacity-30 pointer-events-none"
                    )}
                    onMouseDown={() => handleStart('inc')}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={() => handleStart('inc')}
                    onTouchEnd={handleEnd}
                    disabled={value >= max}
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// Horizontal dial - sleek scrolling dial that's compact vertically
interface HorizontalDialProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
    className?: string;
}

export function HorizontalDial({
    value,
    onChange,
    min = 0,
    max = 500,
    step = 5,
    label,
    suffix,
    className,
}: HorizontalDialProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastX = useRef(0);

    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(i);
    }

    const itemWidth = 60;
    const visibleCount = 5;
    const currentIndex = values.indexOf(value);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    useEffect(() => {
        if (containerRef.current && !isDragging) {
            const scrollLeft = safeIndex * itemWidth;
            containerRef.current.scrollLeft = scrollLeft;
        }
    }, [safeIndex, isDragging]);

    const handleScrollEnd = useCallback(() => {
        if (containerRef.current) {
            const scrollLeft = containerRef.current.scrollLeft;
            const newIndex = Math.round(scrollLeft / itemWidth);
            const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));

            containerRef.current.scrollTo({
                left: clampedIndex * itemWidth,
                behavior: 'smooth'
            });

            if (values[clampedIndex] !== value) {
                onChange(values[clampedIndex]);
            }
        }
    }, [itemWidth, values, value, onChange]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true);
        lastX.current = e.touches[0].clientX;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;
        const currentX = e.touches[0].clientX;
        const deltaX = lastX.current - currentX;
        lastX.current = currentX;
        containerRef.current.scrollLeft += deltaX;
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        handleScrollEnd();
    }, [handleScrollEnd]);

    return (
        <div className={cn("flex flex-col items-center gap-1", className)}>
            {label && (
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
            )}
            <div className="relative w-full max-w-[280px]">
                {/* Center indicator */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-primary -translate-x-1/2 z-20 pointer-events-none" />
                <div className="absolute left-1/2 -top-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-primary -translate-x-1/2 z-20 pointer-events-none" />

                {/* Gradient fades */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

                {/* Scrollable container */}
                <div
                    ref={containerRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth"
                    style={{
                        scrollSnapType: 'x mandatory',
                    }}
                    onScroll={() => {
                        if (!isDragging) {
                            // Debounce
                            setTimeout(handleScrollEnd, 100);
                        }
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="flex" style={{ paddingLeft: `calc(50% - ${itemWidth / 2}px)`, paddingRight: `calc(50% - ${itemWidth / 2}px)` }}>
                        {values.map((v) => (
                            <div
                                key={v}
                                className={cn(
                                    "flex flex-col items-center justify-center shrink-0 cursor-pointer select-none py-2",
                                    v === value ? "opacity-100" : "opacity-40"
                                )}
                                style={{
                                    width: `${itemWidth}px`,
                                    scrollSnapAlign: 'center',
                                }}
                                onClick={() => onChange(v)}
                            >
                                {/* Tick mark */}
                                <div className={cn(
                                    "w-[2px] mb-1 bg-foreground/50 transition-all",
                                    v === value ? "h-4" : v % (step * 5) === 0 ? "h-3" : "h-2"
                                )} />
                                {/* Value label - only show for major ticks or selected */}
                                {(v === value || v % (step * 5) === 0) && (
                                    <span className={cn(
                                        "text-xs tabular-nums transition-all",
                                        v === value ? "font-bold text-foreground" : "text-muted-foreground"
                                    )}>
                                        {v}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current value display */}
                <div className="text-center mt-1">
                    <span className="text-lg font-bold">{value}</span>
                    {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
                </div>
            </div>
        </div>
    );
}

// Compact preset exports
export function WeightStepper({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return <NumberStepper value={value} onChange={onChange} min={0} max={500} step={5} label="Weight" suffix="lbs" className={className} />;
}

export function RepsStepper({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return <NumberStepper value={value} onChange={onChange} min={0} max={50} step={1} label="Reps" className={className} />;
}

export function DurationStepper({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return <NumberStepper value={value} onChange={onChange} min={0} max={300} step={5} label="Duration" suffix="s" className={className} />;
}
