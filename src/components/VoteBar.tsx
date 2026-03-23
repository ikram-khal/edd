import { useI18n } from '@/lib/i18n';

interface VoteBarProps {
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
}

export function VoteBar({ votesFor, votesAgainst, votesAbstain }: VoteBarProps) {
  const { t } = useI18n();
  const total = votesFor + votesAgainst + votesAbstain;
  if (total === 0) return <div className="h-3 rounded-full bg-muted" />;

  const pFor = (votesFor / total) * 100;
  const pAgainst = (votesAgainst / total) * 100;
  const pAbstain = (votesAbstain / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px bg-muted">
        {pFor > 0 && <div className="vote-bar-for transition-all rounded-full" style={{ width: `${pFor}%` }} />}
        {pAgainst > 0 && <div className="vote-bar-against transition-all rounded-full" style={{ width: `${pAgainst}%` }} />}
        {pAbstain > 0 && <div className="vote-bar-abstain transition-all rounded-full" style={{ width: `${pAbstain}%` }} />}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full vote-bar-for inline-block" />
          {t('for_label')}: <strong className="text-foreground">{votesFor}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full vote-bar-against inline-block" />
          {t('against_label')}: <strong className="text-foreground">{votesAgainst}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full vote-bar-abstain inline-block" />
          {t('abstain_label')}: <strong className="text-foreground">{votesAbstain}</strong>
        </span>
      </div>
    </div>
  );
}
