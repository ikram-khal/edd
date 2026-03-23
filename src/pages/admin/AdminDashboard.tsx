import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import {
  Users, CalendarDays, Vote, UserCheck, UserX,
  FileText, ChevronRight,
} from 'lucide-react';

interface MemberRow { id: string; name: string; pin: string; session_id: string | null; }
interface MeetingRow {
  id: string; protocol_number: string; meeting_date: string;
  live_count: number; closed_count: number; question_count: number;
}
interface ActiveVote { id: string; text: string; protocol_number: string; meeting_date: string; meeting_id: string; }

export default function AdminDashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [members, setMembers]         = useState<MemberRow[]>([]);
  const [meetings, setMeetings]       = useState<MeetingRow[]>([]);
  const [activeVotes, setActiveVotes] = useState<ActiveVote[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      const adminId = getAdminId();
      if (!adminId) { setLoading(false); return; }

      const [{ data: membersData }, { data: meetingsData }] = await Promise.all([
        supabase.from('members').select('id, name, pin, session_id').eq('admin_id', adminId).order('name'),
        supabase.from('meetings').select('*').eq('admin_id', adminId).order('created_at', { ascending: false }),
      ]);

      setMembers(membersData || []);

      const meetingIds = (meetingsData || []).map(m => m.id);
      if (meetingIds.length > 0) {
        const { data: questions } = await supabase
          .from('questions')
          .select('id, text, meeting_id, status')
          .in('meeting_id', meetingIds);

        const qMap: Record<string, { total: number; closed: number; live: number }> = {};
        (questions || []).forEach(q => {
          if (!qMap[q.meeting_id]) qMap[q.meeting_id] = { total: 0, closed: 0, live: 0 };
          qMap[q.meeting_id].total++;
          if (q.status === 'closed') qMap[q.meeting_id].closed++;
          if (q.status === 'voting') qMap[q.meeting_id].live++;
        });

        setMeetings((meetingsData || []).map(m => ({
          ...m,
          question_count: qMap[m.id]?.total || 0,
          closed_count:   qMap[m.id]?.closed || 0,
          live_count:     qMap[m.id]?.live || 0,
        })));

        const meetingMap = Object.fromEntries((meetingsData || []).map(m => [m.id, m]));
        setActiveVotes(
          (questions || [])
            .filter(q => q.status === 'voting')
            .map(q => ({
              id: q.id,
              text: q.text,
              meeting_id: q.meeting_id,
              protocol_number: meetingMap[q.meeting_id]?.protocol_number || '',
              meeting_date:    meetingMap[q.meeting_id]?.meeting_date || '',
            }))
        );
      } else {
        setMeetings([]);
        setActiveVotes([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const onlineCount = members.filter(m => m.session_id).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('control_panel')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('admin_panel')}</p>
      </div>

      {/* Three columns */}
      <div className="grid gap-4 md:grid-cols-3 items-start">

        {/* ── Участники ── */}
        <div className="space-y-2">
          <div
            className="bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => navigate('/admin/members')}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{t('members')}</p>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users size={20} className="text-blue-500" strokeWidth={2} />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight">{members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{onlineCount} {t('members_online').toLowerCase()}</p>
          </div>

          {members.length > 0 && (
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              {members.slice(0, 6).map((m, i) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                  <p className="flex-1 text-sm truncate">{m.name}</p>
                  {m.session_id ? (
                    <UserCheck size={13} className="text-emerald-500 shrink-0" />
                  ) : (
                    <UserX size={13} className="text-amber-500 shrink-0" />
                  )}
                </div>
              ))}
              {members.length > 6 && (
                <button
                  onClick={() => navigate('/admin/members')}
                  className="w-full py-2 text-xs text-primary font-medium flex items-center justify-center gap-1 hover:bg-muted/30 transition-colors"
                >
                  {t('go_to_members')} <ChevronRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Заседания ── */}
        <div className="space-y-2">
          <div
            className="bg-card rounded-2xl border p-6 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
            onClick={() => navigate('/admin/meetings')}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{t('meetings')}</p>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <CalendarDays size={20} className="text-violet-500" strokeWidth={2} />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight">{meetings.length}</div>
          </div>

          {meetings.length > 0 && (
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              {meetings.slice(0, 6).map(m => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-3 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/meetings/${m.id}`)}
                >
                  <FileText size={13} className="text-violet-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">№{m.protocol_number}</p>
                    <p className="text-[10px] text-muted-foreground">{m.meeting_date}</p>
                  </div>
                  {m.live_count > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </div>
              ))}
              {meetings.length > 6 && (
                <button
                  onClick={() => navigate('/admin/meetings')}
                  className="w-full py-2 text-xs text-primary font-medium flex items-center justify-center gap-1 hover:bg-muted/30 transition-colors"
                >
                  {t('go_to_meetings')} <ChevronRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Активные голосования ── */}
        <div className="space-y-2">
          <div className="bg-card rounded-2xl border p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{t('active_votes')}</p>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Vote size={20} className="text-emerald-500" strokeWidth={2} />
              </div>
            </div>
            <div className="text-4xl font-bold tracking-tight">{activeVotes.length}</div>
          </div>

          {activeVotes.length > 0 ? (
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
              {activeVotes.map(v => (
                <div
                  key={v.id}
                  className="flex items-start gap-2 px-3 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/meetings/${v.meeting_id}`)}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug line-clamp-2">{v.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">№{v.protocol_number} · {v.meeting_date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border shadow-sm px-3 py-6 flex flex-col items-center text-center">
              <Vote size={18} className="text-muted-foreground mb-1.5" />
              <p className="text-xs text-muted-foreground">{t('no_active_votes')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
