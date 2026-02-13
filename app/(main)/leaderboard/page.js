'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Leaderboard() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    async function getData() {
      // 1. Giriş yapmış kullanıcıyı bul
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 2. Tüm profilleri Bakiyeye göre (Çoktan aza) çek
      // Limit koyabiliriz (Örn: İlk 100 kişi)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, balance')
        .order('balance', { ascending: false })
        .limit(100);

      if (error) console.error(error);
      else {
        setUsers(profiles || []);
        
        // Eğer giriş yaptıysak, kendi sıramızı bulalım
        if (user) {
            const rank = profiles.findIndex(p => p.id === user.id);
            if (rank !== -1) setMyRank(rank + 1); // Dizi 0'dan başlar, sıralama 1'den
        }
      }
      setLoading(false);
    }
    getData();
  }, []);

  // E-Posta Gizleme Fonksiyonu (Ahmet@gmail.com -> Ahm***@gmail.com)
  const maskEmail = (email) => {
    if (!email) return 'Anonim';
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    return `${name.substring(0, 3)}***@${parts[1]}`;
  };

  if (loading) return <div className="text-white text-center mt-20">Sıralama Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      <main className="max-w-2xl mx-auto p-6 mt-6">
        
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                🏆 Liderlik Tablosu
            </h1>
            <p className="text-gray-400 mt-2">En iyi tahminciler ve servetleri</p>
        </div>

        {/* SENİN SIRALAMAN (Sticky Card) */}
        {currentUser && myRank && (
            <div className="bg-gradient-to-r from-blue-900/80 to-slate-900 border border-blue-500/50 p-4 rounded-xl mb-8 flex justify-between items-center shadow-lg shadow-blue-900/20 sticky top-20 z-40 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white ring-2 ring-blue-400">
                        #{myRank}
                    </div>
                    <div>
                        <div className="text-xs text-blue-300 font-bold uppercase tracking-wider">Senin Sıralaman</div>
                        <div className="font-bold text-white">{maskEmail(currentUser.email)}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-yellow-400">{users[myRank-1]?.balance.toLocaleString()} TP</div>
                </div>
            </div>
        )}

        {/* LİSTE */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* Başlıklar */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-700 bg-slate-800/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-2 text-center">Sıra</div>
                <div className="col-span-6">Kullanıcı</div>
                <div className="col-span-4 text-right">Servet (TP)</div>
            </div>

            {/* Satırlar */}
            <div className="divide-y divide-slate-700">
                {users.map((user, index) => {
                    const rank = index + 1;
                    const isMe = currentUser && currentUser.id === user.id;

                    // Madalya Renkleri
                    let rankColor = "bg-slate-700 text-gray-400"; // Varsayılan
                    if (rank === 1) rankColor = "bg-yellow-500 text-yellow-900";
                    if (rank === 2) rankColor = "bg-gray-300 text-gray-800";
                    if (rank === 3) rankColor = "bg-amber-600 text-amber-100";

                    return (
                        <div key={user.id} 
                             className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors
                                ${isMe ? 'bg-blue-900/20 border-l-4 border-blue-500' : 'hover:bg-slate-700/30'}
                             `}>
                            
                            {/* SIRA NUMARASI */}
                            <div className="col-span-2 flex justify-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rankColor}`}>
                                    {rank}
                                </div>
                            </div>

                            {/* KULLANICI ADI */}
                            <div className="col-span-6 truncate font-medium flex items-center gap-2">
                                <span className={isMe ? 'text-blue-400' : 'text-gray-300'}>
                                    {maskEmail(user.username)}
                                </span>
                                {isMe && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">SEN</span>}
                            </div>

                            {/* BAKİYE */}
                            <div className="col-span-4 text-right font-mono font-bold text-yellow-400">
                                {user.balance.toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

      </main>
    </div>
  );
}