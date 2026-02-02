'use server';
/**
 * @fileoverview AI Blog Post Generation Flow
 *
 * This flow generates SEO-optimized fitness blog posts using AI.
 * It creates engaging content with proper structure for search engines.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateBlogPostInputSchema = z.object({
    topic: z.string().describe("The main topic or title idea for the blog post."),
    category: z.enum(['workouts', 'nutrition', 'tips', 'motivation', 'programs']).describe("The category for the blog post."),
    targetKeywords: z.array(z.string()).describe("SEO keywords to target in the content."),
    wordCount: z.number().default(800).describe("Target word count for the article."),
});

export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
    title: z.string().describe("An engaging, SEO-friendly title for the blog post."),
    slug: z.string().describe("A URL-friendly slug derived from the title (lowercase, hyphens, no special chars)."),
    excerpt: z.string().describe("A compelling 1-2 sentence summary for previews and SEO."),
    content: z.string().describe("The full blog post content in markdown format."),
    seoDescription: z.string().describe("A 150-160 character meta description for search engines."),
    tags: z.array(z.string()).describe("Relevant tags for the blog post (3-6 tags)."),
    readingTime: z.number().describe("Estimated reading time in minutes."),
});

export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
    'use server';

    const { output } = await ai.generate({
        prompt: `You are an expert fitness writer creating content for fRepo, a workout tracking app. 
Generate a high-quality, SEO-optimized blog post on the following topic.

**Topic:** ${input.topic}
**Category:** ${input.category}
**Target Keywords:** ${input.targetKeywords.join(', ')}
**Target Word Count:** ${input.wordCount} words

## Writing Guidelines:
1. Write in a conversational but authoritative tone
2. Use short paragraphs (2-3 sentences max) for readability
3. Include actionable tips and practical advice
4. Use markdown formatting:
   - ## for main sections
   - ### for subsections
   - **bold** for emphasis
   - Bullet points for lists
5. Start with a hook that addresses the reader's pain point
6. Include 4-6 main sections with clear headings
7. End with a motivating conclusion and call-to-action
8. Naturally incorporate the target keywords without keyword stuffing
9. Make content scannable with headers every 150-200 words

## Content Requirements:
- Cite specific numbers/statistics when making claims (use realistic estimates)
- Include form tips and safety notes where relevant
- Make it practical - readers should be able to apply advice immediately
- Avoid generic filler content - every sentence should add value

## SEO Requirements:
- Title should be compelling and include primary keyword
- Meta description should be exactly 150-160 characters and include a call-to-action
- Slug should be lowercase with hyphens, max 5 words

Generate the blog post now.`,
        output: {
            schema: GenerateBlogPostOutputSchema,
        },
    });

    if (!output) {
        throw new Error('Failed to generate blog post');
    }

    return output;
}
