import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getRequestErrorMessage } from '@/lib/request-error';
import { getAdminUsername, clearAdmin } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { KeyRound, Loader2, User, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const username = getAdminUsername();

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error(t('passwords_mismatch'));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_change_password', {
        p_username: username,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      });
      if (error) throw error;
      if (data) {
        toast.success(t('password_changed'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(t('wrong_password'));
      }
    } catch (err: unknown) {
      toast.error(getRequestErrorMessage(err) || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('settings')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('admin_panel')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
        {/* Account info */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <User size={17} className="text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm">{t('account_info')}</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('logged_in_as')}</p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border">
                <User size={14} className="text-muted-foreground shrink-0" />
                <span className="font-mono text-sm font-medium">{username || '—'}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5 w-full"
              onClick={() => { clearAdmin(); navigate('/'); }}
            >
              <LogOut size={14} />
              {t('logout')}
            </Button>
          </div>
        </div>

        {/* Change password */}
        <div className="bg-card rounded-2xl border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound size={17} className="text-primary" />
            </div>
            <h3 className="font-semibold text-sm">{t('change_password')}</h3>
          </div>
          <div className="space-y-3">
            <Input
              type="password"
              placeholder={t('current_password')}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t('new_password')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t('confirm_password')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            />
            <div className="pt-1">
              <Button onClick={handleChangePassword} disabled={loading} className="gap-2 w-full">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {t('change_password')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
