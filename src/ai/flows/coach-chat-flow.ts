'use server';
/**
 * @fileoverview An AI agent that chats with the user as an elite fitness coach.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const CoachChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
  senderName: z.string().optional()
});

const CoachChatInputSchema = z.object({
  history: z.array(CoachChatMessageSchema),
  latestMessage: z.string(),
  fitnessGoals: z.array(z.string()).optional(),
  activeProgramName: z.string().optional(),
  recentWorkoutsSummary: z.string().optional()
});

const prompt = ai.definePrompt({
  name: 'coachChatPrompt',
  input: { schema: CoachChatInputSchema },
  prompt: `You are an elite fitness coach AI named 'fRepo Coach'. You have a highly supportive, knowledgeable, and elite trainer personality. Your tone is motivational, professional, and empathetic. You write concisely, focusing on actionable advice, specific cues, and clear formatting.

  You are chatting with a user who uses your gym app daily. Use their goals and program context (if provided) to tailor your advice.

  **User's Fitness Goals:**
  {{#if fitnessGoals.length}}
    {{#each fitnessGoals}}
    - {{{this}}}
    {{/each}}
  {{else}}
    - General fitness, strength, and health
  {{/if}}

  {{#if activeProgramName}}
  **🎯 Active Program:** {{{activeProgramName}}}
  {{/if}}

  {{#if recentWorkoutsSummary}}
  **🏋️ Recent Workouts Context:**
  {{{recentWorkoutsSummary}}}
  {{/if}}

  Here is the conversation history so far:
  {{#each history}}
  - **{{{senderName}}}**: {{{text}}}
  {{/each}}

  Now, answer the user's latest message. Give highly helpful and coaching-oriented guidance. Do not use generic placeholders. Answer as 'fRepo Coach'.
  **User**: {{{latestMessage}}}

  **Coach**:`,
});

const coachChatFlow = ai.defineFlow(
  {
    name: 'coachChatFlow',
    inputSchema: CoachChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const enrichedHistory = input.history.map(m => ({
      ...m,
      senderName: m.role === 'user' ? 'User' : 'Coach'
    }));
    const response = await prompt({
      ...input,
      history: enrichedHistory
    });
    if (!response.text) {
      const reason = response.candidates?.[0]?.finishReason || 'unknown';
      throw new Error(`AI Coach failed to generate a response (finish reason: ${reason}).`);
    }
    return response.text;
  }
);

export async function askCoach(input: z.infer<typeof CoachChatInputSchema>): Promise<{
  success: boolean;
  reply?: string;
  error?: string;
}> {
  try {
    const reply = await coachChatFlow(input);
    return { success: true, reply };
  } catch (err: any) {
    console.error("askCoach Server Action error:", err);
    return {
      success: false,
      error: err.message || err.toString()
    };
  }
}
