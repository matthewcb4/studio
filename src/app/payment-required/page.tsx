"use client";

import { Button } from "@/components/ui/button";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { Loader2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PaymentRequiredPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handlePay = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    email: user.email,
                    returnUrl: window.location.origin + '/dashboard',
                }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL');
            }
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to start payment.",
            });
            setIsLoading(false);
        }
    };

    if (isUserLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-primary/10 p-4">
                        <Lock className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold">Payment Required</h1>
                <p className="text-muted-foreground">
                    Your account has been created, but this feature is reserved for Premium members.
                </p>
                <div className="rounded-lg border bg-card p-6 shadow-sm">
                    <div className="text-2xl font-bold">$0.99</div>
                    <div className="text-sm text-muted-foreground">One-time payment for lifetime access</div>
                </div>

                <div className="space-y-2">
                    <Button onClick={handlePay} className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Complete Payment
                    </Button>
                    <Button variant="ghost" onClick={handleLogout} className="w-full">
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
