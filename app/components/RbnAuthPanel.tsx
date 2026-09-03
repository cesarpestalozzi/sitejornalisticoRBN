'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, LogOut, ShieldCheck } from 'lucide-react';
import {
  createOrLoginRbnAccount,
  loginWithRbnEmail,
  persistCurrentRbnUser,
  readCurrentRbnUser,
  signOutRbnUser,
  type RbnAccount,
} from '@/app/lib/rbnAuth';
import { hasSupabaseConfig, supabase } from '@/app/lib/supabase';

type AuthMode = 'login' | 'create';
type AuthStep = 'email' | 'password';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getDisplayNameFromEmail(value: string) {
  const local = value.split('@')[0]?.trim();
  if (!local) return 'Usuário RBN';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Usuário RBN';
}

function toRbnAccountFromSupabase(user: { id: string; email?: string | null; user_metadata?: Record<string, any>; app_metadata?: Record<string, any>; created_at?: string }) {
  const email = (user.email || '').trim().toLowerCase();
  const provider = (user.app_metadata?.provider as 'email' | 'google' | 'facebook') || 'email';
  return {
    id: user.id,
    name: (user.user_metadata?.full_name || getDisplayNameFromEmail(email) || 'Usuário RBN').trim(),
    email,
    provider,
    avatar: user.user_metadata?.avatar_url || '',
    createdAt: user.created_at || new Date().toISOString(),
  } satisfies RbnAccount;
}

export default function RbnAuthPanel({
  compact = false,
  onAuthenticated,
  initialMode = 'login',
}: {
  compact?: boolean;
  onAuthenticated?: (user: RbnAccount) => void;
  initialMode?: AuthMode;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentUser, setCurrentUser] = useState<RbnAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryRequestMode, setRecoveryRequestMode] = useState(false);
  const [recoveryRequestEmail, setRecoveryRequestEmail] = useState('');

  const syncCurrentUser = async () => {
    if (hasSupabaseConfig && supabase) {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      if (sessionUser) {
        const nextUser = toRbnAccountFromSupabase(sessionUser);
        setCurrentUser(nextUser);
        persistCurrentRbnUser(nextUser);
        onAuthenticated?.(nextUser);
        return;
      }
    }

    const localUser = readCurrentRbnUser();
    setCurrentUser(localUser);
  };

  useEffect(() => {
    syncCurrentUser();

    if (!hasSupabaseConfig || !supabase) {
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: unknown, session: any) => {
      if (!session?.user) {
        const localUser = readCurrentRbnUser();
        setCurrentUser(localUser);
        return;
      }

      const nextUser = toRbnAccountFromSupabase(session.user);
      setCurrentUser(nextUser);
      persistCurrentRbnUser(nextUser);
      onAuthenticated?.(nextUser);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLocalAuth = (nextUser: RbnAccount) => {
    setCurrentUser(nextUser);
    persistCurrentRbnUser(nextUser);
    onAuthenticated?.(nextUser);
    setError('');
    setNotice('');
  };

  const handleForgotPassword = () => {
    setRecoveryMode(false);
    setRecoveryCode('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryRequestMode(false);
    setRecoveryRequestEmail('');
    setStep('email');
    setError('');
    setNotice('');
    setRecoveryRequestMode(true);
  };

  const handleSendRecoveryCode = async () => {
    const trimmedRecoveryEmail = recoveryRequestEmail.trim().toLowerCase();
    if (!trimmedRecoveryEmail || !isValidEmail(trimmedRecoveryEmail)) {
      setError('Informe um e-mail válido para recuperar a senha.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedRecoveryEmail }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível enviar o código de recuperação.');
      }

      setEmail(trimmedRecoveryEmail);
      setRecoveryMode(true);
      setRecoveryRequestMode(false);
      setRecoveryCode('');
      setRecoveryNewPassword('');
      setRecoveryConfirmPassword('');
      setStep('password');
      setNotice(payload.message || 'Enviamos um código de recuperação para o seu e-mail.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar o código de recuperação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = recoveryCode.trim();
    const trimmedNewPassword = recoveryNewPassword.trim();
    const trimmedRecoveryConfirmPassword = recoveryConfirmPassword.trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Informe um e-mail válido para recuperar a senha.');
      return;
    }

    if (!trimmedCode) {
      setError('Informe o código recebido por e-mail.');
      return;
    }

    if (!trimmedNewPassword || trimmedNewPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (trimmedNewPassword !== trimmedRecoveryConfirmPassword) {
      setError('As senhas informadas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          code: trimmedCode,
          newPassword: trimmedNewPassword,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; message?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Não foi possível redefinir sua senha.');
      }

      setRecoveryMode(false);
      setRecoveryCode('');
      setRecoveryNewPassword('');
      setRecoveryConfirmPassword('');
      setPassword('');
      setStep('password');
      setNotice(payload.message || 'Senha redefinida com sucesso. Agora entre com sua nova senha.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível redefinir sua senha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendWelcomeEmail = async (recipientEmail: string, displayName: string) => {
    try {
      const response = await fetch('/api/welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recipientEmail,
          name: displayName,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.warn('Welcome email not sent:', text);
        return { ok: false, skipped: true };
      }

      const payload = await response.json().catch(() => ({}));
      return payload;
    } catch (error) {
      console.warn('Welcome email send failed:', error);
      return { ok: false, skipped: true };
    }
  };

  const completeSignupSuccess = async (recipientEmail: string, displayName: string) => {
    const fallbackName = displayName.trim() || getDisplayNameFromEmail(recipientEmail);
    await sendWelcomeEmail(recipientEmail, fallbackName);
    setNotice('Sua conta foi criada com sucesso. Bem-vindo ao RBN!');
  };

  const handleEmailContinue = () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Informe um e-mail válido para continuar.');
      return;
    }

    setError('');
    setStep('password');
  };

  const handlePasswordSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Informe um e-mail válido antes de continuar.');
      return;
    }

    if (!trimmedPassword) {
      setError('Informe a sua senha para continuar.');
      return;
    }

    if (mode === 'create' && !name.trim()) {
      setError('Informe o seu nome completo para criar a conta.');
      return;
    }

    if (mode === 'create' && trimmedPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (mode === 'create' && trimmedPassword !== confirmPassword.trim()) {
      setError('As senhas informadas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');

    try {
      if (hasSupabaseConfig && supabase) {
        if (mode === 'login') {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: trimmedPassword,
          });

          if (signInError) {
            throw signInError;
          }

          const user = data.user;
          const nextUser = toRbnAccountFromSupabase(user);
          setCurrentUser(nextUser);
          persistCurrentRbnUser(nextUser);
          onAuthenticated?.(nextUser);
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            data: {
              full_name: name.trim() || getDisplayNameFromEmail(trimmedEmail),
            },
          },
        });

        if (signUpError) {
          const lowerMessage = signUpError.message.toLowerCase();

          if (lowerMessage.includes('already')) {
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password: trimmedPassword,
            });

            if (retryError) {
              throw retryError;
            }

            const nextUser = toRbnAccountFromSupabase(retryData.user);
            setCurrentUser(nextUser);
            persistCurrentRbnUser(nextUser);
            onAuthenticated?.(nextUser);
            return;
          }

          if (mode === 'create' && (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests'))) {
            const fallbackUser = createOrLoginRbnAccount(trimmedEmail, 'email', name.trim() || getDisplayNameFromEmail(trimmedEmail));
            handleLocalAuth(fallbackUser);
            await completeSignupSuccess(trimmedEmail, fallbackUser.name);
            return;
          }

          throw signUpError;
        }

        const user = data.user;
        if (user) {
          const nextUser = toRbnAccountFromSupabase(user);
          setCurrentUser(nextUser);
          persistCurrentRbnUser(nextUser);
          onAuthenticated?.(nextUser);
        }

        await completeSignupSuccess(trimmedEmail, name.trim() || getDisplayNameFromEmail(trimmedEmail));
        return;
      }

      if (mode === 'login') {
        const existing = loginWithRbnEmail(trimmedEmail);
        handleLocalAuth(existing);
        return;
      }

      const created = createOrLoginRbnAccount(trimmedEmail, 'email', name.trim() || getDisplayNameFromEmail(trimmedEmail));
      handleLocalAuth(created);
      await completeSignupSuccess(trimmedEmail, created.name);
    } catch (caught) {
      const fallbackMessage = 'Não foi possível concluir a autenticação.';
      const message = caught instanceof Error ? caught.message : fallbackMessage;
      const lowerMessage = message.toLowerCase();

      if (mode === 'create' && (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests'))) {
        const fallbackUser = createOrLoginRbnAccount(trimmedEmail, 'email', name.trim() || getDisplayNameFromEmail(trimmedEmail));
        handleLocalAuth(fallbackUser);
        await completeSignupSuccess(trimmedEmail, fallbackUser.name);
        return;
      }

      setError(message || fallbackMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (hasSupabaseConfig && supabase) {
      supabase.auth.signOut().catch(() => undefined);
    }
    signOutRbnUser();
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setRecoveryMode(false);
    setRecoveryCode('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setStep('email');
    setError('');
    setNotice('');
  };

  if (currentUser) {
    const firstName = currentUser.name.trim().split(/\s+/)[0] || 'Conta RBN';

    return (
      <div className={`w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_30px_rgba(17,17,17,0.05)] sm:p-6 ${compact ? 'max-w-lg' : 'mx-auto max-w-xl'}`}>
        <div className="mx-auto max-w-xl">
          <div className="relative flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#991B1B]/8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#991B1B] bg-white text-[#991B1B]">
                <Check className="h-6 w-6" strokeWidth={2.6} />
              </div>
            </div>
            <span className="absolute left-[24%] top-2 text-base font-black text-[#991B1B]">+</span>
            <span className="absolute right-[26%] top-1 text-base font-black text-[#991B1B]">+</span>
            <span className="absolute left-[20%] top-10 text-base font-black text-[#111111]">+</span>
            <span className="absolute right-[22%] top-9 text-base font-black text-[#111111]">+</span>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#991B1B]">Minha Conta</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#111111] sm:text-4xl">Você está autenticado</h2>
            <p className="mt-3 text-2xl font-medium tracking-tight text-[#111111] sm:text-3xl">
              Olá, <span className="font-semibold text-[#991B1B]">{firstName}</span>!
            </p>
          </div>
        </div>

        <div className="my-5 h-px w-full bg-gray-200" />

        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 text-[#991B1B]" />
            <div className="text-sm leading-relaxed text-gray-700 sm:text-base">
              <p className="font-medium text-[#111111]">Sua Conta RBN está ativa neste dispositivo.</p>
              <p className="text-gray-600">Para encerrar a sessão, use o botão Sair.</p>
            </div>
          </div>
        </div>

        {notice && (
          <p className="mt-4 rounded-xl border border-[#991B1B]/20 bg-[#fff5f5] px-3 py-2 text-sm text-[#991B1B]">{notice}</p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-[#991B1B]/15 bg-[#fff5f5] px-3 py-2 text-sm text-[#991B1B]">{error}</p>
        )}

        <div className="mt-5 space-y-3">
          {!compact && (
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#991B1B]"
            >
              <ArrowLeft className="h-4 w-4 text-[#EF4444]" />
              Voltar para o site
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#111111] bg-white px-5 py-3 text-[15px] font-semibold text-[#111111] transition hover:border-[#991B1B] hover:text-[#991B1B]"
          >
            Sair da conta
            <LogOut className="h-4 w-4 text-[#991B1B]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_12px_30px_rgba(17,17,17,0.06)] ${compact ? 'max-w-xl' : 'mx-auto max-w-2xl'}`}>
    <div className="space-y-4">
        {step === 'email' ? (
          <>
            {mode === 'login' && recoveryRequestMode ? (
              <>
                <h2 className="text-3xl font-black tracking-tight text-gray-900">Recuperar senha</h2>
                <p className="text-sm text-gray-600">Para continuar, digite novamente o e-mail da sua Conta RBN.</p>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">E-mail da conta</label>
                  <input
                    type="email"
                    value={recoveryRequestEmail}
                    onChange={(event) => setRecoveryRequestEmail(event.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#991B1B] focus:bg-white focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSendRecoveryCode();
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryRequestMode(false);
                      setError('');
                      setNotice('');
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSendRecoveryCode}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar código'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black tracking-tight text-gray-900">
                  {mode === 'create' ? 'Crie uma conta RBN. É grátis!' : 'Entrar com conta RBN'}
                </h2>
                <p className="text-sm text-gray-600">
                  {mode === 'create'
                    ? 'Informe o seu e-mail para continuar e criar a sua conta.'
                    : 'Informe o seu e-mail para reconhecer a sua conta e seguir para a senha.'}
                </p>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">{mode === 'create' ? 'Seu e-mail' : 'Informe o seu e-mail'}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={mode === 'create' ? 'Digite seu e-mail' : 'seuemail@exemplo.com'}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#991B1B] focus:bg-white focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleEmailContinue();
                      }
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleEmailContinue}
                  className="w-full rounded-xl bg-[#991B1B] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7F1D1D]"
                >
                  Continuar
                </button>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                    className="text-left text-sm font-semibold text-[#991B1B] hover:text-[#7F1D1D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {mode === 'login' && recoveryMode ? (
              <>
                <h2 className="text-3xl font-black tracking-tight text-gray-900">Recuperar senha</h2>
                <p className="text-sm text-gray-600">Informe o código enviado para {email} e defina sua nova senha.</p>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Código de recuperação</label>
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value)}
                    placeholder="Digite o código recebido por e-mail"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Nova senha</label>
                  <input
                    type="password"
                    value={recoveryNewPassword}
                    onChange={(event) => setRecoveryNewPassword(event.target.value)}
                    placeholder="Crie uma nova senha"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Confirmar nova senha</label>
                  <input
                    type="password"
                    value={recoveryConfirmPassword}
                    onChange={(event) => setRecoveryConfirmPassword(event.target.value)}
                    placeholder="Digite a nova senha novamente"
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:bg-white focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleRecoverySubmit();
                      }
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(false);
                      setRecoveryRequestMode(false);
                      setRecoveryRequestEmail('');
                      setStep('email');
                      setError('');
                      setNotice('');
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleRecoverySubmit}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Processando...' : 'Redefinir senha'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isSubmitting}
                  className="text-left text-sm font-semibold text-[#991B1B] hover:text-[#7F1D1D] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reenviar código
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black tracking-tight text-gray-900">
                  {mode === 'create' ? 'Crie sua senha' : 'Informe a sua senha'}
                </h2>
                <p className="text-sm text-gray-600">E-mail reconhecido: {email}</p>

                {mode === 'create' && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">Seu nome completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Digite seu nome completo"
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#991B1B] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === 'create' ? 'Crie uma senha segura' : 'Digite sua senha'}
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:bg-white focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handlePasswordSubmit();
                      }
                    }}
                  />
                </div>

                {mode === 'create' && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-800">Confirmar senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Digite a senha novamente"
                      className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-[#111111] focus:bg-white focus:outline-none"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handlePasswordSubmit();
                        }
                      }}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryMode(false);
                      setRecoveryRequestMode(false);
                      setRecoveryRequestEmail('');
                      setStep('email');
                      setError('');
                      setNotice('');
                    }}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Processando...' : mode === 'create' ? 'Criar Conta RBN' : 'Entrar'}
                  </button>
                </div>

                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                    className="text-left text-sm font-semibold text-[#991B1B] hover:text-[#7F1D1D] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </>
            )}
          </>
        )}

      </div>

      {notice && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-[#991B1B]/15 bg-[#fff5f5] px-3 py-2 text-sm text-[#991B1B]">
          {error}
        </p>
      )}

      {mode === 'login' && (
        <p className="mt-5 text-sm text-gray-600">
          Não tem uma conta?{' '}
          <button type="button" onClick={() => { setMode('create'); setRecoveryMode(false); setRecoveryRequestMode(false); setRecoveryRequestEmail(''); setStep('email'); setError(''); setNotice(''); }} className="font-semibold text-[#991B1B] hover:text-[#7F1D1D]">
            Criar conta RBN
          </button>
        </p>
      )}

      {mode === 'create' && step === 'email' && (
        <p className="mt-5 text-sm text-gray-600">
          Já tem uma conta?{' '}
          <button type="button" onClick={() => { setMode('login'); setRecoveryMode(false); setRecoveryRequestMode(false); setRecoveryRequestEmail(''); setStep('email'); setError(''); setNotice(''); }} className="font-semibold text-[#991B1B] hover:text-[#7F1D1D]">
            Entrar com Conta RBN
          </button>
        </p>
      )}
    </div>
  );
}
