'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import AdminSidebar from '@/app/components/AdminSidebar';
import { ToastContainer, useToast } from '@/app/components/Toast';
import { hashPassword, useUsers } from '@/app/hooks/useUsers';
import { getCurrentAdminUser } from '@/app/lib/adminPermissions';

const MAX_PASSWORD_LENGTH = 8;

export default function ChangeInitialPasswordPage() {
  const router = useRouter();
  const { updateCurrentUserPassword, isLoaded } = useUsers();
  const { toasts, addToast, removeToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const currentUser = getCurrentAdminUser();

  useEffect(() => {
    if (isLoaded && !currentUser) {
      router.replace('/admin/login');
    }
  }, [currentUser, isLoaded, router]);

  const handleSubmit = () => {
    if (!currentUser) {
      return;
    }

    if (!newPassword.trim() || newPassword.length < 8) {
      addToast('A nova senha deve ter pelo menos 8 caracteres.', 'error', 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('As senhas não coincidem.', 'error', 3000);
      return;
    }

    setLoading(true);
    try {
      updateCurrentUserPassword(hashPassword(newPassword));

      localStorage.setItem(
        'adminUser',
        JSON.stringify({
          ...currentUser,
          mustChangePassword: false,
          onboardingStatus: 'active',
        })
      );
      window.dispatchEvent(new Event('adminUserChanged'));
      addToast('Senha atualizada com sucesso. Acesso liberado.', 'success', 3000);
      window.setTimeout(() => {
        router.push('/admin/dashboard');
      }, 800);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Não foi possível atualizar a senha.', 'error', 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="p-6 text-sm text-gray-600">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
          <div className="rounded-2xl bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#991B1B] text-white">
                  <KeyRound className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Defina sua nova senha</h1>
                  <p className="text-sm text-gray-600">Esse passo é obrigatório no primeiro acesso.</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Sua senha atual é temporária. Depois de criar a nova senha, seu acesso será liberado normalmente.
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Nova senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none"
                  placeholder="Digite a nova senha"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-900">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-[#991B1B] focus:outline-none"
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#991B1B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7f1d1d] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {loading ? 'Salvando...' : 'Salvar nova senha'}
                </button>
                <Link href="/admin/login" className="text-sm font-semibold text-gray-600 underline underline-offset-2">
                  Sair
                </Link>
              </div>
            </div>
          </div>
        </div>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>
    </div>
  );
}
