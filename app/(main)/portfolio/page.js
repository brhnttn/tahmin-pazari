'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Portfolio() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function getData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Profil ve Bakiye
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);

      // Aktif Pozisyonlar (Portföy)
      const { data: posData } = await supabase.from('positions').select('*, markets(*)').eq('user_id', user.id);
      setPositions(posData || []);

      // Geçmiş İşlemler (Transaction History)
      // DİKKAT: markets tablosundan 'is_resolved' ve 'outcome' bilgisini de çekiyoruz!
      const { data: transData, error } = await supabase
        .from('transactions')
        .select('*, markets(question, is_resolved, outcome)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) console.error("Geçmiş çekme hatası:", error);

      // -- KÂR/ZARAR HESAPLAMA MOTORU --
      const pnlMap = {}; 
      
      transData?.forEach(t => {
          if (!pnlMap[t.market_id]) {
              pnlMap[t.market_id] = { 
                  question: t.markets?.question,
                  isResolved: t.markets?.is_resolved, // Piyasa bitti mi?
                  outcome: t.markets?.outcome,        // Kim kazandı?
                  spent: 0, 
                  earned: 0, 
                  net: 0 
              };
          }
          
          // BUY işlemleri maliyettir (spent)
          if (t.type.includes('BUY')) {
              pnlMap[t.market_id].spent += Number(t.amount_tp);
          } 
          // SELL ve PAYOUT işlemleri gelirdir (earned)
          else if (t.type.includes('SELL') || t.type === 'PAYOUT') {
              pnlMap[t.market_id].earned += Number(t.amount_tp);
          }
      });

      // Listeyi oluştur
      const closedList = Object.keys(pnlMap).map(mId => {
          const item = pnlMap[mId];
          item.net = item.earned - item.spent;
          return { id: mId, ...item };
      }).filter(item => {
          // GÖSTERME KURALI:
          // 1. Piyasa Sonuçlandıysa (Kazansan da kaybetsen de göster)
          // 2. VEYA Henüz bitmedi ama satış yapıp realize ettiysen (earned > 0)
          return item.isResolved || item.earned > 0;
      });

      setClosedPositions(closedList);
      setLoading(false);
    }
    getData();
  }, []);

  if (loading) return <div className="text-white text-center mt-20">Portföy Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      <main className="max-w-4xl mx-auto p-6 mt-6">
        
        {/* ÖZET KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="text-gray-400 text-sm mb-1">Kullanılabilir Bakiye</div>
                <div className="text-4xl font-bold text-yellow-400">{profile?.balance.toLocaleString()} TP</div>
             </div>
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-right">
                <div className="text-gray-400 text-sm mb-1">Toplam Kâr/Zarar</div>
                {(() => {
                    const totalPnl = closedPositions.reduce((acc, curr) => acc + curr.net, 0);
                    return (
                        <div className={`text-4xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalPnl > 0 ? '+' : ''}{Math.floor(totalPnl).toLocaleString()} TP
                        </div>
                    )
                })()}
             </div>
        </div>

        {/* 1. AKTİF VARLIKLAR */}
        <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2 text-blue-400">Aktif Hisselerim</h2>
        <div className="space-y-4 mb-12">
            {/* Sadece henüz sonuçlanmamış (Aktif) pozisyonları göster */}
            {positions.filter(p => !p.markets.is_resolved && (p.shares_yes > 0 || p.shares_no > 0)).length === 0 ? (
                <p className="text-gray-500 text-sm italic">Şu an açık bir pozisyonun yok.</p>
            ) : (
                positions.filter(p => !p.markets.is_resolved && (p.shares_yes > 0 || p.shares_no > 0)).map((pos) => (
                    <div key={pos.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center hover:border-blue-500 transition-colors">
                        <div>
                            <Link href={`/market/${pos.markets.id}`} className="font-bold hover:text-blue-400">{pos.markets.question}</Link>
                            <div className="text-xs text-gray-400 mt-1">Sonuç Bekleniyor...</div>
                        </div>
                        <div className="flex gap-2">
                             {pos.shares_yes > 0 && <span className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded text-sm font-bold">{Number(pos.shares_yes).toLocaleString()} EVET</span>}
                             {pos.shares_no > 0 && <span className="bg-red-900/30 text-red-400 px-3 py-1 rounded text-sm font-bold">{Number(pos.shares_no).toLocaleString()} HAYIR</span>}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* 2. GEÇMİŞ İŞLEMLER (Kapananlar + Satışlar) */}
        <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2 text-gray-400">Geçmiş İşlemler & Karne</h2>
        <div className="space-y-4">
            {closedPositions.length === 0 ? (
                <p className="text-gray-500 text-sm italic">Henüz gerçekleşmiş bir kâr veya zarar yok.</p>
            ) : (
                closedPositions.map((item) => (
                    <div key={item.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex-1">
                            <div className="font-bold text-gray-300">{item.question}</div>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                <span>Yatırılan: <span className="text-gray-300">{item.spent.toLocaleString()}</span></span>
                                <span>•</span>
                                <span>Geri Alınan: <span className="text-gray-300">{item.earned.toLocaleString()}</span></span>
                                {item.isResolved && (
                                    <span className={`ml-2 font-bold ${item.outcome === 'YES' ? 'text-emerald-500' : 'text-red-500'}`}>
                                        ({item.outcome === 'YES' ? 'EVET' : 'HAYIR'} Bitti)
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        {/* NET KÂR/ZARAR KUTUSU */}
                        <div className={`px-4 py-2 rounded-lg font-mono font-bold text-xl min-w-[120px] text-center
                            ${item.net >= 0 ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-900' : 'bg-red-900/20 text-red-400 border border-red-900'}`}>
                            {item.net > 0 ? '+' : ''}{Math.floor(item.net).toLocaleString()} TP
                        </div>
                    </div>
                ))
            )}
        </div>

      </main>
    </div>
  );
}