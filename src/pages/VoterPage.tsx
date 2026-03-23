import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getMember, clearMember } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getRequestErrorMessage } from '@/lib/request-error';
import { toast } from 'sonner';
import edawisLogo from '@/assets/edawis-logo.png';
import { LogOut, CheckCircle2, XCircle, MinusCircle, Inbox, CheckCheck } from 'lucide-react';

interface ActiveQuestion {
  id: string;
  text: string;
  meeting_protocol: string;
  meeting_date: string;
  already_voted: boolean;
}

export default function VoterPage() {
  const navigate = useNavigate();
  const member = getMember();
  const { t } = useI18n();
  const [questions, setQuestions] = useState<ActiveQuestion[]>([]);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    if (!member) return;
    try {
      const { data: attendances } = await supabase
        .from('meeting_attendees')
        .select('meeting_id')
        .eq('member_id', member.id);

      if (!attendances?.length) { setQuestions([]); setLoading(false); return; }
      const meetingIds = attendances.map(a => a.meeting_id);

      const { data: votingQuestions } = await supabase
        .from('questions')
        .select('id, text, meeting_id, status')
        .eq('status', 'voting')
        .in('meeting_id', meetingIds);

      if (!votingQuestions?.length) { setQuestions([]); setLoading(false); return; }

      const { data: meetings } = await supabase
        .from('meetings')
        .select('id, protocol_number, meeting_date')
        .in('id', meetingIds);

      const meetingMap = Object.fromEntries((meetings || []).map(m => [m.id, m]));

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
      setLoading(false);
    }
  }, [member]);

  useEffect(() => {
    if (!member) { navigate('/'); return; }
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 4000);
    return () => clearInterval(interval);
  }, [member, navigate, fetchQuestions]);

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

  return (
    <div className="min-h-screen bg-background">
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

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : unanswered.length === 0 && answered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Inbox size={28} className="text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">{t('no_active_votes')}</p>
            <p className="text-sm text-muted-foreground mt-1">Ожидайте начала голосования</p>
          </div>
        ) : unanswered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCheck size={28} className="text-emerald-600" />
            </div>
            <p className="font-semibold text-foreground">{t('all_voted')}</p>
          </div>
        ) : (
          unanswered.map((q) => (
            <div key={q.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden animate-fade-in-up">
              <div className="px-5 pt-5 pb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  {t('meeting_label')} №{q.meeting_protocol} · {q.meeting_date}
                </p>
                <p className="font-semibold text-base leading-snug text-foreground">{q.text}</p>
              </div>
              <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                <button
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                  onClick={() => castVote(q.id, 'for')}
                  disabled={votingId === q.id}
                >
                  <CheckCircle2 size={24} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">{t('for_label')}</span>
                </button>
                <button
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-400 active:scale-95 transition-all disabled:opacity-50"
                  onClick={() => castVote(q.id, 'against')}
                  disabled={votingId === q.id}
                >
                  <XCircle size={24} className="text-red-600" />
                  <span className="text-xs font-semibold text-red-700">{t('against_label')}</span>
                </button>
                <button
                  className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 active:scale-95 transition-all disabled:opacity-50"
                  onClick={() => castVote(q.id, 'abstain')}
                  disabled={votingId === q.id}
                >
                  <MinusCircle size={24} className="text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600">{t('abstain_label')}</span>
                </button>
              </div>
            </div>
          ))
        )}

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
      </div>
    </div>
  );
}
