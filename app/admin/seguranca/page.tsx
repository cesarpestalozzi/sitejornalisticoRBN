'use client';

import Link from 'next/link';
import { CheckCircle, KeyRound, QrCode, Shield, ShieldOff, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { ToastContainer, useToast } from '@/app/components/Toast';
import { getCurrentAdminUser } from '@/app/lib/adminPermissions';

type MfaStatus = 'loading' | 'enabled' | 'disabled';
type SetupStep = 'idle' | 'qr' | 'verify' | 'done';

export default function SecurityPage() {
  const { toasts, addToast, removeToast } = useToast();
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('loading');
  const [setupStep, setSetupStep] = useState<SetupStep>('idle');
  const [qrUrl, setQrUrl] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentUser = getCurrentAdminUser();

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    fetch('/api/admin/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', userId: currentUser.id }),
    })
      .then((res) => res.json())
      .then((data) => {
        setMfaStatus(data.mfaEnabled ? 'enabled' : 'disabled');
      })
      .catch(() => {
        setMfaStatus('disabled');
      });
  }, [currentUser?.id]);

  const handleSetupMfa = async () => {
    if (!currentUser?.id || !currentUser?.email) {
      addToast('Nenhum usuário logado encontrado.', 'error', 3000);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', userId: currentUser.id, email: currentUser.email }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Erro ao configurar MFA.');
      }

      setQrUrl(data.qrUrl);
      setTotpSecret(data.secret);
      setSetupStep('qr');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao configurar MFA.', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!currentUser?.id) {
      return;
    }

    if (verifyCode.length !== 6) {
      addToast('Informe os 6 dígitos do código.', 'error', 2500);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', userId: currentUser.id, token: verifyCode }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Código inválido.');
      }

      setMfaStatus('enabled');
      setSetupStep('done');
      addToast('Autenticador configurado com sucesso!', 'success', 3000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Código inválido.', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!currentUser?.id) {
      return;
    }

    if (disableCode.length !== 6) {
      addToast('Informe o código atual do autenticador para confirmar.', 'error', 2500);
      return;
    }

    setLoading(true);

    try {
      const verifyResponse = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', userId: currentUser.id, token: disableCode }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.ok) {
        throw new Error('Código inválido. Confirme com o autenticador antes de desativar.');
      }

      const disableResponse = await fetch('/api/admin/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', userId: currentUser.id }),
      });

      const disableData = await disableResponse.json();

      if (!disableData.ok) {
        throw new Error(disableData.error || 'Erro ao desativar MFA.');
      }

      setMfaStatus('disabled');
      setSetupStep('idle');
      setShowDisableForm(false);
      setDisableCode('');
      addToast('Autenticador de dois fatores desativado.', 'success', 3000);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erro ao desativar MFA.', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Segurança</h1>
            <p className="mt-2 text-gray-600">Gerencie autenticação de dois fatores e configurações de segurança.</p>
          </div>

          {/* Card de status MFA */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden mb-6">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <Shield className="h-5 w-5 text-[#991B1B]" />
              <h2 className="text-lg font-bold text-gray-900">Autenticação de dois fatores (2FA)</h2>
            </div>

            <div className="p-6">
              {mfaStatus === 'loading' && (
                <p className="text-sm text-gray-500">Verificando status...</p>
              )}

              {mfaStatus === 'enabled' && setupStep !== 'done' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Autenticador ativo</p>
                      <p className="text-xs text-green-700 mt-0.5">
                        O acesso ao painel exige código do Microsoft Authenticator (ou Google Authenticator).
                      </p>
                    </div>
                  </div>

                  {!showDisableForm ? (
                    <button
                      type="button"
                      onClick={() => setShowDisableForm(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      <ShieldOff className="h-4 w-4" />
                      Desativar autenticador
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-semibold text-red-800">
                        Informe o código atual do autenticador para confirmar a desativação:
                      </p>
                      <input
                        type="text"
                        value={disableCode}
                        onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full rounded-lg border border-red-300 px-4 py-3 text-center text-xl font-bold tracking-widest focus:border-red-500 focus:outline-none bg-white"
                        maxLength={6}
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => { setShowDisableForm(false); setDisableCode(''); }}
                          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleDisableMfa}
                          disabled={loading || disableCode.length !== 6}
                          className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          {loading ? 'Verificando...' : 'Confirmar desativação'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(mfaStatus === 'disabled' || setupStep === 'done') && setupStep !== 'qr' && setupStep !== 'verify' && (
                <div className="space-y-4">
                  {setupStep === 'done' ? (
                    <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                      <p className="text-sm font-semibold text-green-800">
                        Autenticador configurado com sucesso! O próximo login exigirá o código.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Ative o autenticador de dois fatores para proteger o acesso ao painel admin.
                        Funciona com <span className="font-semibold">Microsoft Authenticator</span> e Google Authenticator.
                      </p>

                      <div className="grid gap-3 sm:grid-cols-3 text-sm text-gray-600">
                        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#991B1B]" />
                          <span>Baixe o <strong>Microsoft Authenticator</strong> no celular</span>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-[#991B1B]" />
                          <span>Escaneie o QR code com o aplicativo</span>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-[#991B1B]" />
                          <span>Use o código gerado no login</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {setupStep !== 'done' && (
                    <button
                      type="button"
                      onClick={handleSetupMfa}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7F1D1D] disabled:opacity-50"
                    >
                      <Shield className="h-4 w-4" />
                      {loading ? 'Gerando QR Code...' : 'Ativar autenticador'}
                    </button>
                  )}
                </div>
              )}

              {setupStep === 'qr' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                    <Smartphone className="h-5 w-5 text-blue-600 shrink-0" />
                    <p className="text-sm text-blue-800">
                      Abra o <strong>Microsoft Authenticator</strong> no seu celular e escaneie o QR code abaixo.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    <div className="rounded-2xl border-4 border-[#991B1B]/20 bg-white p-3 shadow-sm">
                      <img src={qrUrl} alt="QR Code para autenticador" className="h-48 w-48" />
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                          Código manual (se o QR não funcionar):
                        </p>
                        <code className="block rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800 break-all">
                          {totpSecret}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSetupStep('verify')}
                        className="w-full rounded-lg bg-[#991B1B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7F1D1D]"
                      >
                        Escaneado — confirmar código
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {setupStep === 'verify' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Informe o código de <strong>6 dígitos</strong> gerado pelo aplicativo para confirmar a configuração:
                  </p>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-lg border border-gray-300 px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] focus:border-[#991B1B] focus:outline-none"
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setSetupStep('qr'); setVerifyCode(''); }}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifySetup}
                      disabled={loading || verifyCode.length !== 6}
                      className="flex-1 rounded-lg bg-[#991B1B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7F1D1D] disabled:opacity-50"
                    >
                      {loading ? 'Verificando...' : 'Confirmar e ativar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Trocar senha */}
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <KeyRound className="h-5 w-5 text-[#991B1B]" />
              <h2 className="text-lg font-bold text-gray-900">Alterar senha</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Para alterar sua senha, acesse a área de usuários e use o botão <strong>Trocar senha</strong> no seu perfil.
                O código de verificação será enviado para o seu e-mail.
              </p>
              <Link
                href="/admin/usuarios"
                className="inline-flex items-center gap-2 rounded-lg bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a2a2a]"
              >
                Ir para Usuários
              </Link>
            </div>
          </div>
        </div>
      </main>

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
