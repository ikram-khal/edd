import { useI18n } from '@/lib/i18n';
import { Square, ChevronRight, CheckCheck } from 'lucide-react';

interface Props {
  open: boolean;
  questionText: string;
  questionIndex: number;   // 1-based
  totalQuestions: number;
  votedCount: number;
  totalCount: number;
  seqMode: boolean;        // false = single question voting
  onStop: () => void;
  onNext: () => void;      // manual advance (seq mode only)
  isLastQuestion: boolean;
}

export function VotingLiveModal({
  open, questionText, questionIndex, totalQuestions,
  votedCount, totalCount, seqMode, onStop, onNext, isLastQuestion,
}: Props) {
  const { t } = useI18n();
  if (!open) return null;

  const allVoted = totalCount > 0 && votedCount >= totalCount;
  const progress = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-card border rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">

        {/* Animated top stripe */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite]" />

        <div className="px-8 py-8 flex flex-col items-center text-center gap-5">

          {/* Question counter pill — only in sequential mode */}
          {seqMode && (
            <div className="flex items-center gap-2 bg-muted rounded-full px-4 py-1.5">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < questionIndex - 1
                      ? 'bg-emerald-500'
                      : i === questionIndex - 1
                        ? 'bg-primary w-4'
                        : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1 font-medium">
                {questionIndex} / {totalQuestions}
              </span>
            </div>
          )}

          {/* Radar animation or all-voted state */}
          {allVoted ? (
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCheck size={36} className="text-emerald-500" />
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-28 h-28">
              <span className="absolute inset-0 rounded-full border-4 border-emerald-400/20 animate-[ping_2s_ease-out_infinite]" />
              <span className="absolute inset-3 rounded-full border-4 border-emerald-400/30 animate-[ping_2s_ease-out_infinite_0.4s]" />
              <span className="absolute inset-6 rounded-full border-4 border-emerald-400/40 animate-[ping_2s_ease-out_infinite_0.8s]" />
              <div className="relative z-10 w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" stroke="currentColor" className="w-7 h-7 text-emerald-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v4H9V3z" />
                </svg>
              </div>
            </div>
          )}

          {/* Status label */}
          <div>
            {allVoted ? (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t('all_voted')}</p>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">{t('live_badge')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}
            <h2 className="text-base font-bold text-foreground leading-snug mt-2">{questionText}</h2>
          </div>

          {/* Progress */}
          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t('voted')}</span>
              <span className="font-semibold text-foreground tabular-nums">{votedCount} / {totalCount}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  allVoted
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 w-full">
            <button
              onClick={onStop}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/40 text-destructive font-medium text-sm hover:bg-destructive/10 active:scale-95 transition-all ${seqMode ? 'flex-1' : 'w-full'}`}
            >
              <Square size={13} fill="currentColor" />
              {t('stop_voting')}
            </button>

            {/* "Next question" button — sequential mode only */}
            {seqMode && (
              <button
                onClick={onNext}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm active:scale-95 transition-all shadow-sm ${
                  allVoted
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/30'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {isLastQuestion ? (
                  <>
                    <CheckCheck size={14} />
                    {t('finish_voting')}
                  </>
                ) : (
                  <>
                    {t('next_question')}
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
