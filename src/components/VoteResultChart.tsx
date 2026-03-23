import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface Props {
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
}

const COLORS = {
  for:     '#10b981', // emerald-500
  against: '#ef4444', // red-500
  abstain: '#94a3b8', // slate-400
};

export function VoteResultChart({ votesFor, votesAgainst, votesAbstain }: Props) {
  const { t } = useI18n();
  const total = votesFor + votesAgainst + votesAbstain;

  const data = [
    { key: 'for',     value: votesFor,     label: t('for_label'),     color: COLORS.for },
    { key: 'against', value: votesAgainst, label: t('against_label'), color: COLORS.against },
    { key: 'abstain', value: votesAbstain, label: t('abstain_label'), color: COLORS.abstain },
  ].filter(d => d.value > 0);

  const isAccepted = votesFor > votesAgainst;
  const isTie      = votesFor === votesAgainst;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const verdictCfg = isTie
    ? { text: t('tie'),      bg: 'bg-amber-500/15',  border: 'border-amber-400/40',  text_color: 'text-amber-500',  icon: <MinusCircle size={22} /> }
    : isAccepted
      ? { text: t('accepted'), bg: 'bg-emerald-500/15', border: 'border-emerald-400/40', text_color: 'text-emerald-500', icon: <CheckCircle2 size={22} /> }
      : { text: t('rejected'), bg: 'bg-red-500/15',     border: 'border-red-400/40',     text_color: 'text-red-500',    icon: <XCircle size={22} /> };

  return (
    <div className="space-y-4 py-2">
      {/* Donut chart + center label */}
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ key: 'empty', value: 1, label: '', color: '#e2e8f0' }]}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={data.length > 1 ? 3 : 0}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {(data.length ? data : [{ color: '#e2e8f0' }]).map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _: unknown, entry: any) => [
                `${value} (${pct(value)}%)`,
                entry.payload.label,
              ]}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--foreground)',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className={`text-2xl font-bold ${verdictCfg.text_color}`}>
            {total}
          </div>
          <div className="text-xs text-muted-foreground">{t('total')}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: t('for_label'),     value: votesFor,     color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: t('against_label'), value: votesAgainst, color: 'text-red-500',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
          { label: t('abstain_label'), value: votesAbstain, color: 'text-slate-500',   bg: 'bg-slate-500/10',   border: 'border-slate-500/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border ${s.bg} ${s.border} px-3 py-3 text-center`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {s.label}
            </div>
            <div className={`text-xs font-semibold ${s.color} mt-0.5`}>
              {pct(s.value)}%
            </div>
          </div>
        ))}
      </div>

      {/* Verdict banner */}
      <div className={`flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl border ${verdictCfg.bg} ${verdictCfg.border}`}>
        <span className={verdictCfg.text_color}>{verdictCfg.icon}</span>
        <span className={`font-bold text-base tracking-wide ${verdictCfg.text_color}`}>
          {verdictCfg.text}
        </span>
      </div>
    </div>
  );
}
