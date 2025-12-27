'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    useUser,
    useFirestore,
    useMemoFirebase,
    useDoc,
    setDocumentNonBlocking,
} from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LeaderboardMetric, LeaderboardEntry, LeaderboardSettings, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Medal, Award, Users, Calendar, CalendarDays, Crown, Settings2, UserPlus, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';

// Metric labels for the dropdown
const METRIC_OPTIONS: { value: LeaderboardMetric; label: string; icon: string }[] = [
    { value: 'totalVolume', label: 'Total Volume (lbs)', icon: '🏋️' },
    { value: 'workoutCount', label: 'Workouts Completed', icon: '💪' },
    { value: 'activeDays', label: 'Active Days', icon: '📅' },
    { value: 'xpEarned', label: 'XP Earned', icon: '⭐' },
    { value: 'cardioMinutes', label: 'Cardio Minutes', icon: '🏃' },
    { value: 'personalRecords', label: 'Personal Records', icon: '🏆' },
];

// Random animal names for generated display names
const ANIMAL_NAMES = [
    'Wolf', 'Eagle', 'Tiger', 'Bear', 'Hawk', 'Lion', 'Falcon', 'Panther',
    'Phoenix', 'Dragon', 'Shark', 'Viper', 'Cobra', 'Rhino', 'Bison', 'Ox',
];
const ADJECTIVES = [
    'Iron', 'Steel', 'Swift', 'Mighty', 'Fierce', 'Bold', 'Savage', 'Elite',
    'Alpha', 'Prime', 'Apex', 'Supreme', 'Ultra', 'Power', 'Strong', 'Fast',
];

function generateRandomName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `${adj}${animal}#${num}`;
}

// Random avatar emojis
const AVATAR_EMOJIS = ['🦁', '🐺', '🦅', '🐯', '🦈', '🐻', '🦊', '🐲', '🦍', '🦬', '🦏', '🐘'];

function getRandomEmoji(): string {
    return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
}

// Medal icons for top 3
function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm text-muted-foreground">{rank}</span>;
}

// Leaderboard entry row component
function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser?: boolean }) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isCurrentUser
                ? 'bg-primary/10 border border-primary/30'
                : 'hover:bg-muted/50'
                }`}
        >
            <div className="flex items-center justify-center w-8">
                <RankBadge rank={entry.rank} />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xl">{entry.avatarEmoji || '🏋️'}</span>
                <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                        {entry.customName || entry.displayName}
                        {isCurrentUser && (
                            <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                        )}
                    </span>
                </div>
            </div>
            <div className="text-right">
                <span className="font-bold text-lg">{entry.value.toLocaleString()}</span>
            </div>
        </div>
    );
}

// Empty state component
function EmptyLeaderboard({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
}

export default function LeaderboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // Use useDoc for profile (same pattern as Settings page)
    const userProfileRef = useMemoFirebase(() =>
        user ? doc(firestore, `users/${user.uid}/profile/main`) : null
        , [firestore, user]);
    const { data: profile, isLoading: isLoadingProfile } = useDoc<UserProfile>(userProfileRef);

    const [selectedMetric, setSelectedMetric] = useState<LeaderboardMetric>('totalVolume');
    const [activeTab, setActiveTab] = useState('weekly');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Local state for settings form
    const [optedIn, setOptedIn] = useState(false);
    const [displayNameType, setDisplayNameType] = useState<'generated' | 'custom'>('generated');
    const [customName, setCustomName] = useState('');
    const [generatedName, setGeneratedName] = useState('');

    // Sync local state with profile when it loads
    useEffect(() => {
        if (profile?.leaderboardSettings) {
            setOptedIn(profile.leaderboardSettings.optedIn ?? false);
            setDisplayNameType(profile.leaderboardSettings.displayNameType ?? 'generated');
            setCustomName(profile.leaderboardSettings.customDisplayName ?? '');
            setGeneratedName(profile.leaderboardSettings.generatedName || generateRandomName());
        } else if (profile && !profile.leaderboardSettings) {
            // Profile exists but no leaderboard settings yet - generate a name
            setGeneratedName(prev => prev || generateRandomName());
        }
    }, [profile]);

    // For now, we'll use placeholder data since the Cloud Function isn't set up yet
    const placeholderEntries: LeaderboardEntry[] = useMemo(() => {
        if (!user || !profile?.leaderboardSettings?.optedIn) return [];

        // Get value based on selected metric
        const getMetricValue = (): number => {
            switch (selectedMetric) {
                case 'totalVolume':
                    return profile?.lifetimeVolume || 0;
                case 'workoutCount':
                    return 0; // Would come from workout logs count
                case 'activeDays':
                    return profile?.currentStreak || 0;
                case 'xpEarned':
                    return profile?.xp || 0;
                case 'cardioMinutes':
                    return 0; // Would come from cardio workout logs
                case 'personalRecords':
                    return 0; // Would come from PR count
                default:
                    return 0;
            }
        };

        // Show the current user only if they're opted in
        return [
            {
                rank: 1,
                displayName: profile?.leaderboardSettings?.generatedName || generatedName,
                customName: profile?.leaderboardSettings?.displayNameType === 'custom'
                    ? profile?.leaderboardSettings?.customDisplayName
                    : undefined,
                avatarEmoji: '🦁',
                value: getMetricValue(),
                userId: user.uid,
                isCurrentUser: true,
            },
        ];
    }, [user, profile, generatedName, selectedMetric]);

    const handleSaveSettings = async () => {
        if (!user || !userProfileRef) return;
        setIsSaving(true);

        try {
            const settings: LeaderboardSettings = {
                optedIn,
                displayNameType,
                generatedName: generatedName,
                customDisplayName: displayNameType === 'custom' ? customName : undefined,
            };

            await setDocumentNonBlocking(userProfileRef, { leaderboardSettings: settings }, { merge: true });

            toast({
                title: 'Settings saved',
                description: optedIn
                    ? 'You are now visible on the leaderboards!'
                    : 'You have been removed from leaderboards.',
            });
            setSettingsOpen(false);
        } catch (error) {
            console.error('Error saving leaderboard settings:', error);
            toast({
                title: 'Error',
                description: 'Failed to save settings.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isOptedIn = profile?.leaderboardSettings?.optedIn ?? false;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Crown className="h-8 w-8 text-yellow-500" />
                        Leaderboard
                    </h1>
                    <p className="text-muted-foreground">
                        Compete with friends and the community
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Leaderboard Settings</DialogTitle>
                                <DialogDescription>
                                    Control your visibility and display name on leaderboards.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                                {/* Opt-in toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="opted-in">Join Leaderboards</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow your stats to appear on public leaderboards
                                        </p>
                                    </div>
                                    <Switch
                                        id="opted-in"
                                        checked={optedIn}
                                        onCheckedChange={setOptedIn}
                                    />
                                </div>

                                {optedIn && (
                                    <>
                                        {/* Display name type */}
                                        <div className="space-y-2">
                                            <Label>Display Name</Label>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant={displayNameType === 'generated' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setDisplayNameType('generated')}
                                                >
                                                    Auto-Generated
                                                </Button>
                                                <Button
                                                    variant={displayNameType === 'custom' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setDisplayNameType('custom')}
                                                >
                                                    Custom
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Show generated or custom name input */}
                                        {displayNameType === 'generated' ? (
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="text-sm text-muted-foreground mb-1">Your display name:</p>
                                                <p className="font-medium">{generatedName}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label htmlFor="custom-name">Custom Name</Label>
                                                <Input
                                                    id="custom-name"
                                                    placeholder="Enter your display name"
                                                    value={customName}
                                                    onChange={(e) => setCustomName(e.target.value)}
                                                    maxLength={20}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Max 20 characters. Inappropriate names may be reset.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveSettings} disabled={isSaving}>
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Opt-in prompt if not opted in */}
            {!isOptedIn && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                        <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Join the Competition!</h3>
                        <p className="text-muted-foreground mb-4 max-w-md">
                            Opt in to see how you stack up against other athletes. Your display name will be auto-generated to protect your privacy.
                        </p>
                        <Button onClick={() => setSettingsOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Get Started
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Metric selector */}
            <div className="flex gap-4 items-center">
                <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as LeaderboardMetric)}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                        {METRIC_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                <span className="flex items-center gap-2">
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Leaderboard tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="friends" className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Friends</span>
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">Weekly</span>
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        <span className="hidden sm:inline">Monthly</span>
                    </TabsTrigger>
                    <TabsTrigger value="alltime" className="flex items-center gap-1">
                        <Crown className="h-4 w-4" />
                        <span className="hidden sm:inline">All-Time</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="friends" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Friends Leaderboard
                            </CardTitle>
                            <CardDescription>
                                Compare your stats with friends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmptyLeaderboard message="Add friends to compare your progress! Friend system coming soon." />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="weekly" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Weekly Leaderboard
                            </CardTitle>
                            <CardDescription>
                                This week&apos;s top performers • Resets every Monday at midnight UTC
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isOptedIn ? (
                                <EmptyLeaderboard message="Opt in to see the leaderboard" />
                            ) : placeholderEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {placeholderEntries.map((entry) => (
                                        <LeaderboardRow
                                            key={entry.userId}
                                            entry={entry}
                                            isCurrentUser={entry.userId === user?.uid}
                                        />
                                    ))}
                                    <p className="text-sm text-muted-foreground text-center pt-4">
                                        Leaderboard will populate as more users opt in
                                    </p>
                                </div>
                            ) : (
                                <EmptyLeaderboard message="No data available yet" />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="monthly" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                Monthly Leaderboard
                            </CardTitle>
                            <CardDescription>
                                This month&apos;s champions • Resets on the 1st at midnight UTC
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isOptedIn ? (
                                <EmptyLeaderboard message="Opt in to see the leaderboard" />
                            ) : placeholderEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {placeholderEntries.map((entry) => (
                                        <LeaderboardRow
                                            key={entry.userId}
                                            entry={entry}
                                            isCurrentUser={entry.userId === user?.uid}
                                        />
                                    ))}
                                    <p className="text-sm text-muted-foreground text-center pt-4">
                                        Leaderboard will populate as more users opt in
                                    </p>
                                </div>
                            ) : (
                                <EmptyLeaderboard message="No data available yet" />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="alltime" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-yellow-500" />
                                All-Time Legends
                            </CardTitle>
                            <CardDescription>
                                The greatest of all time
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isOptedIn ? (
                                <EmptyLeaderboard message="Opt in to see the leaderboard" />
                            ) : placeholderEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {placeholderEntries.map((entry) => (
                                        <LeaderboardRow
                                            key={entry.userId}
                                            entry={entry}
                                            isCurrentUser={entry.userId === user?.uid}
                                        />
                                    ))}
                                    <p className="text-sm text-muted-foreground text-center pt-4">
                                        Leaderboard will populate as more users opt in
                                    </p>
                                </div>
                            ) : (
                                <EmptyLeaderboard message="No data available yet" />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
