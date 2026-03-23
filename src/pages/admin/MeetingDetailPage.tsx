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
  Pencil, Check, X, ChevronDown, ChevronUp,
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

  // Inline edit
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editText, setEditText]     = useState('');

  // Expanded result cards (closed questions)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
    if (seqMode) {
      setSeqMode(false);
    } else {
      // Single question: auto-expand result after stopping
      setExpandedIds(prev => new Set(prev).add(qId));
    }
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

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditText(q.text);
  };

  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await supabase.from('questions').update({ text: editText.trim() }).eq('id', editingId);
    setEditingId(null);
    setEditText('');
    toast.success(t('question_updated'));
    load();
  };

  const toggleExpand = (qId: string) => {
    setExpandedIds(prev => {
      const s = new Set(prev);
      s.has(qId) ? s.delete(qId) : s.add(qId);
      return s;
    });
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

      {/* ── Voting modal (single or sequential) ──────────────────── */}
      {activeVoting && (
        <VotingLiveModal
          open
          questionText={activeVoting.text}
          questionIndex={seqIndex}
          totalQuestions={seqTotal}
          votedCount={activeVoting.voted_count}
          totalCount={attendeeIds.size}
          seqMode={seqMode}
          isLastQuestion={draftQuestions.length === 0}
          onStop={() => stopVoting(activeVoting.id)}
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
            <div className="divide-y divide-border rounded-xl border overflow-hidden">
              {questions.map((q, idx) => {
                const isEditing  = editingId === q.id;
                const isExpanded = expandedIds.has(q.id);
                const canEdit    = q.status === 'draft' && !seqMode;
                const canDelete  = q.status !== 'voting' && !seqMode;

                return (
                  <div key={q.id} className={`${
                    q.status === 'voting' ? 'bg-emerald-500/5' : 'bg-card'
                  }`}>

                    {/* ── Row ── */}
                    <div className="px-4 py-3 flex items-center gap-3">

                      {/* Index + status icon */}
                      <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 text-right">{idx + 1}.</span>
                      {q.status === 'draft'  && <Clock size={14} className="text-muted-foreground shrink-0" />}
                      {q.status === 'voting' && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />}
                      {q.status === 'closed' && <CheckCircle2 size={14} className="text-muted-foreground shrink-0" />}

                      {/* Text or edit input */}
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                          className="flex-1 text-sm border rounded-lg px-2.5 py-1 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium leading-snug">{q.text}</span>
                      )}

                      {/* Right-side actions */}
                      <div className="flex items-center gap-1 shrink-0">

                        {/* Voting progress badge */}
                        {q.status === 'voting' && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {q.voted_count}/{attendeeIds.size}
                          </span>
                        )}

                        {/* Edit mode: save / cancel */}
                        {isEditing && (
                          <>
                            <button onClick={saveEdit} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors" title={t('save')}>
                              <Check size={14} />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors" title={t('cancel')}>
                              <X size={14} />
                            </button>
                          </>
                        )}

                        {/* Draft (not editing): edit + start + delete */}
                        {canEdit && !isEditing && (
                          <>
                            <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={t('edit')}>
                              <Pencil size={13} />
                            </button>
                            <Button
                              size="sm"
                              onClick={() => startVoting(q.id)}
                              disabled={attendeeIds.size === 0 || !!activeVoting}
                              className="gap-1 h-7 px-2.5 text-xs"
                            >
                              <Play size={11} /> {t('start_voting')}
                            </Button>
                          </>
                        )}

                        {/* Voting: stop button (non-seq only) */}
                        {q.status === 'voting' && !seqMode && (
                          <Button size="sm" variant="destructive" onClick={() => stopVoting(q.id)} className="h-7 px-2.5 text-xs gap-1">
                            {t('stop_voting')}
                          </Button>
                        )}

                        {/* Closed: expand toggle */}
                        {q.status === 'closed' && !seqMode && (
                          <button
                            onClick={() => toggleExpand(q.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={isExpanded ? t('hide_results') : t('show_results')}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        )}

                        {/* Delete — for draft and closed (not voting, not seqMode) */}
                        {canDelete && !isEditing && (
                          <button
                            onClick={() => deleteQuestion(q.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Expanded chart ── */}
                    {q.status === 'closed' && !seqMode && isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t bg-muted/20">
                        <VoteResultChart
                          votesFor={q.votes_for}
                          votesAgainst={q.votes_against}
                          votesAbstain={q.votes_abstain}
                        />
                      </div>
                    )}

                    {/* Closed in seq mode */}
                    {q.status === 'closed' && seqMode && (
                      <div className="px-4 pb-2">
                        <p className="text-xs text-muted-foreground">{t('voted_check')}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
