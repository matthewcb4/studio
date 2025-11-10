
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
import Image from 'next/image';
import { doc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';


export function MuscleHeatmap() {
    const { user } = useUser();
    const firestore = useFirestore();
    const bodyOutlineImage = PlaceHolderImages.find((img) => img.id === "body-outline");

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Body Outline</CardTitle>
                <CardDescription>Your selected body type.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                 {bodyOutlineImage && (
                    <Image
                        src={bodyOutlineImage.imageUrl}
                        alt={bodyOutlineImage.description}
                        width={300}
                        height={400}
                        data-ai-hint={bodyOutlineImage.imageHint}
                        className="object-contain h-[350px] w-auto"
                    />
                 )}
            </CardContent>
        </Card>
    );
}
