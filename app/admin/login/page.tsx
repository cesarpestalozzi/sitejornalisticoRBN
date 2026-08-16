'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, UserRound } from 'lucide-react';
import { ADMIN_LOGIN, ADMIN_EMAIL, DEFAULT_PASSWORD, buildUserLogin, normalizeCpf, useUsers } from '@/app/hooks/useUsers';

function hashPassword(value: string) {
  if (!value) {
    return '';
  }

  return btoa(value);
}

function hashPasswordUtf8(value: string) {
  if (!value) {
    return '';
  }

  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function matchesPassword(storedHash: string, inputPassword: string) {
  if (!storedHash || !inputPassword) {
    return false;
  }

  return (
    storedHash === inputPassword ||
    storedHash === hashPassword(inputPassword) ||
    storedHash === hashPasswordUtf8(inputPassword)
  );
}

export default function AdminLogin() {
  const router = useRouter();
  const { users, isLoaded } = useUsers();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginHint = useMemo(() => {
    if (!isLoaded || !users.length) {
      return ADMIN_LOGIN;
    }

    return `Ex.: ${users[0].login}`;
  }, [isLoaded, users]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const cleanIdentifier = identifier.trim();
    const loginCandidate = cleanIdentifier.toUpperCase();
    const credential = cleanIdentifier.startsWith('RBN') ? loginCandidate : buildUserLogin(normalizeCpf(cleanIdentifier));
    const user = users.find(
      (item) => item.login.toUpperCase() === credential || normalizeCpf(item.cpf) === normalizeCpf(cleanIdentifier)
    );

    if (user && matchesPassword(user.passwordHash, password)) {
      localStorage.setItem(
        'adminUser',
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleLevel: user.roleLevel,
          avatar: user.avatar,
          login: user.login,
          permissions: user.permissions,
        })
      );
      router.push('/admin/dashboard');
      setLoading(false);
      return;
    }

    setError('Identificação ou senha inválidos. Use o login RBN + CPF e a senha cadastrada.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#991B1B] to-[#7F1D1D] flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#991B1B] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">R</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">RBN</h1>
          <p className="text-gray-600 text-sm mt-1">Rede Brasileira de Notícias • Painel Administrativo</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#991B1B]/5 border border-[#991B1B]/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#991B1B]" />
            <p className="text-sm text-[#991B1B]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs text-gray-700">
            Acesso oficial: <span className="font-semibold text-gray-900">{ADMIN_LOGIN}</span> / <span className="font-semibold text-gray-900">{DEFAULT_PASSWORD}</span>
            <span className="mt-1 block text-[11px] text-gray-500">{ADMIN_EMAIL}</span>
          </div>

          <div>
            <label className="block text-gray-900 font-semibold mb-2">Identificação</label>
            <div className="relative">
              <UserRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={ADMIN_LOGIN}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Use o formato {loginHint}</p>
          </div>

          <div>
            <label className="block text-gray-900 font-semibold mb-2">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#991B1B] focus:ring-2 focus:ring-[#991B1B]/10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Senha padrão: {DEFAULT_PASSWORD}</p>
          </div>

          <button
            type="submit"
            disabled={loading || !isLoaded}
            className="w-full bg-[#111111] text-white font-bold py-2 rounded-lg hover:bg-[#2a2a2a] transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Painel'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600">
            Voltar para o{' '}
            <Link href="/" className="text-[#991B1B] font-semibold hover:text-[#7F1D1D]">
              portal principal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
