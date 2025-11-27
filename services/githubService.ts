import { GitHubProfile, GitHubProfileSchema, safeParse } from '../utils/validation';

export type { GitHubProfile };

const GITHUB_API_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;

export const fetchGitHubProfile = async (username: string): Promise<GitHubProfile | null> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT);

      const response = await fetch(`https://api.github.com/users/${username}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`GitHub user "${username}" not found`);
          return null;
        }
        if (response.status === 403) {
          console.warn('GitHub API rate limit exceeded');
          return null;
        }
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response data with Zod
      const validatedData = safeParse(GitHubProfileSchema, data);
      if (!validatedData) {
        console.error('Invalid GitHub profile data structure');
        return null;
      }
      
      return validatedData;
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`GitHub API timeout (attempt ${attempt}/${MAX_RETRIES})`);
      } else {
        console.warn(`Failed to fetch GitHub data (attempt ${attempt}/${MAX_RETRIES}):`, error);
      }
      
      if (isLastAttempt) {
        return null;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
};