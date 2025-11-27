/**
 * Runtime validation schemas using Zod
 * Provides type-safe validation for external API responses
 */

import { z } from 'zod';

/**
 * GitHub Profile Schema
 * Validates responses from GitHub API
 */
export const GitHubProfileSchema = z.object({
  login: z.string().min(1),
  avatar_url: z.string().url(),
  html_url: z.string().url(),
  public_repos: z.number().int().nonnegative(),
  followers: z.number().int().nonnegative(),
  following: z.number().int().nonnegative(),
  bio: z.string().nullable(),
  name: z.string().nullable(),
  location: z.string().nullable(),
});

export type GitHubProfile = z.infer<typeof GitHubProfileSchema>;

/**
 * Project Data Schema
 * Validates project data structure
 */
export const ProjectDataSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  tech: z.string().min(1),
  description: z.string().min(1),
});

export type ProjectData = z.infer<typeof ProjectDataSchema>;

/**
 * Chat Message Schema
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().min(1),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Section Schema
 */
export const SectionSchema = z.enum(['home', 'about', 'projects', 'contact']);

export type Section = z.infer<typeof SectionSchema>;

/**
 * Safe parse helper that returns null on error instead of throwing
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.error('Validation error:', result.error.errors);
  return null;
}


