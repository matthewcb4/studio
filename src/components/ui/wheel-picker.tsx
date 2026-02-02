"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface WheelPickerProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    suffix?: string;
    className?: string;
}

export function WheelPicker({
    value,
    onChange,
    min = 0,
    max = 500,
    step = 5,
    label,
    suffix,
    className,
}: WheelPickerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastY = useRef(0);
    const velocity = useRef(0);
    const animationFrame = useRef<number | null>(null);

    // Generate values array
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(i);
    }

    // Calculate visible items (show 5 items: 2 above, current, 2 below)
    const visibleCount = 5;
    const itemHeight = 44; // Height of each item in pixels

    const currentIndex = values.indexOf(value);
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;

    // Scroll to value on mount and when value changes externally
    useEffect(() => {
        if (containerRef.current && !isDragging) {
            const scrollTop = safeIndex * itemHeight;
            containerRef.current.scrollTop = scrollTop;
        }
    }, [safeIndex, isDragging, itemHeight]);

    const handleScroll = useCallback(() => {
        if (containerRef.current && !isDragging) {
            const scrollTop = containerRef.current.scrollTop;
            const newIndex = Math.round(scrollTop / itemHeight);
            const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));

            if (values[clampedIndex] !== value) {
                onChange(values[clampedIndex]);
            }
        }
    }, [isDragging, itemHeight, values, value, onChange]);

    const handleScrollEnd = useCallback(() => {
        if (containerRef.current) {
            const scrollTop = containerRef.current.scrollTop;
            const newIndex = Math.round(scrollTop / itemHeight);
            const clampedIndex = Math.max(0, Math.min(newIndex, values.length - 1));

            // Snap to nearest value
            containerRef.current.scrollTo({
                top: clampedIndex * itemHeight,
                behavior: 'smooth'
            });

            if (values[clampedIndex] !== value) {
                onChange(values[clampedIndex]);
            }
        }
    }, [itemHeight, values, value, onChange]);

    // Handle wheel events for precise control
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        if (containerRef.current) {
            const delta = e.deltaY > 0 ? step : -step;
            const newValue = Math.max(min, Math.min(max, value + delta));
            onChange(newValue);
        }
    }, [value, min, max, step, onChange]);

    // Touch handling for mobile
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true);
        lastY.current = e.touches[0].clientY;
        velocity.current = 0;
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
        }
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const currentY = e.touches[0].clientY;
        const deltaY = lastY.current - currentY;
        velocity.current = deltaY;
        lastY.current = currentY;

        containerRef.current.scrollTop += deltaY;
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        handleScrollEnd();
    }, [handleScrollEnd]);

    return (
        <div className={cn("flex flex-col items-center", className)}>
            {label && (
                <span className="text-sm font-medium text-muted-foreground mb-1">{label}</span>
            )}
            <div className="relative">
                {/* Selection highlight */}
                <div
                    className="absolute left-0 right-0 pointer-events-none z-10 border-y-2 border-primary bg-primary/10 rounded"
                    style={{
                        top: `${(visibleCount - 1) / 2 * itemHeight}px`,
                        height: `${itemHeight}px`
                    }}
                />

                {/* Gradient overlays */}
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />

                {/* Scrollable container */}
                <div
                    ref={containerRef}
                    className="overflow-y-auto scrollbar-hide scroll-smooth"
                    style={{
                        height: `${visibleCount * itemHeight}px`,
                        scrollSnapType: 'y mandatory',
                    }}
                    onScroll={handleScroll}
                    onScrollCapture={() => {
                        // Debounce scroll end detection
                        if (animationFrame.current) {
                            cancelAnimationFrame(animationFrame.current);
                        }
                        animationFrame.current = requestAnimationFrame(() => {
                            setTimeout(handleScrollEnd, 100);
                        });
                    }}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Padding elements for proper centering */}
                    <div style={{ height: `${((visibleCount - 1) / 2) * itemHeight}px` }} />

                    {values.map((v) => (
                        <div
                            key={v}
                            className={cn(
                                "flex items-center justify-center font-semibold transition-all cursor-pointer select-none",
                                v === value
                                    ? "text-2xl text-foreground"
                                    : "text-xl text-muted-foreground/50"
                            )}
                            style={{
                                height: `${itemHeight}px`,
                                scrollSnapAlign: 'center',
                            }}
                            onClick={() => {
                                onChange(v);
                                if (containerRef.current) {
                                    const index = values.indexOf(v);
                                    containerRef.current.scrollTo({
                                        top: index * itemHeight,
                                        behavior: 'smooth'
                                    });
                                }
                            }}
                        >
                            {v}{suffix && <span className="text-sm ml-1 text-muted-foreground">{suffix}</span>}
                        </div>
                    ))}

                    {/* Padding elements for proper centering */}
                    <div style={{ height: `${((visibleCount - 1) / 2) * itemHeight}px` }} />
                </div>
            </div>
        </div>
    );
}

// Preset configurations for common use cases
export function WeightPicker({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return (
        <WheelPicker
            value={value}
            onChange={onChange}
            min={0}
            max={500}
            step={5}
            label="Weight"
            suffix="lbs"
            className={className}
        />
    );
}

export function RepsPicker({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return (
        <WheelPicker
            value={value}
            onChange={onChange}
            min={0}
            max={50}
            step={1}
            label="Reps"
            className={className}
        />
    );
}

export function DurationPicker({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
    return (
        <WheelPicker
            value={value}
            onChange={onChange}
            min={0}
            max={300}
            step={5}
            label="Seconds"
            suffix="s"
            className={className}
        />
    );
}
