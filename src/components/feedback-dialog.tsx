'use client';

import { useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, MessageSquare, Lightbulb } from 'lucide-react';
import type { Feedback } from '@/lib/types';

interface FeedbackDialogProps {
    type: 'suggestion' | 'feedback';
    category: 'program' | 'general' | 'feature';
    trigger: React.ReactNode;
    title?: string;
    description?: string;
    placeholder?: string;
}

export function FeedbackDialog({
    type,
    category,
    trigger,
    title,
    description,
    placeholder,
}: FeedbackDialogProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Default texts based on type
    const defaultTitle = type === 'suggestion' ? 'Suggest a Program' : 'Send Feedback';
    const defaultDescription = type === 'suggestion'
        ? 'What kind of workout program would you like to see?'
        : 'Let us know how we can improve your experience.';
    const defaultPlaceholder = type === 'suggestion'
        ? 'Describe your ideal program (e.g., "8-week powerlifting program for intermediate lifters")'
        : 'Share your thoughts, ideas, or report any issues...';

    const handleSubmit = async () => {
        if (!user || !message.trim()) return;

        setIsSubmitting(true);
        try {
            const feedbackData: Omit<Feedback, 'id'> = {
                userId: user.uid,
                userEmail: user.email || undefined,
                displayName: user.displayName || undefined,
                type: type === 'suggestion' ? 'suggestion' : 'feedback',
                category,
                message: message.trim(),
                createdAt: new Date().toISOString(),
                status: 'new',
            };

            const feedbackCollection = collection(firestore, 'feedback');
            await addDoc(feedbackCollection, feedbackData);

            toast({
                title: type === 'suggestion' ? 'Suggestion Submitted! 💡' : 'Feedback Sent! 📬',
                description: 'Thank you for helping us improve fRepo!',
            });

            setMessage('');
            setOpen(false);
        } catch (error) {
            console.error('Error submitting feedback:', error);
            toast({
                title: 'Error',
                description: 'Failed to submit. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {type === 'suggestion' ? (
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                        ) : (
                            <MessageSquare className="h-5 w-5 text-primary" />
                        )}
                        {title || defaultTitle}
                    </DialogTitle>
                    <DialogDescription>
                        {description || defaultDescription}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="message">Your Message</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={placeholder || defaultPlaceholder}
                            rows={5}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!message.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Submit
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
