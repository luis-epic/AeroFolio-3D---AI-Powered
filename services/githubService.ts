export interface GitHubProfile {
  login: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  bio: string;
  name: string;
  location: string;
}

export const fetchGitHubProfile = async (username: string): Promise<GitHubProfile | null> => {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error('GitHub API Error');
    }
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch GitHub data:", error);
    return null;
  }
};