'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share, PlusSquare } from 'lucide-react';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";

export function IosInstallPrompt() {
    const [isOpen, setIsOpen] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIos(isIosDevice);

        // Check if installed (standalone mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        // Check if previously dismissed
        const hasDismissed = localStorage.getItem('ios-install-prompt-dismissed');

        if (isIosDevice && !isStandalone && !hasDismissed) {
            // Delay prompt slightly for better UX
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem('ios-install-prompt-dismissed', 'true');
    };

    if (!isIos) return null;

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-3xl">📱</span> Install fRepo
                    </DrawerTitle>
                    <DrawerDescription className="text-base text-muted-foreground mt-2">
                        Install this app on your iPhone for the best experience. It takes less than 10 seconds!
                    </DrawerDescription>
                </DrawerHeader>

                <div className="p-4 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-secondary/30 rounded-lg">
                        <div className="bg-background p-2 rounded-md shadow-sm">
                            <Share className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">1. Tap the Share button</h4>
                            <p className="text-sm text-muted-foreground">Look for the square with an arrow, usually at the bottom of Safari.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-secondary/30 rounded-lg">
                        <div className="bg-background p-2 rounded-md shadow-sm">
                            <PlusSquare className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">2. Select "Add to Home Screen"</h4>
                            <p className="text-sm text-muted-foreground">Scroll down the list causing the menu to appear.</p>
                        </div>
                    </div>
                </div>

                <DrawerFooter className="pt-2">
                    <Button onClick={handleDismiss} variant="outline" size="lg" className="w-full">
                        Maybe Later
                    </Button>
                    <div className="h-4" /> {/* Spacer for home indicator */}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
