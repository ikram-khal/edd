import { useI18n } from '@/lib/i18n';
import { Square } from 'lucide-react';

interface Props {
  open: boolean;
  questionText: string;
  votedCount: number;
  totalCount: number;
  onStop: () => void;
}

export function VotingLiveModal({ open, questionText, votedCount, totalCount, onStop }: Props) {
  const { t } = useI18n();
  if (!open) return null;

  const progress = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-card border rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Animated top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

        <div className="px-8 py-10 flex flex-col items-center text-center gap-6">

          {/* Radar animation */}
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Outer rings */}
            <span className="absolute inset-0 rounded-full border-4 border-emerald-400/20 animate-[ping_2s_ease-out_infinite]" />
            <span className="absolute inset-4 rounded-full border-4 border-emerald-400/30 animate-[ping_2s_ease-out_infinite_0.4s]" />
            <span className="absolute inset-8 rounded-full border-4 border-emerald-400/40 animate-[ping_2s_ease-out_infinite_0.8s]" />
            {/* Inner solid circle */}
            <div className="relative z-10 w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              {/* Ballot box SVG */}
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-8 h-8 text-emerald-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v4H9V3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
                {t('live_badge')}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-foreground leading-snug">
              {questionText}
            </h2>
          </div>

          {/* Progress */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('voted')}</span>
              <span className="font-semibold text-foreground tabular-nums">
                {votedCount} / {totalCount}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
          </div>

          {/* Stop button */}
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:bg-destructive/90 active:scale-95 transition-all shadow-lg"
          >
            <Square size={14} fill="currentColor" />
            {t('stop_voting')}
          </button>
        </div>
      </div>
    </div>
  );
}
