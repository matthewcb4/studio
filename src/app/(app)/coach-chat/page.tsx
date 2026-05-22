'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, where, deleteDoc } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { Bot, Send, Sparkles, MessageSquare, Loader2, Dumbbell, Calendar, Target, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { askCoach } from '@/ai/flows/coach-chat-flow';
import type { WorkoutLog, UserProfile, UserProgramEnrollment } from '@/lib/types';
import { getProgramById } from '@/lib/program-data';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SUGGESTIONS = [
  "How can I improve my Bench Press PR?",
  "What back exercises target my lats?",
  "Should I swap exercises if my shoulders hurt?",
  "Give me a dynamic warm-up cue."
];

function formatMessageText(text: string) {
  return text.split('\n').map((line, idx) => {
    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    let cleanLine = line;
    if (isBullet) {
      cleanLine = line.trim().substring(2);
    }
    
    // Parse bold **text**
    const parts = [];
    let currentText = cleanLine;
    const regex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = regex.exec(currentText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(currentText.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-bold text-amber-500">{match[1]}</strong>);
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < currentText.length) {
      parts.push(currentText.substring(lastIndex));
    }

    if (isBullet) {
      return (
        <li key={idx} className="ml-5 list-disc pl-1 my-1.5 text-sm leading-relaxed text-foreground/90">
          {parts.length > 0 ? parts : cleanLine}
        </li>
      );
    }

    return (
      <p key={idx} className="text-sm leading-relaxed min-h-[1rem] my-1.5 text-foreground/90">
        {parts.length > 0 ? parts : cleanLine}
      </p>
    );
  });
}

export default function CoachChatPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [inputText, setInputText] = useState('');
  const [isCoachTyping, setIsCoachTyping] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 1. Fetch user profile
  const userProfileRef = useMemoFirebase(() =>
    user ? doc(firestore, `users/${user.uid}/profile/main`) : null
    , [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // 2. Fetch active program enrollment
  const activeEnrollmentRef = useMemoFirebase(() => {
    if (!user || !userProfile?.activeProgramId) return null;
    return doc(firestore, `users/${user.uid}/programEnrollments/${userProfile.activeProgramId}`);
  }, [firestore, user, userProfile?.activeProgramId]);
  const { data: activeEnrollment } = useDoc<UserProgramEnrollment>(activeEnrollmentRef);

  const activeProgram = useMemo(() => {
    if (!activeEnrollment) return null;
    const program = getProgramById(activeEnrollment.programId);
    if (!program) return null;
    return { program };
  }, [activeEnrollment]);

  // 3. Fetch workout logs for the last 7 days
  const recentLogsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    return query(
      collection(firestore, `users/${user.uid}/workoutLogs`),
      where("date", ">=", sevenDaysAgo),
      orderBy("date", "desc")
    );
  }, [firestore, user]);
  const { data: recentLogs } = useCollection<WorkoutLog>(recentLogsQuery);

  // 4. Fetch persistent coach chat messages ordered by date asc
  const messagesQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, `users/${user.uid}/coachChatMessages`), orderBy("createdAt", "asc")) : null
    , [firestore, user]);
  const { data: persistentMessages, isLoading: isLoadingMessages } = useCollection<any>(messagesQuery);

  // Compile context summaries
  const fitnessGoals = useMemo(() => {
    if (!userProfile) return [];
    return [userProfile.strengthGoal, userProfile.muscleGoal, userProfile.fatLossGoal].filter(Boolean) as string[];
  }, [userProfile]);

  const recentWorkoutsSummary = useMemo(() => {
    if (!recentLogs || recentLogs.length === 0) return "No workouts logged in the last 7 days.";
    return recentLogs.map(log => 
      `- ${log.workoutName} on ${format(new Date(log.date), 'MMM d')} (Volume: ${log.volume || 0} lbs)`
    ).join('\n');
  }, [recentLogs]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [persistentMessages, isCoachTyping]);

  const handleInputFocus = () => {
    // Wait for mobile virtual keyboard animation to complete (usually 150-300ms)
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      scrollToBottom();
    }, 150);
  };

  const handleClearHistory = async () => {
    if (!user || !persistentMessages || persistentMessages.length === 0) return;
    setIsClearing(true);
    try {
      const deletePromises = persistentMessages.map(async (msg: any) => {
        const msgRef = doc(firestore, `users/${user.uid}/coachChatMessages`, msg.id);
        await deleteDoc(msgRef);
      });
      await Promise.all(deletePromises);
      toast({
        title: "Chat history cleared",
        description: "Your conversation with the coach has been reset.",
      });
    } catch (error) {
      console.error("Error clearing chat history: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear chat history. Please try again.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!user || !textToSend.trim() || isCoachTyping) return;
    
    setInputText('');
    setIsCoachTyping(true);

    try {
      const messagesCollection = collection(firestore, `users/${user.uid}/coachChatMessages`);
      
      // Save User Message to Firestore
      await addDocumentNonBlocking(messagesCollection, {
        role: 'user',
        text: textToSend,
        createdAt: new Date().toISOString()
      });

      // Prepare history array for flow
      const chatHistory = (persistentMessages || []).map(m => ({
        role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        text: m.text
      }));

      // Call Genkit flow server action
      const reply = await askCoach({
        history: chatHistory,
        latestMessage: textToSend,
        fitnessGoals,
        activeProgramName: activeProgram?.program?.name,
        recentWorkoutsSummary
      });

      // Save Coach Message to Firestore
      await addDocumentNonBlocking(messagesCollection, {
        role: 'model',
        text: reply,
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("Coach Chat Error: ", error);
      // Fallback message inside Firestore
      const messagesCollection = collection(firestore, `users/${user.uid}/coachChatMessages`);
      await addDocumentNonBlocking(messagesCollection, {
        role: 'model',
        text: "I apologize, but I ran into a connection issue while coaching. Let's try again! Keep your focus and stay hydrated.",
        createdAt: new Date().toISOString()
      });
    } finally {
      setIsCoachTyping(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)] md:h-[calc(100vh-8rem)]">
      {/* Header Panel */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-card/45 border border-border/40 backdrop-blur-md shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center border border-amber-500/30">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-1.5">
              <span>fRepo Coach</span>
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            </h1>
            <p className="text-xs text-muted-foreground">Your Elite Strength & Fitness Advisor</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Desktop Context badges */}
          <div className="hidden sm:flex items-center gap-3">
            {activeProgram?.program?.name && (
              <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
                <Dumbbell className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium truncate max-w-[120px]">{activeProgram.program.name}</span>
              </div>
            )}
            {fitnessGoals.length > 0 && (
              <div className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <Target className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">{fitnessGoals[0]}</span>
              </div>
            )}
          </div>

          {/* Clear Chat Action */}
          {persistentMessages && persistentMessages.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
                  title="Clear chat history"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background/95 border-border/60 backdrop-blur-md rounded-2xl max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-lg font-bold flex items-center gap-2 text-destructive">
                    <Trash2 className="w-5 h-5" />
                    Clear Chat History?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground text-sm pt-2">
                    Are you sure you want to clear your entire conversation with **fRepo Coach**?
                    This will permanently delete all messages from this window. You cannot undo this.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="rounded-xl border-border/60 hover:bg-muted/80">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearHistory}
                    disabled={isClearing}
                    className="rounded-xl bg-destructive hover:bg-destructive/90 text-white font-medium"
                  >
                    {isClearing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Clearing...
                      </>
                    ) : (
                      "Clear Chat"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Chat History Viewport */}
      <div className="flex-1 min-h-0 bg-card/30 rounded-2xl border border-border/40 backdrop-blur-md shadow-inner flex flex-col p-4">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isLoadingMessages ? (
            <div className="flex h-full items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading chat history...</p>
            </div>
          ) : !persistentMessages || persistentMessages.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-md">
                <MessageSquare className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Welcome to fRepo Coaching</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  I'm your persistent AI training coach. Ask me questions about splits, optimal cues, nutrition, progressive overload, or swapping exercises based on your performance.
                </p>
              </div>
              <div className="w-full flex flex-col gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left pl-1">Suggested Topics</p>
                {SUGGESTIONS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => handleSendMessage(topic)}
                    className="flex items-center justify-between text-left p-3 text-sm bg-background/50 hover:bg-background/90 border border-border/60 rounded-xl hover:border-amber-500/30 transition-all text-foreground font-medium group"
                  >
                    <span>{topic}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2.5 max-w-2xl text-xs text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Coaching Mode Active</p>
                  <p className="text-muted-foreground mt-0.5">
                    I analyze your goals {activeProgram && `, active program (${activeProgram.program.name})`} and recent logs (last 7 days) to deliver highly personalized training strategies.
                  </p>
                </div>
              </div>

              {persistentMessages.map((msg: any) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                        isUser 
                          ? 'bg-primary/20 border border-primary/20 text-primary' 
                          : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                      }`}>
                        {isUser ? 'U' : <Bot className="w-4 h-4" />}
                      </div>

                      {/* Bubble */}
                      <div className={`p-3.5 rounded-2xl shadow-sm ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-muted/70 text-foreground border border-border/40 rounded-tl-none'
                      }`}>
                        {isUser ? (
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        ) : (
                          <div className="space-y-0.5">
                            {formatMessageText(msg.text)}
                          </div>
                        )}
                        <span className={`block text-[10px] mt-1.5 ${isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground text-left'}`}>
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isCoachTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 bg-muted/70 text-foreground border border-border/40 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick suggestions above input if we already have messages */}
        {persistentMessages && persistentMessages.length > 0 && !isCoachTyping && (
          <div className="flex items-center gap-2 overflow-x-auto py-2 shrink-0 border-t border-border/20 mt-2 scrollbar-none">
            {SUGGESTIONS.slice(0, 3).map((topic) => (
              <button
                key={topic}
                onClick={() => handleSendMessage(topic)}
                className="text-xs bg-background/50 hover:bg-background/95 border border-border/60 hover:border-amber-500/30 px-3 py-1.5 rounded-full shrink-0 font-medium transition-all text-muted-foreground hover:text-foreground"
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Input Panel */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex items-center gap-2 pt-3 shrink-0"
        >
          <Input
            ref={inputRef}
            onFocus={handleInputFocus}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isCoachTyping ? "Coach is thinking..." : "Message your coach..."}
            disabled={isCoachTyping}
            className="flex-1 bg-background/50 border-border/60 hover:border-border transition-colors text-sm rounded-xl py-5"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputText.trim() || isCoachTyping}
            className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 shadow-md transition-all shrink-0 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
