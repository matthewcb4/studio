
'use client';

import { useState } from 'react';
import { useDoc, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MaleBody } from './male-body';
import { FemaleBody } from './female-body';
import { Button } from './ui/button';
import Link from 'next/link';
import { doc } from 'firebase/firestore';

export function MuscleHeatmap() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [timeRange, setTimeRange] = useState('7');

    const userProfileRef = useMemoFirebase(() => 
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
    const { data: userProfile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    if (isLoadingProfile) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Muscle Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">Loading...</div>
                </CardContent>
            </Card>
        )
    }

    if (!userProfile?.biologicalSex) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Muscle Heatmap</CardTitle>
                    <CardDescription>Select your body type in settings to see your activity heatmap.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button asChild>
                        <Link href="/settings">Go to Settings</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const BodyComponent = userProfile.biologicalSex === 'Male' ? MaleBody : FemaleBody;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Muscle Heatmap</CardTitle>
                <CardDescription>Your workout activity focus.</CardDescription>
            </CardHeader>
            <CardContent>
                <BodyComponent />
            </CardContent>
            <CardFooter>
                 <Select onValueChange={setTimeRange} defaultValue={timeRange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                        <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                </Select>
            </CardFooter>
        </Card>
    );
}
