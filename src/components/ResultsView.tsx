import { useState } from 'react';
import { VoteResultChart } from '@/components/VoteResultChart';
import { useI18n } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, LayoutList, ArrowLeftRight, X } from 'lucide-react';

interface QuestionResult {
  id: string;
  text: string;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
}

interface Props {
  questions: QuestionResult[];
  meetingProtocol: string;
  meetingDate: string;
  onClose: () => void;
}

type ViewMode = 'all' | 'step';

export function ResultsView({ questions, meetingProtocol, meetingDate, onClose }: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<ViewMode>('step');
  const [stepIdx, setStepIdx] = useState(0);

  const total = questions.length;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base leading-none">{t('report_title')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              №{meetingProtocol} · {meetingDate}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <button
              onClick={() => setMode('step')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'step' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowLeftRight size={12} />
              {t('question_label')}
            </button>
            <button
              onClick={() => setMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList size={12} />
              {t('total')}
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* ── ALL mode ─────────────────────────────────────────── */}
        {mode === 'all' && (
          <div className="space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                {/* Question header */}
                <div className="px-5 pt-5 pb-3 border-b bg-muted/30">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="font-semibold text-sm leading-snug text-foreground">{q.text}</p>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <VoteResultChart
                    votesFor={q.votes_for}
                    votesAgainst={q.votes_against}
                    votesAbstain={q.votes_abstain}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── STEP mode ─────────────────────────────────────────── */}
        {mode === 'step' && total > 0 && (
          <div className="space-y-4">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStepIdx(i)}
                  className={`rounded-full transition-all ${
                    i === stepIdx
                      ? 'w-6 h-2.5 bg-primary'
                      : i < stepIdx
                        ? 'w-2.5 h-2.5 bg-emerald-500'
                        : 'w-2.5 h-2.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            {/* Card */}
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden animate-fade-in-up">
              {/* Question header */}
              <div className="px-5 pt-5 pb-4 border-b bg-muted/30">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {stepIdx + 1}
                  </span>
                  <p className="font-semibold text-sm leading-snug text-foreground">
                    {questions[stepIdx].text}
                  </p>
                </div>
              </div>
              <div className="px-5 py-5">
                <VoteResultChart
                  votesFor={questions[stepIdx].votes_for}
                  votesAgainst={questions[stepIdx].votes_against}
                  votesAbstain={questions[stepIdx].votes_abstain}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                disabled={stepIdx === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border font-medium text-sm hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                {t('back')}
              </button>

              <span className="text-sm text-muted-foreground tabular-nums font-medium">
                {stepIdx + 1} / {total}
              </span>

              <button
                onClick={() => setStepIdx(i => Math.min(total - 1, i + 1))}
                disabled={stepIdx === total - 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {t('questions')}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
