import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { VoteResultChart } from '@/components/VoteResultChart';
import { VotingLiveModal } from '@/components/VotingLiveModal';
import { ResultsView } from '@/components/ResultsView';
import { generateReport } from '@/lib/docx-report';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  Plus, Trash2, Play, FileDown, Users, MessageSquare,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, ListChecks, BarChart2,
} from 'lucide-react';

interface Member   { id: string; name: string; pin: string; }
interface Question {
  id: string; text: string; status: string;
  votes_for: number; votes_against: number; votes_abstain: number;
  voted_count: number;
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const [meeting, setMeeting]       = useState<any>(null);
  const [members, setMembers]       = useState<Member[]>([]);
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(new Set());
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [attendeePage, setAttendeePage] = useState(0);
  const [loading, setLoading]       = useState(true);

  // Sequential mode
  const [seqMode, setSeqMode]       = useState(false);
  const [showResults, setShowResults] = useState(false);
  const advancingRef                = useRef(false); // prevent double-fire

  const PER_PAGE = 8;
  const activeVoting = questions.find(q => q.status === 'voting') ?? null;
  const draftQuestions = questions.filter(q => q.status === 'draft');
  const closedQuestions = questions.filter(q => q.status === 'closed');

  // Sequential question index (1-based)
  const seqTotal = questions.length;
  const seqIndex = activeVoting
    ? questions.findIndex(q => q.id === activeVoting.id) + 1
    : closedQuestions.length;

  const load = useCallback(async () => {
    if (!id) return;
    const adminId = getAdminId();
    if (!adminId) {
      setMeeting(null); setMembers([]); setAttendeeIds(new Set()); setQuestions([]); setLoading(false); return;
    }
    const [{ data: mtg }, { data: allMembers }, { data: atts }, { data: qs }] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', id).single(),
      supabase.from('members').select('id, name, pin').eq('admin_id', adminId).order('name'),
      supabase.from('meeting_attendees').select('member_id').eq('meeting_id', id),
      supabase.from('questions').select('*').eq('meeting_id', id).order('created_at'),
    ]);
    if (mtg && mtg.admin_id != null && mtg.admin_id !== adminId) {
      setMeeting(null); setMembers([]); setAttendeeIds(new Set()); setQuestions([]); setLoading(false); return;
    }
    setMeeting(mtg);
    setMembers(allMembers || []);
    setAttendeeIds(new Set((atts || []).map(a => a.member_id)));
    const qIds = (qs || []).map(q => q.id);
    let voteCounts: Record<string, number> = {};
    if (qIds.length > 0) {
      const { data: votes } = await supabase.from('question_votes').select('question_id').in('question_id', qIds);
      (votes || []).forEach(v => { voteCounts[v.question_id] = (voteCounts[v.question_id] || 0) + 1; });
    }
    setQuestions((qs || []).map(q => ({ ...q, voted_count: voteCounts[q.id] || 0 })));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll while voting is active
  useEffect(() => {
    if (!activeVoting) return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [activeVoting, load]);

  // ── Auto-advance when all attendees have voted ──────────────────────────
  useEffect(() => {
    if (!seqMode || !activeVoting || advancingRef.current) return;
    if (attendeeIds.size > 0 && activeVoting.voted_count >= attendeeIds.size) {
      advancingRef.current = true;
      // Small delay so participants can see the "all voted" state in their UI
      const timer = setTimeout(() => advanceSequential(), 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVoting?.voted_count, attendeeIds.size]);

  // ── Sequential helpers ──────────────────────────────────────────────────
  const advanceSequential = async () => {
    if (!activeVoting) { advancingRef.current = false; return; }
    // Close current question
    await supabase.from('questions').update({ status: 'closed' }).eq('id', activeVoting.id);
    const freshQs = await supabase.from('questions').select('*').eq('meeting_id', id).order('created_at');
    const nextDraft = (freshQs.data || []).find((q: any) => q.status === 'draft');
    if (nextDraft) {
      await supabase.from('questions').update({ status: 'voting' }).eq('id', nextDraft.id);
      advancingRef.current = false;
      await load();
    } else {
      // All done
      advancingRef.current = false;
      setSeqMode(false);
      await load();
      toast.success(t('voting_stopped'));
      setShowResults(true);
    }
  };

  const startSequential = async () => {
    if (attendeeIds.size === 0) { toast.error(t('select_attendees_first')); return; }
    if (draftQuestions.length === 0) { toast.error(t('no_questions')); return; }
    const first = draftQuestions[0];
    await supabase.from('questions').update({ status: 'voting' }).eq('id', first.id);
    setSeqMode(true);
    advancingRef.current = false;
    toast.success(t('voting_started'));
    load();
  };

  // ── Individual (non-sequential) helpers ────────────────────────────────
  const startVoting = async (qId: string) => {
    if (attendeeIds.size === 0) { toast.error(t('select_attendees_first')); return; }
    await supabase.from('questions').update({ status: 'voting' }).eq('id', qId);
    toast.success(t('voting_started'));
    load();
  };

  const stopVoting = async (qId: string) => {
    await supabase.from('questions').update({ status: 'closed' }).eq('id', qId);
    if (seqMode) { setSeqMode(false); }
    toast.success(t('voting_stopped'));
    load();
  };

  // ── Other handlers ──────────────────────────────────────────────────────
  const toggleAttendee = async (memberId: string) => {
    if (!id) return;
    if (attendeeIds.has(memberId)) {
      await supabase.from('meeting_attendees').delete().eq('meeting_id', id).eq('member_id', memberId);
      setAttendeeIds(prev => { const s = new Set(prev); s.delete(memberId); return s; });
    } else {
      await supabase.from('meeting_attendees').insert({ meeting_id: id, member_id: memberId });
      setAttendeeIds(prev => new Set(prev).add(memberId));
    }
  };

  const selectAll = async () => {
    if (!id) return;
    const toAdd = members.filter(m => !attendeeIds.has(m.id));
    if (toAdd.length > 0) {
      await supabase.from('meeting_attendees').insert(toAdd.map(m => ({ meeting_id: id, member_id: m.id })));
    }
    setAttendeeIds(new Set(members.map(m => m.id)));
  };

  const addQuestion = async () => {
    if (!newQuestion.trim() || !id) return;
    await supabase.from('questions').insert({ meeting_id: id, text: newQuestion.trim() });
    setNewQuestion('');
    toast.success(t('question_added'));
    load();
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm(t('delete_question_confirm'))) return;
    await supabase.from('questions').delete().eq('id', qId);
    load();
  };

  const handleReport = async () => {
    if (!meeting) return;
    const attendeeMembers = members.filter(m => attendeeIds.has(m.id));
    await generateReport({
      protocolNumber: meeting.protocol_number,
      date: meeting.meeting_date,
      attendees: attendeeMembers.map(m => m.name),
      questions: closedQuestions.map(q => ({
        text: q.text, votes_for: q.votes_for, votes_against: q.votes_against, votes_abstain: q.votes_abstain,
      })),
      lang,
    });
    toast.success(t('report_downloaded'));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!meeting) return <div className="text-center py-12 text-muted-foreground">{t('meeting_not_found')}</div>;

  const pagedMembers = members.slice(attendeePage * PER_PAGE, (attendeePage + 1) * PER_PAGE);
  const totalPages   = Math.ceil(members.length / PER_PAGE);

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Sequential voting modal ───────────────────────────────── */}
      {seqMode && activeVoting && (
        <VotingLiveModal
          open
          questionText={activeVoting.text}
          questionIndex={seqIndex}
          totalQuestions={seqTotal}
          votedCount={activeVoting.voted_count}
          totalCount={attendeeIds.size}
          isLastQuestion={draftQuestions.length === 0}
          onStop={() => { stopVoting(activeVoting.id); setSeqMode(false); }}
          onNext={advanceSequential}
        />
      )}

      {/* ── Results overlay ────────────────────────────────────────── */}
      {showResults && (
        <ResultsView
          questions={questions.filter(q => q.status === 'closed')}
          meetingProtocol={meeting.protocol_number}
          meetingDate={meeting.meeting_date}
          onClose={() => setShowResults(false)}
        />
      )}

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('meeting_label')} №{meeting.protocol_number}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{meeting.meeting_date}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {closedQuestions.length > 0 && (
            <Button variant="outline" onClick={() => setShowResults(true)} className="gap-2">
              <BarChart2 size={15} />
              {t('result_label')}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleReport}
            disabled={closedQuestions.length === 0}
            className="gap-2"
          >
            <FileDown size={15} />
            {t('download_report')} (DOCX)
          </Button>
        </div>
      </div>

      {/* ── Attendees ─────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-primary" />
            <h3 className="font-semibold text-sm">{t('attendees')}</h3>
            <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
              {attendeeIds.size} / {members.length}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">{t('select_all')}</Button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {pagedMembers.map(m => (
              <label key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                <Checkbox checked={attendeeIds.has(m.id)} onCheckedChange={() => toggleAttendee(m.id)} />
                <span className="text-sm font-medium">{m.name}</span>
              </label>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 mt-4 justify-center">
              <button className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40" onClick={() => setAttendeePage(p => Math.max(0, p - 1))} disabled={attendeePage === 0}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-muted-foreground">{attendeePage + 1} / {totalPages}</span>
              <button className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-40" onClick={() => setAttendeePage(p => Math.min(totalPages - 1, p + 1))} disabled={attendeePage === totalPages - 1}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Questions ─────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            <h3 className="font-semibold text-sm">{t('questions')}</h3>
            <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">{questions.length}</span>
          </div>

          {/* Sequential start button */}
          {draftQuestions.length > 1 && !activeVoting && (
            <Button size="sm" onClick={startSequential} className="gap-1.5 text-xs">
              <ListChecks size={14} />
              {t('start_voting')} ({draftQuestions.length})
            </Button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Add question */}
          <div className="flex gap-2">
            <Input
              placeholder={t('new_question_placeholder')}
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addQuestion()}
              className="flex-1"
            />
            <Button onClick={addQuestion} className="gap-1.5">
              <Plus size={14} /> {t('add')}
            </Button>
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('no_questions')}</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`rounded-xl border overflow-hidden ${
                    q.status === 'voting' ? 'border-emerald-500/30 bg-emerald-500/5'
                    : q.status === 'closed' ? 'border-border bg-muted/20'
                    : 'border-border bg-card'
                  }`}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="text-xs text-muted-foreground font-mono mt-0.5 shrink-0">{idx + 1}.</span>
                        {q.status === 'draft'  && <Clock size={15} className="text-muted-foreground mt-0.5 shrink-0" />}
                        {q.status === 'voting' && <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-pulse" />}
                        {q.status === 'closed' && <CheckCircle2 size={15} className="text-muted-foreground mt-0.5 shrink-0" />}
                        <p className="font-medium text-sm leading-relaxed">{q.text}</p>
                      </div>
                      {q.status === 'draft' && !seqMode && (
                        <button
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          onClick={() => deleteQuestion(q.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Draft: individual start (only when NOT in seq mode) */}
                    {q.status === 'draft' && !seqMode && (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => startVoting(q.id)} disabled={attendeeIds.size === 0 || !!activeVoting} className="gap-1.5">
                          <Play size={13} /> {t('start_voting')}
                        </Button>
                      </div>
                    )}

                    {/* Voting: only progress counter, no results */}
                    {q.status === 'voting' && (
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {q.voted_count} / {attendeeIds.size} {t('voted')}
                        </div>
                        {/* Manual stop only when NOT in seq mode */}
                        {!seqMode && (
                          <Button size="sm" variant="destructive" onClick={() => stopVoting(q.id)} className="gap-1.5 text-xs">
                            {t('stop_voting')}
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Closed: show chart only when NOT in seq mode (or results view open) */}
                    {q.status === 'closed' && !seqMode && (
                      <div className="mt-4">
                        <VoteResultChart
                          votesFor={q.votes_for}
                          votesAgainst={q.votes_against}
                          votesAbstain={q.votes_abstain}
                        />
                      </div>
                    )}

                    {/* Closed in seq mode: just show "voted" label */}
                    {q.status === 'closed' && seqMode && (
                      <p className="mt-2 text-xs text-muted-foreground">{t('voted_check')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
