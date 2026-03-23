import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Users, CalendarDays, Vote, ChevronRight, FileText, UserPlus, Plus } from 'lucide-react';

interface RecentMeeting {
  id: string;
  protocol_number: string;
  meeting_date: string;
  question_count: number;
}

export default function AdminDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ members: 0, meetings: 0, activeVotes: 0, membersOnline: 0 });
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);

  useEffect(() => {
    async function load() {
      const adminId = getAdminId();
      if (!adminId) {
        setStats({ members: 0, meetings: 0, activeVotes: 0, membersOnline: 0 });
        return;
      }
      const [{ count: mc }, { data: membersData }, { data: myMeetings }, { data: recentData }] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('admin_id', adminId),
        supabase.from('members').select('session_id').eq('admin_id', adminId),
        supabase.from('meetings').select('id').eq('admin_id', adminId),
        supabase.from('meetings').select('id, protocol_number, meeting_date').eq('admin_id', adminId).order('created_at', { ascending: false }).limit(5),
      ]);
      const meetingIds = (myMeetings || []).map(m => m.id);
      let vc = 0;
      let recentWithCounts: RecentMeeting[] = [];
      if (meetingIds.length > 0) {
        const [{ count }, { data: allQs }] = await Promise.all([
          supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'voting').in('meeting_id', meetingIds),
          supabase.from('questions').select('meeting_id').in('meeting_id', (recentData || []).map(m => m.id)),
        ]);
        vc = count || 0;
        const qCountMap: Record<string, number> = {};
        (allQs || []).forEach(q => { qCountMap[q.meeting_id] = (qCountMap[q.meeting_id] || 0) + 1; });
        recentWithCounts = (recentData || []).map(m => ({ ...m, question_count: qCountMap[m.id] || 0 }));
      } else {
        recentWithCounts = (recentData || []).map(m => ({ ...m, question_count: 0 }));
      }
      const onlineCount = (membersData || []).filter(m => m.session_id).length;
      setStats({ members: mc || 0, meetings: (myMeetings || []).length, activeVotes: vc, membersOnline: onlineCount });
      setRecentMeetings(recentWithCounts);
    }
    load();
  }, []);

  const cards = [
    {
      label: t('members'),
      value: stats.members,
      sub: `${stats.membersOnline} ${t('members_online').toLowerCase()}`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      onClick: () => navigate('/admin/members'),
    },
    {
      label: t('meetings'),
      value: stats.meetings,
      sub: null,
      icon: CalendarDays,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
      onClick: () => navigate('/admin/meetings'),
    },
    {
      label: t('active_votes'),
      value: stats.activeVotes,
      sub: null,
      icon: Vote,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      onClick: null,
    },
  ];

  return (
    <div className="animate-fade-in-up space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('control_panel')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('admin_panel')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(c => (
          <div
            key={c.label}
            className={`bg-card rounded-2xl border p-6 shadow-sm transition-shadow ${c.onClick ? 'hover:shadow-md cursor-pointer' : ''}`}
            onClick={() => c.onClick?.()}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon size={20} className={c.color} strokeWidth={2} />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight">{c.value}</div>
            {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent meetings */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-primary" />
              <h3 className="font-semibold text-sm">{t('recent_meetings')}</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate('/admin/meetings')}>
              {t('go_to_meetings')}
              <ChevronRight size={13} />
            </Button>
          </div>
          {recentMeetings.length === 0 ? (
            <div className="px-5 py-10 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <CalendarDays size={18} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t('no_meetings')}</p>
              <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs" onClick={() => navigate('/admin/meetings')}>
                <Plus size={13} />
                {t('new_meeting')}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentMeetings.map(m => (
                <div
                  key={m.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/admin/meetings/${m.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-violet-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t('meeting_label')} №{m.protocol_number}</div>
                      <div className="text-xs text-muted-foreground">{m.meeting_date} · {m.question_count} {t('question_label')}</div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2">
            <Vote size={16} className="text-primary" />
            <h3 className="font-semibold text-sm">{t('quick_actions')}</h3>
          </div>
          <div className="p-4 space-y-2">
            <button
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all group text-left"
              onClick={() => navigate('/admin/meetings')}
            >
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Plus size={16} className="text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{t('new_meeting')}</div>
                <div className="text-xs text-muted-foreground">{t('go_to_meetings')}</div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border hover:bg-muted/50 hover:border-primary/30 transition-all group text-left"
              onClick={() => navigate('/admin/members')}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <UserPlus size={16} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{t('add_member')}</div>
                <div className="text-xs text-muted-foreground">{t('go_to_members')}</div>
              </div>
              <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {stats.activeVotes > 0 && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="text-sm font-medium text-emerald-700">
                  {stats.activeVotes} {t('active_votes').toLowerCase()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
