
'use client';

import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import Link from 'next/link';
import { doc } from 'firebase/firestore';

// SVG data for the male body outline
const maleBodySvg = `<svg width="300" height="400" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
<path fill="hsl(var(--foreground))" d="M150 20 C160 20 170 30 170 40 C170 55 160 70 150 70 C140 70 130 55 130 40 C130 30 140 20 150 20 Z M180 75 L195 140 C205 160 210 180 205 200 C200 220 185 240 170 250 L160 290 L160 380 L140 380 L140 290 L130 250 C115 240 100 220 95 200 C90 180 95 160 105 140 L120 75 Z M185 100 L205 110 L210 130 L200 125 L185 115 Z M115 100 L95 110 L90 130 L100 125 L115 115 Z"/>
</svg>`;

// Base64 encode the SVG string
const encodedSvg = btoa(maleBodySvg);
const svgDataUri = `data:image/svg+xml;base64,${encodedSvg}`;

export function MuscleHeatmap() {
    const { user } = useUser();
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => 
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);
    
    if (isLoadingProfile) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Body Outline</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <div className="text-sm text-muted-foreground">Loading...</div>
                </CardContent>
            </Card>
        )
    }

    if (!userProfile?.biologicalSex) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Body Outline</CardTitle>
                    <CardDescription>Select your body type in settings to see your outline.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/settings">Go to Settings</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }
    
    // For now, we only show the male body as per the request to simplify.
    // The female SVG can be added back in a similar fashion.

    return (
        <Card>
            <CardHeader>
                <CardTitle>Body Outline</CardTitle>
                <CardDescription>Your selected body type.</CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    style={{
                        backgroundImage: `url("${svgDataUri}")`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        width: '100%',
                        height: '350px',
                    }}
                 />
            </CardContent>
        </Card>
    );
}
