/**
 * GitHub API utilities for fetching repository contributors
 */

interface GitHubContributor {
  login: string;
  avatar_url: string;
  profile_url: string;
  contributions: number;
  html_url: string;
}

interface ContributorResponse {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

/**
 * Fetches contributors from GitHub API
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Promise<GitHubContributor[]>
 */
export async function fetchGitHubContributors(
  owner: string,
  repo: string
): Promise<GitHubContributor[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100&sort=contributions`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data: ContributorResponse[] = await response.json();

    return data.map((contributor) => ({
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      profile_url: contributor.html_url,
      contributions: contributor.contributions,
      html_url: contributor.html_url,
    }));
  } catch (error) {
    console.error('Failed to fetch GitHub contributors:', error);
    throw error;
  }
}

/**
 * Fetches repository stars from GitHub API
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Promise<number>
 */
export async function fetchGitHubStars(
  owner: string,
  repo: string
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.stargazers_count;
  } catch (error) {
    console.error('Failed to fetch GitHub stars:', error);
    throw error;
  }
}
