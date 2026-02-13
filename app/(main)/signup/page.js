'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert('Hata: ' + error.message);
    } else {
      alert('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.');
      router.push('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Hesap Oluştur</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <input type="email" required 
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white outline-none focus:border-blue-500"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Şifre</label>
            <input type="password" required minLength={6}
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white outline-none focus:border-blue-500"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-all">
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          Zaten hesabın var mı? <Link href="/login" className="text-blue-400 hover:underline">Giriş Yap</Link>
        </div>
      </div>
    </div>
  );
}