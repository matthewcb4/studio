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

// Horizontal dial props
interface HorizontalDialProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
    className?: string;
    compact?: boolean;
}

// Haptic feedback helper - uses Capacitor Haptics on native, fallback to web API
const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const impactStyle = style === 'light' ? ImpactStyle.Light :
            style === 'medium' ? ImpactStyle.Medium : ImpactStyle.Heavy;
        await Haptics.impact({ style: impactStyle });
    } catch {
        // Fallback to web vibration API
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            const duration = style === 'light' ? 5 : style === 'medium' ? 10 : 20;
            navigator.vibrate(duration);
        }
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
    compact = true,
}: HorizontalDialProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastX = useRef(0);
    const lastValue = useRef(value);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Values for snapping (main step values)
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(i);
    }

    const tickWidth = compact ? 8 : 12;
    const dialHeight = compact ? 36 : 52;
    const currentIndex = values.indexOf(value);
    const safeIndex = currentIndex >= 0 ? currentIndex : Math.round((value - min) / step);

    useEffect(() => {
        if (containerRef.current && !isDragging) {
            const scrollLeft = safeIndex * tickWidth;
            containerRef.current.scrollLeft = scrollLeft;
        }
    }, [safeIndex, isDragging, tickWidth]);

    useEffect(() => {
        if (value !== lastValue.current) {
            triggerHaptic('light');
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
        triggerHaptic('light');
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
        triggerHaptic('medium');
    }, [handleScrollEnd]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? step : -step;
        const newValue = Math.max(min, Math.min(max, value + delta));
        onChange(newValue);
    }, [value, min, max, step, onChange]);

    // Compact layout: value on left, dial on right
    if (compact) {
        return (
            <div className={cn("flex items-center gap-3", className)}>
                {/* Value on left */}
                <div className="flex flex-col items-end min-w-[65px]">
                    <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold tabular-nums">{value}</span>
                        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
                    </div>
                    {label && (
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>
                    )}
                </div>

                {/* Compact dial on right */}
                <div className="relative flex-1 max-w-[160px]">
                    {/* Metallic background */}
                    <div
                        className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-700 shadow-inner"
                        style={{ height: `${dialHeight}px` }}
                    />

                    {/* Red notch indicator */}
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 z-30 pointer-events-none">
                        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-red-500" />
                    </div>

                    {/* Gradient fades */}
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none rounded-l-full" />
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none rounded-r-full" />

                    {/* Scrollable dial */}
                    <div
                        ref={containerRef}
                        className="overflow-x-auto scrollbar-hide scroll-smooth relative z-10"
                        style={{ scrollSnapType: 'x mandatory', height: `${dialHeight}px` }}
                        onScroll={() => {
                            handleScroll();
                            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
                            scrollTimeout.current = setTimeout(handleScrollEnd, 100);
                        }}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onWheel={handleWheel}
                    >
                        <div
                            className="flex items-end h-full"
                            style={{ paddingLeft: `calc(50% - ${tickWidth / 2}px)`, paddingRight: `calc(50% - ${tickWidth / 2}px)` }}
                        >
                            {values.map((v) => {
                                const isSelected = v === value;
                                // Show labels every 10 lbs (or 4 steps of 2.5)
                                const showLabel = v % 10 === 0;
                                // Major ticks every 5 lbs
                                const isMajor = v % 5 === 0;
                                return (
                                    <div
                                        key={v}
                                        className="flex flex-col items-center justify-end shrink-0 cursor-pointer select-none"
                                        style={{
                                            width: `${tickWidth}px`,
                                            scrollSnapAlign: 'center',
                                            height: '100%',
                                            paddingBottom: '2px'
                                        }}
                                        onClick={() => {
                                            onChange(v);
                                            triggerHaptic('medium');
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                "rounded-full transition-all",
                                                isSelected ? "bg-primary w-[2px]" :
                                                    isMajor ? "bg-zinc-500 dark:bg-zinc-400 w-[1.5px]" :
                                                        "bg-zinc-400 dark:bg-zinc-500 w-[1px]"
                                            )}
                                            style={{
                                                height: isSelected ? '20px' :
                                                    isMajor ? '12px' : '6px'
                                            }}
                                        />
                                        {showLabel && (
                                            <span className={cn("text-[7px] tabular-nums mt-0.5", isSelected ? "font-bold text-primary" : "text-muted-foreground")}>
                                                {v}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Full-width layout (original)
    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular-nums">{value}</span>
                {suffix && <span className="text-base text-muted-foreground">{suffix}</span>}
            </div>
            {label && <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>}

            <div className="relative w-full max-w-[300px]">
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-200 to-zinc-300 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-700 shadow-inner" style={{ height: '52px' }} />
                <div className="absolute left-1/2 top-0 -translate-x-1/2 z-30 pointer-events-none">
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-transparent border-t-red-500" />
                </div>
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background via-background/80 to-transparent z-20 pointer-events-none rounded-l-full" />
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/80 to-transparent z-20 pointer-events-none rounded-r-full" />

                <div
                    ref={containerRef}
                    className="overflow-x-auto scrollbar-hide scroll-smooth relative z-10"
                    style={{ scrollSnapType: 'x mandatory', height: '52px' }}
                    onScroll={() => {
                        handleScroll();
                        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
                        scrollTimeout.current = setTimeout(handleScrollEnd, 150);
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onWheel={handleWheel}
                >
                    <div className="flex items-end h-full" style={{ paddingLeft: `calc(50% - ${tickWidth / 2}px)`, paddingRight: `calc(50% - ${tickWidth / 2}px)` }}>
                        {values.map((v) => {
                            const isMajor = v % (step * 5) === 0;
                            const isSelected = v === value;
                            return (
                                <div
                                    key={v}
                                    className="flex flex-col items-center justify-end shrink-0 cursor-pointer select-none"
                                    style={{ width: `${tickWidth}px`, scrollSnapAlign: 'center', height: '100%', paddingBottom: '4px' }}
                                    onClick={() => { onChange(v); triggerHaptic('medium'); }}
                                >
                                    <div
                                        className={cn("rounded-full transition-all", isSelected ? "bg-primary w-[3px]" : isMajor ? "bg-zinc-500 dark:bg-zinc-400 w-[2px]" : "bg-zinc-400 dark:bg-zinc-500 w-[1px]")}
                                        style={{ height: isSelected ? '32px' : isMajor ? '24px' : '12px' }}
                                    />
                                    {isMajor && (
                                        <span className={cn("text-[10px] tabular-nums mt-1", isSelected ? "font-bold text-primary" : "text-muted-foreground")}>{v}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Preset exports
export function WeightStepper({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return <NumberStepper value={value} onChange={onChange} min={0} max={500} step={5} label="Weight" suffix="lbs" className={className} />;
}

export function RepsStepper({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return <NumberStepper value={value} onChange={onChange} min={0} max={50} step={1} label="Reps" className={className} />;
}

export function DurationStepper({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return <NumberStepper value={value} onChange={onChange} min={0} max={300} step={5} label="Duration" suffix="s" className={className} />;
}
