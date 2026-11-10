import React from 'react';
import { GitHubProfile, GitHubFailureReason } from '../../services/githubService';

interface StatsWidgetProps {
  data: GitHubProfile | null;
  error: GitHubFailureReason | null;
  labels: {
    fetching: string;
    rateLimited: string;
    unavailable: string;
    viewOnGitHub: string;
  };
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ data, error, labels }) => {
  if (data) {
    return (
      <div className="mb-6 w-full max-w-sm rounded border border-emerald-500/20 bg-emerald-900/10 px-3 py-2.5">
        <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-mono">
          <div>
            <div className="text-emerald-400 font-bold">{data.public_repos}</div>
            <div className="text-emerald-300/60">repos</div>
          </div>
          <div>
            <div className="text-emerald-400 font-bold">{data.followers}</div>
            <div className="text-emerald-300/60">followers</div>
          </div>
          <div>
            <div className="text-emerald-400 font-bold">{data.following}</div>
            <div className="text-emerald-300/60">following</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative mb-6 w-full max-w-md rounded-xl border border-emerald-400/30 bg-white/[0.04] px-4 py-3 text-center">
        <p className="text-xs leading-relaxed text-emerald-200 font-mono">
          {error === 'rate-limited'
            ? labels.rateLimited
            : labels.unavailable}
        </p>
        <a
          href="https://github.com/luis-epic"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs font-mono text-emerald-400 underline decoration-dotted hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {labels.viewOnGitHub}
        </a>
      </div>
    );
  }

  return (
    <div className="relative mb-6 h-12 w-full max-w-md bg-white/[0.04] animate-pulse rounded-xl border border-emerald-400/30 flex items-center justify-center font-mono text-xs text-emerald-200">
      {labels.fetching}
    </div>
  );
};

export default StatsWidget;
