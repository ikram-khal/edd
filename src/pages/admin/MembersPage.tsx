import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { parseXlsx, downloadTemplate } from '@/lib/xlsx-utils';
import { getAdminId } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { UserPlus, Download, Upload, Trash2, UserCheck, UserX, Search, Copy, RefreshCw } from 'lucide-react';

interface Member { id: string; name: string; pin: string; session_id: string | null; admin_id?: string | null; }

export default function MembersPage() {
  const { t } = useI18n();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const generatePin = (fullName: string, existingPins: Set<string>): string => {
    const parts = fullName.trim().split(/\s+/);
    const initials = parts.map(p => p[0]?.toUpperCase() || '').join('');
    const prefix = initials || 'X';
    let pin = '';
    let attempts = 0;
    do {
      const num = String(Math.floor(1000 + Math.random() * 9000));
      pin = prefix + num;
      attempts++;
    } while (existingPins.has(pin) && attempts < 100);
    return pin;
  };

  const load = async () => {
    const adminId = getAdminId();
    if (!adminId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('members').select('*').eq('admin_id', adminId).order('name');
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addMember = async () => {
    if (!name.trim()) return;
    const adminId = getAdminId();
    if (!adminId) return;
    const existingPins = new Set(members.map(m => m.pin));
    const pin = generatePin(name.trim(), existingPins);
    const { error } = await supabase.from('members').insert({ name: name.trim(), pin, admin_id: adminId });
    if (error) {
      toast.error(error.message.includes('duplicate') ? t('duplicate_pin') : error.message);
      return;
    }
    toast.success(t('member_added') + ' — PIN: ' + pin);
    setName('');
    load();
  };

  const deleteMember = async (id: string, memberName: string) => {
    if (!confirm(`"${memberName}" — ${t('delete_member_confirm')}`)) return;
    await supabase.from('members').delete().eq('id', id);
    toast.success(t('deleted'));
    load();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const adminId = getAdminId();
    if (!adminId) return;
    try {
      const existingPins = new Set(members.map(m => m.pin));
      const existingNames = new Set(members.map(m => m.name.toLowerCase()));
      const parsed = await parseXlsx(file, existingPins);
      const toAdd = parsed
        .filter(p => !existingNames.has(p.name.toLowerCase()))
        .map(p => ({ ...p, admin_id: adminId }));
      const skipped = parsed.length - toAdd.length;
      if (toAdd.length > 0) {
        const { error } = await supabase.from('members').insert(toAdd);
        if (error) throw error;
      }
      toast.success(t('import_result', { added: toAdd.length, skipped }));
      load();
    } catch (err: any) {
      toast.error(err.message || t('import_error'));
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const copyPins = () => {
    const text = members.map(m => `${m.name}: ${m.pin}`).join('\n');
    navigator.clipboard.writeText(text).then(() => toast.success(t('pins_copied')));
  };

  const resetSessions = async () => {
    if (!confirm(t('reset_sessions_confirm'))) return;
    const adminId = getAdminId();
    if (!adminId) return;
    await supabase.from('members').update({ session_id: null }).eq('admin_id', adminId);
    toast.success(t('sessions_reset'));
    load();
  };

  const filtered = search.trim()
    ? members.filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()) || m.pin.toLowerCase().includes(search.trim().toLowerCase()))
    : members;

  const onlineCount = members.filter(m => m.session_id).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('members')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {members.length} {t('members').toLowerCase()} · {onlineCount} {t('members_online').toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
            <Download size={14} />
            {t('download_template')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload size={14} />
            {t('upload_xlsx')}
          </Button>
          {members.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={copyPins} className="gap-1.5">
                <Copy size={14} />
                {t('copy_pins')}
              </Button>
              <Button variant="outline" size="sm" onClick={resetSessions} className="gap-1.5 text-amber-600 hover:text-amber-500 border-amber-500/40 hover:border-amber-500/60">
                <RefreshCw size={14} />
                {t('reset_sessions')}
              </Button>
            </>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
        </div>
      </div>

      {/* Add member form */}
      <div className="bg-card rounded-2xl border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserPlus size={15} className="text-primary" />
          {t('add_member')}
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder={t('full_name')}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMember()}
            className="flex-1"
          />
          <Button onClick={addMember} className="gap-1.5">
            <UserPlus size={14} />
            {t('add')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">PIN код автоматик жаратылады (мыс. BAQ1234)</p>
      </div>

      {/* Search */}
      {members.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Members table */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <UserX size={22} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {search.trim() ? t('no_results') : t('no_members')}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 w-10">#</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3">{t('full_name')}</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 w-28">PIN</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-3 py-3 w-28">{t('status')}</th>
                <th className="w-14" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 text-sm text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-3 font-medium text-sm">{m.name}</td>
                  <td className="px-3 py-3 font-mono text-sm text-muted-foreground">{m.pin}</td>
                  <td className="px-3 py-3">
                    {m.session_id ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                        <UserCheck size={11} />
                        {t('registered')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                        <UserX size={11} />
                        {t('pending')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={() => deleteMember(m.id, m.name)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
