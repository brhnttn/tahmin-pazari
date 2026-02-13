'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname(); // Hangi sayfadayız?
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isOpen, setIsOpen] = useState(false); // Mobil menü için

  // Her sayfa değiştiğinde veya açıldığında çalışır
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .single();
        if (profile) setBalance(profile.balance);
      }
    };
    getUser();
  }, [pathname]); // Sayfa değiştikçe bakiyeyi güncelle

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBalance(0);
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="border-b border-slate-700 bg-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        
        {/* LOGO */}
        <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
           🔮 Tahmin<span className="text-blue-500">Pazarı</span>
        </Link>

        {/* MASAÜSTÜ MENÜ */}
        <div className="flex items-center gap-6">
          
          {user ? (
            // --- GİRİŞ YAPMIŞ KULLANICI ---
            <>
              <div className="hidden md:flex gap-4 text-sm font-semibold">
                <Link href="/" className="text-gray-300 hover:text-white transition-colors">Piyasalar</Link>
                <Link href="/leaderboard" className="text-gray-300 hover:text-white transition-colors">Liderler</Link>
                <Link href="/portfolio" className="text-gray-300 hover:text-white transition-colors">Portföyüm</Link>
              </div>

              <div className="flex items-center gap-4">
                {/* Bakiye */}
                <div className="bg-slate-900 border border-slate-600 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                    <span className="font-mono font-bold text-yellow-400 text-sm">{balance.toLocaleString()} TP</span>
                </div>

                {/* Çıkış Yap */}
                <button 
                  onClick={handleLogout}
                  className="text-xs font-bold text-red-400 border border-red-900/50 bg-red-900/10 px-3 py-1.5 rounded hover:bg-red-900/30 transition-all"
                >
                  Çıkış
                </button>
              </div>
            </>
          ) : (
            // --- GİRİŞ YAPMAMIŞ KULLANICI ---
            <div className="flex gap-3">
              <Link href="/login" className="text-sm font-semibold text-gray-300 hover:text-white px-3 py-2">
                Giriş Yap
              </Link>
              <Link href="/signup" className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-900/20">
                Kayıt Ol
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}