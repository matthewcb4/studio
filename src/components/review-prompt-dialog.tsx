'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, ExternalLink } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.frepo.twa&hl=en_US';

interface ReviewPromptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRateNow: () => void;
    onMaybeLater: () => void;
    onDontAskAgain: () => void;
}

export function ReviewPromptDialog({
    open,
    onOpenChange,
    onRateNow,
    onMaybeLater,
    onDontAskAgain,
}: ReviewPromptDialogProps) {
    const handleRateNow = () => {
        window.open(PLAY_STORE_URL, '_blank');
        onRateNow();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm">
                <DialogHeader className="text-center">
                    <div className="flex justify-center mb-2">
                        <div className="p-3 bg-yellow-500/20 rounded-full">
                            <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                        </div>
                    </div>
                    <DialogTitle className="text-xl">Enjoying fRepo?</DialogTitle>
                    <DialogDescription className="text-center pt-2">
                        Your feedback helps others discover us! A quick review on the Play Store would mean a lot.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <Button onClick={handleRateNow} className="w-full">
                        <Star className="h-4 w-4 mr-2" />
                        Rate Now
                        <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
                    </Button>
                    <Button variant="outline" onClick={onMaybeLater} className="w-full">
                        Maybe Later
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={onDontAskAgain}
                        className="w-full text-muted-foreground text-sm"
                    >
                        Don&apos;t Ask Again
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
