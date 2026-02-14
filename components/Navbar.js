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
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  
  // Mobil menü açık mı kapalı mı?
  const [isOpen, setIsOpen] = useState(false);

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
    
    // Sayfa değişince mobil menüyü otomatik kapat
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBalance(0);
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="border-b border-slate-700 bg-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3">
        
        {/* ÜST SATIR (LOGO + SAĞ TARAF) */}
        <div className="flex justify-between items-center">
            
            {/* LOGO */}
            <Link href="/" className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            🔮 Tahmin<span className="text-blue-500">Pazarı</span>
            </Link>

            {/* MASAÜSTÜ LİNKLERİ (Mobilde Gizli) */}
            {user && (
                <div className="hidden md:flex gap-6 text-sm font-semibold">
                    <Link href="/" className={`hover:text-white transition-colors ${pathname === '/' ? 'text-blue-400' : 'text-gray-300'}`}>Piyasalar</Link>
                    <Link href="/leaderboard" className={`hover:text-white transition-colors ${pathname === '/leaderboard' ? 'text-blue-400' : 'text-gray-300'}`}>Liderler</Link>
                    <Link href="/portfolio" className={`hover:text-white transition-colors ${pathname === '/portfolio' ? 'text-blue-400' : 'text-gray-300'}`}>Portföyüm</Link>
                </div>
            )}

            {/* SAĞ TARAF (Bakiye + Çıkış + Hamburger) */}
            <div className="flex items-center gap-3">
            
            {user ? (
                <>
                {/* Bakiye (Her zaman görünür) */}
                <div className="bg-slate-900 border border-slate-600 px-2 py-1.5 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                    <span className="font-mono font-bold text-yellow-400 text-xs md:text-sm">{balance.toLocaleString()} TP</span>
                </div>

                {/* Çıkış Yap (Sadece Masaüstünde Görünür, Mobilde Menüye Aldık) */}
                <button 
                    onClick={handleLogout}
                    className="hidden md:block text-xs font-bold text-red-400 border border-red-900/50 bg-red-900/10 px-3 py-1.5 rounded hover:bg-red-900/30 transition-all"
                >
                    Çıkış
                </button>

                {/* HAMBURGER BUTONU (Sadece Mobilde Görünür) */}
                <button 
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden text-gray-300 hover:text-white p-1 focus:outline-none"
                >
                    {isOpen ? (
                        // X İkonu
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        // 3 Çizgi İkonu
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    )}
                </button>
                </>
            ) : (
                <div className="flex gap-2">
                <Link href="/login" className="text-sm font-semibold text-gray-300 hover:text-white px-3 py-2">Giriş</Link>
                <Link href="/signup" className="text-sm font-semibold bg-blue-600 text-white px-3 py-2 rounded-lg">Kayıt</Link>
                </div>
            )}
            </div>
        </div>

        {/* MOBİL MENÜ (Açılır Kapanır Alan) */}
        {user && isOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-700 flex flex-col gap-4 animate-in slide-in-from-top-2">
                <Link href="/" className="block pt-4 text-gray-300 hover:text-white text-lg font-semibold px-2">
                    🏠 Piyasalar
                </Link>
                <Link href="/leaderboard" className="block text-gray-300 hover:text-white text-lg font-semibold px-2">
                    🏆 Liderler Tablosu
                </Link>
                <Link href="/portfolio" className="block text-gray-300 hover:text-white text-lg font-semibold px-2">
                    💼 Portföyüm
                </Link>
                <div className="border-t border-slate-700 my-2"></div>
                <button onClick={handleLogout} className="text-left text-red-400 hover:text-red-300 font-bold px-2">
                    Çıkış Yap
                </button>
            </div>
        )}

      </div>
    </nav>
  );
}