import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getMember, clearMember } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getRequestErrorMessage } from '@/lib/request-error';
import { toast } from 'sonner';
import edawisLogo from '@/assets/edawis-logo.png';
import {
  LogOut, CheckCircle2, XCircle, MinusCircle, Inbox, CheckCheck,
  Users, CalendarDays, Vote,
} from 'lucide-react';

type Tab = 'votes' | 'members' | 'meetings';

interface ActiveQuestion {
  id: string;
  text: string;
  meeting_protocol: string;
  meeting_date: string;
  already_voted: boolean;
}

interface MemberItem {
  id: string;
  full_name: string;
  pin_code: string;
}

interface MeetingItem {
  id: string;
  protocol_number: string;
  meeting_date: string;
  status: string;
}

export default function VoterPage() {
  const navigate = useNavigate();
  const member = getMember();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('votes');

  // --- votes state ---
  const [questions, setQuestions] = useState<ActiveQuestion[]>([]);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [loadingVotes, setLoadingVotes] = useState(true);

  // --- members state ---
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // --- meetings state ---
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // shared meeting ids
  const [meetingIds, setMeetingIds] = useState<string[]>([]);

  // ── fetch meeting ids for this voter ──────────────────────────────────────
  const fetchMeetingIds = useCallback(async () => {
    if (!member) return [];
    const { data } = await supabase
      .from('meeting_attendees')
      .select('meeting_id')
      .eq('member_id', member.id);
    const ids = (data || []).map((a: { meeting_id: string }) => a.meeting_id);
    setMeetingIds(ids);
    return ids;
  }, [member]);

  // ── fetch active votes ────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async (ids?: string[]) => {
    if (!member) return;
    const mIds = ids ?? meetingIds;
    if (!mIds.length) { setQuestions([]); setLoadingVotes(false); return; }
    try {
      const { data: votingQuestions } = await supabase
        .from('questions')
        .select('id, text, meeting_id, status')
        .eq('status', 'voting')
        .in('meeting_id', mIds);

      if (!votingQuestions?.length) { setQuestions([]); setLoadingVotes(false); return; }

      const { data: mtgs } = await supabase
        .from('meetings')
        .select('id, protocol_number, meeting_date')
        .in('id', mIds);
      const meetingMap = Object.fromEntries((mtgs || []).map(m => [m.id, m]));

      const { data: myVotes } = await supabase
        .from('question_votes')
        .select('question_id')
        .eq('member_id', member.id)
        .in('question_id', votingQuestions.map(q => q.id));
      const votedSet = new Set((myVotes || []).map(v => v.question_id));

      setQuestions(votingQuestions.map(q => ({
        id: q.id,
        text: q.text,
        meeting_protocol: meetingMap[q.meeting_id]?.protocol_number || '',
        meeting_date: meetingMap[q.meeting_id]?.meeting_date || '',
        already_voted: votedSet.has(q.id),
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVotes(false);
    }
  }, [member, meetingIds]);

  // ── fetch members list ────────────────────────────────────────────────────
  const fetchMembers = useCallback(async (ids?: string[]) => {
    const mIds = ids ?? meetingIds;
    if (!mIds.length) { setMembers([]); return; }
    setLoadingMembers(true);
    try {
      const { data: attendances } = await supabase
        .from('meeting_attendees')
        .select('member_id')
        .in('meeting_id', mIds);
      const memberIds = [...new Set((attendances || []).map((a: { member_id: string }) => a.member_id))];
      if (!memberIds.length) { setMembers([]); return; }
      const { data } = await supabase
        .from('members')
        .select('id, full_name, pin_code')
        .in('id', memberIds)
        .order('full_name');
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  }, [meetingIds]);

  // ── fetch meetings list ───────────────────────────────────────────────────
  const fetchMeetings = useCallback(async (ids?: string[]) => {
    const mIds = ids ?? meetingIds;
    if (!mIds.length) { setMeetings([]); return; }
    setLoadingMeetings(true);
    try {
      const { data } = await supabase
        .from('meetings')
        .select('id, protocol_number, meeting_date, status')
        .in('id', mIds)
        .order('meeting_date', { ascending: false });
      setMeetings(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMeetings(false);
    }
  }, [meetingIds]);

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!member) { navigate('/'); return; }
    fetchMeetingIds().then(ids => {
      fetchQuestions(ids);
      fetchMembers(ids);
      fetchMeetings(ids);
    });
  }, [member, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── poll votes every 4 s ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => fetchQuestions(), 4000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  // ── vote action ───────────────────────────────────────────────────────────
  const castVote = async (questionId: string, voteType: 'for' | 'against' | 'abstain') => {
    if (!member) return;
    setVotingId(questionId);
    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_question_id: questionId,
        p_member_id: member.id,
        p_vote_type: voteType,
      });
      if (error) throw error;
      if (data) { toast.success(t('vote_accepted')); fetchQuestions(); }
      else { toast.error(t('vote_not_possible')); }
    } catch (err: unknown) {
      toast.error(getRequestErrorMessage(err) || t('error'));
    } finally {
      setVotingId(null);
    }
  };

  const handleLogout = () => { clearMember(); navigate('/'); };

  if (!member) return null;

  const unanswered = questions.filter(q => !q.already_voted);
  const answered = questions.filter(q => q.already_voted);

  // ── tab definitions ───────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'members',
      label: t('members'),
      icon: <Users size={20} />,
      badge: members.length || undefined,
    },
    {
      id: 'votes',
      label: t('active_votes'),
      icon: <Vote size={20} />,
      badge: unanswered.length || undefined,
    },
    {
      id: 'meetings',
      label: t('meetings'),
      icon: <CalendarDays size={20} />,
      badge: meetings.length || undefined,
    },
  ];

  // ── render helpers ────────────────────────────────────────────────────────
  function renderVotes() {
    if (loadingVotes) return <Spinner />;
    if (unanswered.length === 0 && answered.length === 0) {
      return (
        <EmptyState icon={<Inbox size={28} className="text-muted-foreground" />} text={t('no_active_votes')} />
      );
    }
    if (unanswered.length === 0) {
      return (
        <EmptyState icon={<CheckCheck size={28} className="text-emerald-500" />} text={t('all_voted')} color="emerald" />
      );
    }
    return (
      <>
        {unanswered.map(q => (
          <div key={q.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden animate-fade-in-up">
            <div className="px-5 pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-2">
                {t('meeting_label')} №{q.meeting_protocol} · {q.meeting_date}
              </p>
              <p className="font-semibold text-base leading-snug text-foreground">{q.text}</p>
            </div>
            <div className="px-4 pb-4 grid grid-cols-3 gap-2">
              <button
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 transition-all disabled:opacity-50"
                onClick={() => castVote(q.id, 'for')}
                disabled={votingId === q.id}
              >
                <CheckCircle2 size={24} className="text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('for_label')}</span>
              </button>
              <button
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 hover:border-red-500/50 active:scale-95 transition-all disabled:opacity-50"
                onClick={() => castVote(q.id, 'against')}
                disabled={votingId === q.id}
              >
                <XCircle size={24} className="text-red-500" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{t('against_label')}</span>
              </button>
              <button
                className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/30 active:scale-95 transition-all disabled:opacity-50"
                onClick={() => castVote(q.id, 'abstain')}
                disabled={votingId === q.id}
              >
                <MinusCircle size={24} className="text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">{t('abstain_label')}</span>
              </button>
            </div>
          </div>
        ))}
        {answered.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{t('already_voted')}:</p>
            {answered.map(q => (
              <div key={q.id} className="bg-card/60 border rounded-xl px-4 py-3 mb-2 flex items-center gap-3 opacity-60">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{q.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('voted_check')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderMembers() {
    if (loadingMembers) return <Spinner />;
    if (!members.length) return (
      <EmptyState icon={<Users size={28} className="text-muted-foreground" />} text={t('no_members')} />
    );
    return (
      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={m.id} className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
              <p className="text-xs text-muted-foreground font-mono">PIN: {m.pin_code}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderMeetings() {
    if (loadingMeetings) return <Spinner />;
    if (!meetings.length) return (
      <EmptyState icon={<CalendarDays size={28} className="text-muted-foreground" />} text={t('no_meetings')} />
    );
    return (
      <div className="space-y-2">
        {meetings.map(m => (
          <div key={m.id} className="bg-card border rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t('protocol_number')} №{m.protocol_number}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.meeting_date}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                m.status === 'open'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {m.status === 'open' ? t('live_badge') : t('closed_label')}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <img src={edawisLogo} alt="EDawis" className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-none">{member.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">PIN: {member.pin}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24 space-y-3">
        {tab === 'votes' && renderVotes()}
        {tab === 'members' && renderMembers()}
        {tab === 'meetings' && renderMeetings()}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t shadow-md">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ id, label, icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 relative transition-colors ${
                tab === id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                {icon}
                {badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-none">{label}</span>
              {tab === id && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({
  icon, text, color,
}: {
  icon: React.ReactNode;
  text: string;
  color?: 'emerald';
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
        color === 'emerald' ? 'bg-emerald-500/10' : 'bg-muted'
      }`}>
        {icon}
      </div>
      <p className="font-medium text-foreground">{text}</p>
    </div>
  );
}
