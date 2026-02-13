'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Giriş başarısız: ' + error.message);
    } else {
      // Başarılıysa Ana Sayfaya git
      router.push('/');
      router.refresh(); // Sayfayı yenile ki Navbar güncellensin
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Giriş Yap</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">Email</label>
            <input type="email" required 
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white outline-none focus:border-blue-500"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Şifre</label>
            <input type="password" required 
              className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white outline-none focus:border-blue-500"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-all">
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-400">
          Hesabın yok mu? <Link href="/signup" className="text-blue-400 hover:underline">Kayıt Ol</Link>
        </div>
      </div>
    </div>
  );
}