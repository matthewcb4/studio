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

// Horizontal dial - sleek scrolling dial that looks like a real dial with haptic feedback
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

// Haptic feedback helper
const vibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

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
    const lastValue = useRef(value);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(i);
    }

    // Narrower tick width for more dial-like feel
    const tickWidth = 16;
    const currentIndex = values.indexOf(value);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    // Scroll to value on mount and when value changes externally
    useEffect(() => {
        if (containerRef.current && !isDragging) {
            const scrollLeft = safeIndex * tickWidth;
            containerRef.current.scrollLeft = scrollLeft;
        }
    }, [safeIndex, isDragging]);

    // Haptic feedback when value changes
    useEffect(() => {
        if (value !== lastValue.current) {
            // Short vibration pulse - like clicking into a notch
            vibrate(5);
            lastValue.current = value;
        }
    }, [value]);

    const handleScroll = useCallback(() => {
        if (containerRef.current) {
            const scrollLeft = containerRef.current.scrollLeft;
            const newIndex = Math.round(scrollLeft / tickWidth);
            const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));

            if (values[clampedIndex] !== value) {
                onChange(values[clampedIndex]);
            }
        }
    }, [tickWidth, values, value, onChange]);

    const handleScrollEnd = useCallback(() => {
        if (containerRef.current) {
            const scrollLeft = containerRef.current.scrollLeft;
            const newIndex = Math.round(scrollLeft / tickWidth);
            const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));

            // Snap to nearest tick
            containerRef.current.scrollTo({
                left: clampedIndex * tickWidth,
                behavior: 'smooth'
            });

            if (values[clampedIndex] !== value) {
                onChange(values[clampedIndex]);
            }
        }
    }, [tickWidth, values, value, onChange]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true);
        lastX.current = e.touches[0].clientX;
        // Light vibration on grab
        vibrate(3);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;
        const currentX = e.touches[0].clientX;
        const deltaX = lastX.current - currentX;
        lastX.current = currentX;
        containerRef.current.scrollLeft += deltaX;
        handleScroll();
    }, [isDragging, handleScroll]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        handleScrollEnd();
        // Confirmation vibration
        vibrate(10);
    }, [handleScrollEnd]);

    // Handle mouse wheel for desktop
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? step : -step;
        const newValue = Math.max(min, Math.min(max, value + delta));
        onChange(newValue);
    }, [value, min, max, step, onChange]);

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            {/* Current value display - prominent */}
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
                {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
            </div>

            {label && (
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            )}

            {/* Dial container with metallic look */}
            <div className="relative w-full max-w-[300px]">
                {/* Metallic track background */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-700 shadow-inner" style={{ height: '52px' }} />

                {/* Center indicator - red notch like a real dial */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-transparent border-t-red-500 drop-shadow-md" />
                </div>

                {/* Gradient fades for 3D effect */}
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none rounded-l-full" />
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none rounded-r-full" />

                {/* Scrollable dial */}
                <div
                    ref={containerRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth relative z-10"
                    style={{
                        scrollSnapType: 'x mandatory',
                        height: '52px',
                    }}
                    onScroll={() => {
                        handleScroll();
                        // Debounce scroll end
                        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
                        scrollTimeout.current = setTimeout(handleScrollEnd, 150);
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onWheel={handleWheel}
                >
                    <div
                        className="flex items-end h-full"
                        style={{
                            paddingLeft: `calc(50% - ${tickWidth / 2}px)`,
                            paddingRight: `calc(50% - ${tickWidth / 2}px)`
                        }}
                    >
                        {values.map((v, i) => {
                            const isMajor = v % (step * 5) === 0;
                            const isSelected = v === value;

                            return (
                                <div
                                    key={v}
                                    className="flex flex-col items-center justify-end shrink-0 cursor-pointer select-none"
                                    style={{
                                        width: `${tickWidth}px`,
                                        scrollSnapAlign: 'center',
                                        height: '100%',
                                        paddingBottom: '4px',
                                    }}
                                    onClick={() => {
                                        onChange(v);
                                        vibrate(8);
                                    }}
                                >
                                    {/* Tick mark - like ridges on a dial */}
                                    <div
                                        className={cn(
                                            "rounded-full transition-all duration-100",
                                            isSelected
                                                ? "bg-primary w-[3px]"
                                                : isMajor
                                                    ? "bg-zinc-500 dark:bg-zinc-400 w-[2px]"
                                                    : "bg-zinc-400 dark:bg-zinc-500 w-[1px]"
                                        )}
                                        style={{
                                            height: isSelected ? '32px' : isMajor ? '24px' : '12px',
                                        }}
                                    />
                                    {/* Number labels for major ticks */}
                                    {isMajor && (
                                        <span className={cn(
                                            "text-[10px] tabular-nums mt-1 transition-all",
                                            isSelected ? "font-bold text-primary" : "text-muted-foreground"
                                        )}>
                                            {v}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom shadow for depth */}
                <div className="absolute left-4 right-4 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-black/30 z-10 pointer-events-none" />
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
