import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { Users, CalendarDays, Vote } from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ members: 0, meetings: 0, activeVotes: 0 });

  useEffect(() => {
    async function load() {
      const adminId = getAdminId();
      if (!adminId) {
        setStats({ members: 0, meetings: 0, activeVotes: 0 });
        return;
      }
      const [{ count: mc }, { count: mtc }, { data: myMeetings }] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('admin_id', adminId),
        supabase.from('meetings').select('*', { count: 'exact', head: true }).eq('admin_id', adminId),
        supabase.from('meetings').select('id').eq('admin_id', adminId),
      ]);
      const meetingIds = (myMeetings || []).map(m => m.id);
      let vc = 0;
      if (meetingIds.length > 0) {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'voting')
          .in('meeting_id', meetingIds);
        vc = count || 0;
      }
      setStats({ members: mc || 0, meetings: mtc || 0, activeVotes: vc });
    }
    load();
  }, []);

  const cards = [
    {
      label: t('members'),
      value: stats.members,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t('meetings'),
      value: stats.meetings,
      icon: CalendarDays,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      label: t('active_votes'),
      value: stats.activeVotes,
      icon: Vote,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{t('control_panel')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('admin_panel')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(c => (
          <div key={c.label} className="bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon size={20} className={c.color} strokeWidth={2} />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
