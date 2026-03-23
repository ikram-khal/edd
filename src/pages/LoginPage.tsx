import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';
import { getSessionId, setMember, setAdmin } from '@/lib/session';
import { useI18n } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import edawisLogo from '@/assets/edawis-logo.png';
import { getRequestErrorMessage } from '@/lib/request-error';
import { KeyRound, User, Loader2 } from 'lucide-react';

function isBrowserFetchFailure(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : '';
  const s = msg.toLowerCase();
  return (
    s.includes('failed to fetch') ||
    s.includes('load failed') ||
    s.includes('networkerror')
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'voter' | 'admin'>('voter');
  const [adminTab, setAdminTab] = useState<'login' | 'register'>('login');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setPin('');
  }, [mode]);

  const handleVoterLogin = async () => {
    if (!pin.trim()) return;
    setLoading(true);
    try {
      const sessionId = getSessionId();
      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('pin', pin.trim())
        .maybeSingle();

      if (error) throw error;
      if (!member) { toast.error(t('pin_not_found')); return; }
      if (member.session_id && member.session_id !== sessionId) {
        toast.error(t('pin_bound_other'));
        return;
      }
      if (!member.session_id) {
        await supabase.from('members').update({ session_id: sessionId }).eq('id', member.id);
      }
      setMember({ id: member.id, name: member.name, pin: member.pin });
      toast.success(`${t('welcome')}, ${member.name}!`);
      navigate('/vote');
    } catch (err: unknown) {
      toast.error(
        isBrowserFetchFailure(err) ? t('fetch_failed_hint') : getRequestErrorMessage(err) || t('error'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_login', {
        p_username: username.trim(),
        p_password: password,
      });
      if (error) throw error;
      if (data && typeof data === 'string') {
        setAdmin(true, username.trim(), data);
        toast.success(t('admin_panel'));
        navigate('/admin');
      } else {
        toast.error(t('wrong_password'));
      }
    } catch (err: unknown) {
      toast.error(
        isBrowserFetchFailure(err) ? t('fetch_failed_hint') : getRequestErrorMessage(err) || t('error'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegister = async () => {
    if (!username.trim() || !password || !confirmPassword) return;
    if (password.length < 6) {
      toast.error(t('password_too_short'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('passwords_mismatch'));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_register', {
        p_username: username.trim(),
        p_password: password,
      });
      if (error) throw error;
      if (data && typeof data === 'string') {
        setAdmin(true, username.trim(), data);
        toast.success(t('account_created'));
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        navigate('/admin');
      } else {
        toast.error(t('username_taken'));
      }
    } catch (err: unknown) {
      toast.error(
        isBrowserFetchFailure(err) ? t('fetch_failed_hint') : getRequestErrorMessage(err) || t('error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Subtle background blobs — use primary color tints */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Language + theme switchers */}
      <div className="absolute top-4 right-4 z-10 flex gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm px-4 animate-fade-in-up">
        {!isSupabaseConfigured && (
          <Alert variant="destructive" className="mb-4 text-left">
            <AlertTitle>{t('supabase_env_title')}</AlertTitle>
            <AlertDescription>{t('supabase_env_body')}</AlertDescription>
          </Alert>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border backdrop-blur mb-4 shadow-sm">
            <img src={edawisLogo} alt="EDawis" className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">EDawis</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('app_subtitle')}</p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-1 mb-5 bg-muted/60 border border-border rounded-xl p-1">
          <button
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === 'voter'
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('voter')}
          >
            {t('voter')}
          </button>
          <button
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === 'admin'
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('admin')}
          >
            {t('admin')}
          </button>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
          {mode === 'voter' ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound size={16} className="text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{t('enter_pin')}</h2>
              </div>
              <Input
                placeholder="••••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVoterLogin()}
                maxLength={10}
                className="text-center text-lg tracking-[0.3em] font-mono h-12"
              />
              <button
                className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                onClick={handleVoterLogin}
                disabled={loading}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? t('checking') : t('login')}
              </button>
            </div>
          ) : (
            <div className="p-6">
              {/* Admin sub-tabs */}
              <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1">
                <button
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                    adminTab === 'login'
                      ? 'bg-card shadow-sm text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setAdminTab('login')}
                >
                  {t('login')}
                </button>
                <button
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                    adminTab === 'register'
                      ? 'bg-card shadow-sm text-foreground border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setAdminTab('register')}
                >
                  {t('register')}
                </button>
              </div>

              {adminTab === 'login' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">{t('admin_login')}</span>
                  </div>
                  <Input
                    placeholder={t('username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  />
                  <button
                    className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
                    onClick={handleAdminLogin}
                    disabled={loading}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? t('checking') : t('login')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder={t('username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder={t('confirm_password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminRegister()}
                  />
                  <p className="text-xs text-muted-foreground">{t('password_min_length')}</p>
                  <button
                    className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    onClick={handleAdminRegister}
                    disabled={loading}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {loading ? t('checking') : t('register')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
