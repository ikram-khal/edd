import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronRight, CalendarDays, FileText } from 'lucide-react';

interface Meeting {
  id: string; protocol_number: string; meeting_date: string; admin_id?: string | null;
  question_count: number; closed_count: number;
}

export default function MeetingsPage() {
  const { t } = useI18n();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [date, setDate] = useState('');
  const [protocol, setProtocol] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    const adminId = getAdminId();
    if (!adminId) {
      setMeetings([]);
      setLoading(false);
      return;
    }
    const { data: meetingsData } = await supabase
      .from('meetings')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false });
    if (!meetingsData) { setLoading(false); return; }
    const meetingIds = meetingsData.map(m => m.id);
    const { data: questions } =
      meetingIds.length > 0
        ? await supabase.from('questions').select('meeting_id, status').in('meeting_id', meetingIds)
        : { data: [] as { meeting_id: string; status: string }[] };
    const qMap: Record<string, { total: number; closed: number }> = {};
    (questions || []).forEach(q => {
      if (!qMap[q.meeting_id]) qMap[q.meeting_id] = { total: 0, closed: 0 };
      qMap[q.meeting_id].total++;
      if (q.status === 'closed') qMap[q.meeting_id].closed++;
    });
    setMeetings(meetingsData.map(m => ({
      ...m, question_count: qMap[m.id]?.total || 0, closed_count: qMap[m.id]?.closed || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createMeeting = async () => {
    if (!date.trim() || !protocol.trim()) return;
    const adminId = getAdminId();
    if (!adminId) return;
    const { error } = await supabase
      .from('meetings')
      .insert({ meeting_date: date.trim(), protocol_number: protocol.trim(), admin_id: adminId });
    if (error) { toast.error(error.message); return; }
    toast.success(t('meeting_created'));
    setDate(''); setProtocol('');
    load();
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm(t('delete_meeting_confirm'))) return;
    await supabase.from('meetings').delete().eq('id', id);
    toast.success(t('deleted'));
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('meetings')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{meetings.length} {t('meetings').toLowerCase()}</p>
        </div>
      </div>

      {/* Create meeting form */}
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus size={15} className="text-primary" />
          {t('new_meeting')}
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder={t('date_placeholder')}
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder={`${t('protocol_number')} №`}
            value={protocol}
            onChange={e => setProtocol(e.target.value)}
            className="w-32"
            onKeyDown={e => e.key === 'Enter' && createMeeting()}
          />
          <Button onClick={createMeeting} className="gap-1.5">
            <Plus size={14} />
            {t('create')}
          </Button>
        </div>
      </div>

      {/* Meetings list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-card rounded-2xl border p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
            <CalendarDays size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t('no_meetings')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => (
            <div
              key={m.id}
              className="bg-card rounded-2xl border shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
              onClick={() => navigate(`/admin/meetings/${m.id}`)}
            >
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-violet-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t('meeting_label')} №{m.protocol_number}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.meeting_date} · {m.question_count} {t('question_label')} ({m.closed_count} {t('closed_label')})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); deleteMeeting(m.id); }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
