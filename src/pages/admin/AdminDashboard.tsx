import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import {
  Users, CalendarDays, Vote, UserCheck, UserX,
  FileText, ChevronRight, ArrowRight,
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

  const [members, setMembers]     = useState<MemberRow[]>([]);
  const [meetings, setMeetings]   = useState<MeetingRow[]>([]);
  const [activeVotes, setActiveVotes] = useState<ActiveVote[]>([]);
  const [loading, setLoading]     = useState(true);

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
          closed_count: qMap[m.id]?.closed || 0,
          live_count: qMap[m.id]?.live || 0,
        })));

        const meetingMap = Object.fromEntries((meetingsData || []).map(m => [m.id, m]));
        const voting = (questions || []).filter(q => q.status === 'voting').map(q => ({
          id: q.id,
          text: q.text,
          meeting_id: q.meeting_id,
          protocol_number: meetingMap[q.meeting_id]?.protocol_number || '',
          meeting_date: meetingMap[q.meeting_id]?.meeting_date || '',
        }));
        setActiveVotes(voting);
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
    <div className="animate-fade-in-up space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('control_panel')}</h2>
        <p className="text-muted-foreground text-sm mt-1">{t('admin_panel')}</p>
      </div>

      {/* ── Members ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        {/* Stat card */}
        <div
          className="bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md cursor-pointer transition-shadow flex items-center justify-between"
          onClick={() => navigate('/admin/members')}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Users size={22} className="text-blue-500" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('members')}</p>
              <p className="text-3xl font-bold tracking-tight leading-none mt-0.5">{members.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{onlineCount} {t('members_online').toLowerCase()}</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-muted-foreground" />
        </div>

        {/* Members list */}
        {members.length > 0 && (
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            {members.slice(0, 5).map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/30 transition-colors">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground shrink-0">{m.pin}</span>
                {m.session_id ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5 shrink-0">
                    <UserCheck size={9} /> {t('registered')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5 shrink-0">
                    <UserX size={9} /> {t('pending')}
                  </span>
                )}
              </div>
            ))}
            {members.length > 5 && (
              <button
                onClick={() => navigate('/admin/members')}
                className="w-full py-2.5 text-xs text-primary font-medium flex items-center justify-center gap-1 hover:bg-muted/30 transition-colors"
              >
                {t('go_to_members')} <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Meetings ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div
          className="bg-card rounded-2xl border p-5 shadow-sm hover:shadow-md cursor-pointer transition-shadow flex items-center justify-between"
          onClick={() => navigate('/admin/meetings')}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <CalendarDays size={22} className="text-violet-500" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('meetings')}</p>
              <p className="text-3xl font-bold tracking-tight leading-none mt-0.5">{meetings.length}</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-muted-foreground" />
        </div>

        {meetings.length > 0 && (
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            {meetings.slice(0, 5).map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/admin/meetings/${m.id}`)}
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {t('meeting_label')} №{m.protocol_number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.meeting_date} · {m.question_count} {t('question_label')}
                  </p>
                </div>
                {m.live_count > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-1.5 py-0.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('live_badge')}
                  </span>
                )}
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            ))}
            {meetings.length > 5 && (
              <button
                onClick={() => navigate('/admin/meetings')}
                className="w-full py-2.5 text-xs text-primary font-medium flex items-center justify-center gap-1 hover:bg-muted/30 transition-colors"
              >
                {t('go_to_meetings')} <ChevronRight size={13} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── Active votes ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="bg-card rounded-2xl border p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Vote size={22} className="text-emerald-500" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('active_votes')}</p>
              <p className="text-3xl font-bold tracking-tight leading-none mt-0.5">{activeVotes.length}</p>
            </div>
          </div>
          {activeVotes.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('live_badge')}
            </span>
          )}
        </div>

        {activeVotes.length > 0 && (
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            {activeVotes.map(v => (
              <div
                key={v.id}
                className="flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/meetings/${v.meeting_id}`)}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{v.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('meeting_label')} №{v.protocol_number} · {v.meeting_date}
                  </p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              </div>
            ))}
          </div>
        )}

        {activeVotes.length === 0 && (
          <div className="bg-card rounded-2xl border shadow-sm px-4 py-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
              <Vote size={18} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t('no_active_votes')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
