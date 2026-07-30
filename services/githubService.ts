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
  stars: number;
}

export type GitHubFailureReason = 'rate-limited' | 'not-found' | 'network';

/**
 * Result of a profile lookup.
 *
 * This is a discriminated union rather than `GitHubProfile | null` so the UI can
 * tell *why* a load failed and show an honest message. The previous version
 * returned hardcoded stats (21 repos, 5 stars, 2 followers) on failure, and even
 * overrode the live `public_repos` value when the real number was lower than the
 * invented one. Presenting fabricated numbers as real metrics on a portfolio is
 * a credibility risk, so no fallback data is invented here.
 */
export type GitHubProfileResult =
  | { status: 'success'; profile: GitHubProfile }
  | { status: 'error'; reason: GitHubFailureReason };

const API_BASE = 'https://api.github.com';

/** Sums stargazers across a user's own public repositories. */
const fetchStarsReceived = async (username: string): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE}/users/${username}/repos?per_page=100`);
    if (!response.ok) return 0;

    const repos: Array<{ stargazers_count?: number }> = await response.json();
    return repos.reduce((total, repo) => total + (repo.stargazers_count ?? 0), 0);
  } catch {
    // A missing star count is not worth failing the whole profile over.
    return 0;
  }
};

export const fetchGitHubProfile = async (username: string): Promise<GitHubProfileResult> => {
  try {
    const response = await fetch(`${API_BASE}/users/${username}`);

    // Unauthenticated requests are limited to 60/hour.
    if (response.status === 403 || response.status === 429) {
      return { status: 'error', reason: 'rate-limited' };
    }

    if (response.status === 404) {
      return { status: 'error', reason: 'not-found' };
    }

    if (!response.ok) {
      return { status: 'error', reason: 'network' };
    }

    const profile = await response.json();
    const stars = await fetchStarsReceived(username);

    return {
      status: 'success',
      profile: {
        login: profile.login ?? username,
        avatar_url: profile.avatar_url ?? '',
        html_url: profile.html_url ?? `https://github.com/${username}`,
        // Reported exactly as GitHub returns them.
        public_repos: profile.public_repos ?? 0,
        followers: profile.followers ?? 0,
        following: profile.following ?? 0,
        bio: profile.bio ?? '',
        name: profile.name ?? username,
        location: profile.location ?? '',
        stars,
      },
    };
  } catch {
    return { status: 'error', reason: 'network' };
  }
};
