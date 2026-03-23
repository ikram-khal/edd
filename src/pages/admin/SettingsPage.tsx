import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getRequestErrorMessage } from '@/lib/request-error';
import { getAdminUsername } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error(t('passwords_mismatch'));
      return;
    }
    setLoading(true);
    try {
      const username = getAdminUsername();
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
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">{t('settings')}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{t('admin_panel')}</p>
      </div>

      <div className="max-w-md bg-card rounded-2xl border shadow-sm p-6">
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
            <Button onClick={handleChangePassword} disabled={loading} className="gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {t('change_password')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
