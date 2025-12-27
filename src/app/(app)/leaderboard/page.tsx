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
    useCollection,
    setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection, query, where, getDocs, getDoc, addDoc, updateDoc, deleteDoc, Timestamp, collectionGroup, limit } from 'firebase/firestore';
import type { LeaderboardMetric, LeaderboardEntry, LeaderboardSettings, UserProfile, WorkoutLog, FriendConnection, Friend } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Medal, Award, Users, Calendar, CalendarDays, Crown, Settings2, UserPlus, Loader2, Copy, Check, X, UserMinus } from 'lucide-react';
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

// Generate unique 8-character friend code
function generateFriendCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
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

    // Fetch workout logs for calculating metrics
    const workoutLogsCollection = useMemoFirebase(() =>
        user ? collection(firestore, `users/${user.uid}/workoutLogs`) : null
        , [firestore, user]);
    const { data: workoutLogs } = useCollection<WorkoutLog>(workoutLogsCollection);

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

    // Friend management state
    const [addFriendOpen, setAddFriendOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<(UserProfile & { id: string })[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAddingFriend, setIsAddingFriend] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<(FriendConnection & { id: string })[]>([]);
    const [friends, setFriends] = useState<(Friend & { id: string; profile?: UserProfile })[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    // Fetch pending friend requests and friends list
    useEffect(() => {
        if (!user || !firestore) return;

        const fetchFriendData = async () => {
            setFriendsLoading(true);
            try {
                // Fetch pending requests where current user is receiver
                const requestsQuery = query(
                    collection(firestore, 'friendRequests'),
                    where('receiverId', '==', user.uid),
                    where('status', '==', 'pending')
                );
                const requestsSnapshot = await getDocs(requestsQuery);
                const requests = requestsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as (FriendConnection & { id: string })[];
                setPendingRequests(requests);

                // Fetch friends list
                const friendsSnapshot = await getDocs(collection(firestore, `users/${user.uid}/friends`));
                const friendsList = friendsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as (Friend & { id: string; profile?: UserProfile })[];

                // Fetch profiles for all friends to get leaderboard stats
                // We limit friends to 20, so doing parallel reads is acceptable
                if (friendsList.length > 0) {
                    await Promise.all(friendsList.map(async (friend) => {
                        try {
                            const profileDoc = await getDoc(doc(firestore, `users/${friend.friendUserId}/profile/main`));
                            if (profileDoc.exists()) {
                                friend.profile = profileDoc.data() as UserProfile;
                            }
                        } catch (e) {
                            console.error(`Error fetching profile for friend ${friend.friendUserId}`, e);
                        }
                    }));
                }

                setFriends(friendsList);
            } catch (error) {
                console.error('Error fetching friend data:', error);
            } finally {
                setFriendsLoading(false);
            }
        };

        fetchFriendData();
    }, [user, firestore]);

    // Search users by display name
    const handleSearch = async () => {
        if (!searchQuery.trim() || !user) return;
        setIsSearching(true);
        try {
            // Search users by generatedName or customDisplayName
            // Note: In a real app we'd use Algolia or Typesense for full-text search
            // Here we'll rely on an exact match or prefix match if index exists
            // We are querying the 'profile' collection group which contains 'main' docs

            // Try exact match on custom name first
            const customNameQuery = query(
                collectionGroup(firestore, 'profile'),
                where('leaderboardSettings.customDisplayName', '==', searchQuery.trim()),
                limit(5)
            );

            // Try match on generated name
            const generatedNameQuery = query(
                collectionGroup(firestore, 'profile'),
                where('leaderboardSettings.generatedName', '==', searchQuery.trim()),
                limit(5)
            );

            const [customSnap, generatedSnap] = await Promise.all([
                getDocs(customNameQuery),
                getDocs(generatedNameQuery)
            ]);

            const results = new Map<string, UserProfile & { id: string }>();

            const processSnap = (snap: any) => {
                snap.docs.forEach((doc: any) => {
                    // The doc ID is 'main', but the parent's parent is the user doc
                    // doc.ref.parent.parent.id should be the userId
                    const userId = doc.ref.parent.parent?.id;
                    if (userId && userId !== user.uid) { // Don't show self
                        results.set(userId, { id: userId, ...doc.data() });
                    }
                });
            };

            processSnap(customSnap);
            processSnap(generatedSnap);

            setSearchResults(Array.from(results.values()));
        } catch (error) {
            console.error('Error searching users:', error);
            toast({
                title: 'Error',
                description: 'Failed to search users. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async (targetUserId: string, targetDisplayName: string) => {
        if (!user || !profile || !profile.leaderboardSettings?.optedIn) {
            toast({
                title: 'Setup Required',
                description: 'You must opt-in to leaderboards to add friends.',
            });
            return;
        }

        setIsAddingFriend(true);
        try {
            // Check friend limit (Max 20)
            if (friends.length >= 20) {
                toast({
                    title: 'Friend limit reached',
                    description: 'You can only have up to 20 friends. Remove a friend to add a new one.',
                    variant: 'destructive',
                });
                return;
            }

            // Check if already friends
            const existingFriend = friends.find(f => f.friendUserId === targetUserId);
            if (existingFriend) {
                toast({
                    title: 'Already friends',
                    description: 'You are already friends with this user.',
                });
                return;
            }

            // Check if request already pending (sent by me)
            const existingRequestQuery = query(
                collection(firestore, 'friendRequests'),
                where('senderId', '==', user.uid),
                where('receiverId', '==', targetUserId),
                where('status', '==', 'pending')
            );
            const existingRequestSnap = await getDocs(existingRequestQuery);
            if (!existingRequestSnap.empty) {
                toast({
                    title: 'Request Pending',
                    description: 'You have already sent a request to this user.',
                });
                return;
            }


            // Create request
            await addDoc(collection(firestore, 'friendRequests'), {
                senderId: user.uid,
                receiverId: targetUserId,
                senderDisplayName: profile.leaderboardSettings?.generatedName || 'User',
                status: 'pending',
                createdAt: new Date().toISOString()
            } as FriendConnection);

            toast({
                title: 'Request Sent!',
                description: `Friend request sent to ${targetDisplayName}`,
            });
            setAddFriendOpen(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Error adding friend:', error);
            toast({
                title: 'Error',
                description: 'Failed to send friend request.',
                variant: 'destructive',
            });
        } finally {
            setIsAddingFriend(false);
        }
    };

    // Accept friend request
    const handleAcceptRequest = async (request: FriendConnection & { id: string }) => {
        if (!user || !firestore) return;

        try {
            // Update request status
            await updateDoc(doc(firestore, 'friendRequests', request.id), {
                status: 'accepted',
                acceptedAt: new Date().toISOString(),
            });

            // Add to both users' friends collections
            const newFriend: Friend = {
                friendUserId: request.senderId,
                displayName: request.senderDisplayName || 'User',
                addedAt: new Date().toISOString(),
            };
            await setDocumentNonBlocking(
                doc(firestore, `users/${user.uid}/friends/${request.senderId}`),
                newFriend,
                { merge: true }
            );
            await setDocumentNonBlocking(
                doc(firestore, `users/${request.senderId}/friends/${user.uid}`),
                {
                    friendUserId: user.uid,
                    displayName: profile?.leaderboardSettings?.generatedName || 'User',
                    addedAt: new Date().toISOString(),
                } as Friend,
                { merge: true }
            );

            // Update local state
            setPendingRequests(prev => prev.filter(r => r.id !== request.id));
            setFriends(prev => [...prev, { ...newFriend, id: request.senderId }]);

            toast({
                title: 'Friend added!',
                description: `You are now friends with ${request.senderDisplayName}`,
            });
        } catch (error) {
            console.error('Error accepting friend request:', error);
            toast({
                title: 'Error',
                description: 'Failed to accept friend request.',
                variant: 'destructive',
            });
        }
    };

    // Decline friend request
    const handleDeclineRequest = async (request: FriendConnection & { id: string }) => {
        if (!firestore) return;

        try {
            await updateDoc(doc(firestore, 'friendRequests', request.id), {
                status: 'declined',
            });
            setPendingRequests(prev => prev.filter(r => r.id !== request.id));
            toast({
                title: 'Request declined',
            });
        } catch (error) {
            console.error('Error declining friend request:', error);
        }
    };

    // Remove friend
    const handleRemoveFriend = async (friend: Friend & { id: string }) => {
        if (!user || !firestore) return;

        try {
            await deleteDoc(doc(firestore, `users/${user.uid}/friends/${friend.id}`));
            await deleteDoc(doc(firestore, `users/${friend.friendUserId}/friends/${user.uid}`));
            setFriends(prev => prev.filter(f => f.id !== friend.id));
            toast({
                title: 'Friend removed',
            });
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    // Friends Leaderboard State
    const [friendsTimePeriod, setFriendsTimePeriod] = useState<'weekly' | 'monthly' | 'allTime'>('weekly');

    // Calculate metrics from workout logs based on time period
    const currentUserEntry: LeaderboardEntry | null = useMemo(() => {
        if (!user || !profile?.leaderboardSettings?.optedIn) return null;

        // For current user, we calculate real-time stats from logs to ensure instant feedback
        // This mirrors the logic used for the global placeholder tabs

        // Get start date based on active tab OR friends time period depending on context
        // But since we want reusable logic, let's just make a helper or duplicate for now as they are distinct contexts

        const getStartDate = (period: string): Date | null => {
            const now = new Date();
            if (period === 'weekly') {
                const dayOfWeek = now.getDay();
                const daysToMonday = (dayOfWeek + 6) % 7;
                const monday = new Date(now);
                monday.setDate(now.getDate() - daysToMonday);
                monday.setHours(0, 0, 0, 0);
                return monday;
            } else if (period === 'monthly') {
                return new Date(now.getFullYear(), now.getMonth(), 1);
            }
            return null;
        };

        const calculateStats = (period: string): number => {
            const startDate = getStartDate(period);
            const filteredLogs = workoutLogs?.filter(log => {
                if (!startDate) return true;
                const logDate = new Date(log.date);
                return logDate >= startDate;
            }) || [];

            // Reuse the switch logic
            switch (selectedMetric) {
                case 'totalVolume': return filteredLogs.reduce((sum, log) => sum + (log.volume || 0), 0);
                case 'workoutCount': return filteredLogs.length;
                case 'activeDays': return new Set(filteredLogs.map(log => log.date.split('T')[0])).size;
                case 'xpEarned': return filteredLogs.reduce((sum, log) => sum + 50 + Math.floor((log.volume || 0) / 1000) * 10, 0);
                case 'cardioMinutes':
                    let minutes = 0;
                    filteredLogs.forEach(log => {
                        if (['run', 'walk', 'cycle', 'hiit'].includes(log.activityType || '')) {
                            const m = log.duration?.match(/(\d+)/);
                            if (m) minutes += parseInt(m[1], 10);
                        }
                    });
                    return minutes;
                case 'personalRecords': return 0;
                default: return 0;
            }
        };

        return {
            rank: 1, // Placeholder
            displayName: profile?.leaderboardSettings?.generatedName || generatedName,
            customName: profile?.leaderboardSettings?.displayNameType === 'custom' ? profile?.leaderboardSettings?.customDisplayName : undefined,
            avatarEmoji: '🦁', // We need a real avatar picker/generator stored in profile eventually
            value: calculateStats(activeTab === 'friends' ? friendsTimePeriod : activeTab),
            userId: user.uid,
            isCurrentUser: true,
        };
    }, [user, profile, generatedName, selectedMetric, activeTab, workoutLogs, friendsTimePeriod]);


    const friendsLeaderboardEntries: LeaderboardEntry[] = useMemo(() => {
        if (!user || !profile?.leaderboardSettings?.optedIn) return [];

        // Map friends to entries using their cached stats
        const friendEntries: LeaderboardEntry[] = friends.map(friend => {
            const stats = friend.profile?.leaderboardStats;
            // Default to 0 if no stats
            let value = 0;

            if (stats && friendsTimePeriod in stats) {
                // We know friendsTimePeriod is not 'updatedAt' based on our state type, but we need to tell TS
                const periodStats = stats[friendsTimePeriod as keyof typeof stats] as Record<LeaderboardMetric, number> | undefined;

                // Extra check to ensure it's an object and not the updatedAt string
                if (periodStats && typeof periodStats === 'object') {
                    value = periodStats[selectedMetric] || 0;
                }
            }

            return {
                rank: 0,
                displayName: friend.displayName, // Use the name from the friend relation (snapshot) or profile? Profile is fresher.
                customName: friend.profile?.leaderboardSettings?.displayNameType === 'custom'
                    ? friend.profile?.leaderboardSettings?.customDisplayName
                    : undefined,
                avatarEmoji: friend.avatarEmoji || '🦁', // Needs to come from friend profile ideally
                value,
                userId: friend.friendUserId,
            };
        });

        // Add current user
        if (currentUserEntry) {
            friendEntries.push(currentUserEntry);
        }

        // Sort
        friendEntries.sort((a, b) => b.value - a.value);

        // Rank
        friendEntries.forEach((e, i) => e.rank = i + 1);

        return friendEntries;
    }, [friends, currentUserEntry, friendsTimePeriod, selectedMetric, user, profile]);

    // Placeholder entries for Global tabs (reusing current user entry logic for simple view)
    // In a real implementation this would fetch from 'leaderboards' collection
    const globalEntries: LeaderboardEntry[] = useMemo(() => {
        return currentUserEntry ? [currentUserEntry] : [];
    }, [currentUserEntry]);

    const handleSaveSettings = async () => {
        if (!user || !userProfileRef) return;
        setIsSaving(true);

        try {
            // Generate friend code if opting in and don't have one yet
            const existingFriendCode = profile?.leaderboardSettings?.friendCode;
            const friendCode = optedIn
                ? (existingFriendCode || generateFriendCode())
                : existingFriendCode;

            const settings: LeaderboardSettings = {
                optedIn,
                displayNameType,
                generatedName: generatedName,
                customDisplayName: displayNameType === 'custom' ? customName : undefined,
                friendCode,
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

                <TabsContent value="friends" className="mt-4 space-y-4">
                    {/* Friends Time Period Selector */}
                    {isOptedIn && (
                        <div className="flex justify-center pb-2">
                            <Tabs value={friendsTimePeriod} onValueChange={(v) => setFriendsTimePeriod(v as any)} className="w-[300px]">
                                <TabsList className="grid w-full grid-cols-3 h-8">
                                    <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
                                    <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
                                    <TabsTrigger value="allTime" className="text-xs">All Time</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    )}

                    {/* Rankings */}
                    {isOptedIn && friendsLeaderboardEntries.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {friendsLeaderboardEntries.map((entry) => (
                                    <LeaderboardRow
                                        key={entry.userId}
                                        entry={entry}
                                        isCurrentUser={entry.userId === user?.uid}
                                    />
                                ))}
                            </CardContent>
                        </Card>
                    )}



                    {/* Add Friend Section */}
                    {/* Search Friends Section */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5" />
                                Find Friends
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!isOptedIn ? (
                                <p className="text-muted-foreground text-sm">
                                    Opt in to leaderboards to add friends
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Search by display name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        />
                                        <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                                        </Button>
                                    </div>

                                    {/* Results List */}
                                    {searchResults.length > 0 && (
                                        <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto">
                                            {searchResults.map(result => (
                                                <div key={result.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {result.leaderboardSettings?.customDisplayName || result.leaderboardSettings?.generatedName || 'User'}
                                                        </span>
                                                        {result.leaderboardSettings?.generatedName && result.leaderboardSettings.displayNameType === 'custom' && (
                                                            <span className="text-xs text-muted-foreground">{result.leaderboardSettings.generatedName}</span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSendRequest(
                                                            result.id,
                                                            result.leaderboardSettings?.customDisplayName || result.leaderboardSettings?.generatedName || 'User'
                                                        )}
                                                        disabled={isAddingFriend}
                                                    >
                                                        Add
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {searchResults.length === 0 && searchQuery && !isSearching && (
                                        <p className="text-sm text-muted-foreground text-center">
                                            No users found. Try the exact display name including the #Tag.
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pending Requests */}
                    {pendingRequests.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Pending Requests
                                    <Badge variant="secondary">{pendingRequests.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {pendingRequests.map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                    >
                                        <span className="font-medium">{request.senderDisplayName || 'User'}</span>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => handleAcceptRequest(request)}
                                            >
                                                <Check className="h-4 w-4 mr-1" />
                                                Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeclineRequest(request)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Friends List */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                My Friends
                                {friends.length > 0 && (
                                    <Badge variant="secondary">{friends.length}</Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Compare your stats with friends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {friendsLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : friends.length === 0 ? (
                                <EmptyLeaderboard message="No friends yet. Share your friend code or add friends using their code!" />
                            ) : (
                                <div className="space-y-2">
                                    {friends.map((friend) => (
                                        <div
                                            key={friend.id}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{getRandomEmoji()}</span>
                                                <span className="font-medium">{friend.displayName}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleRemoveFriend(friend)}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
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
                            ) : globalEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {globalEntries.map((entry) => (
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
                            ) : globalEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {globalEntries.map((entry) => (
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
                            ) : globalEntries.length > 0 ? (
                                <div className="space-y-2">
                                    {globalEntries.map((entry) => (
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
