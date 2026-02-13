'use client';
import { useEffect, useState, use } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Grafik Kütüphanesi
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function MarketDetail({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  
  const [market, setMarket] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [position, setPosition] = useState({ shares_yes: 0, shares_no: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [mode, setMode] = useState('BUY');
  const [amount, setAmount] = useState(100);
  const [selectedSide, setSelectedSide] = useState('YES');

  // --- 1. VERİLERİ ÇEK ---
  useEffect(() => {
    async function initData() {
      // Piyasa
      const { data: marketData } = await supabase.from('markets').select('*').eq('id', resolvedParams.id).single();
      setMarket(marketData);

      // Grafik Verisi (Son 50 işlem)
      const { data: history } = await supabase
        .from('market_prices')
        .select('created_at, price_yes')
        .eq('market_id', resolvedParams.id)
        .order('created_at', { ascending: true })
        .limit(50);
      
      // Veriyi grafiğe uygun formata çevir
      if(history) {
        const formatted = history.map(h => ({
            time: new Date(h.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'}),
            yes: (h.price_yes * 100).toFixed(1), // % olarak
            no: ((1 - h.price_yes) * 100).toFixed(1)
        }));
        setPriceHistory(formatted);
      }

      // Kullanıcı
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
        if (profile) setBalance(profile.balance);
        const { data: pos } = await supabase.from('positions').select('*').eq('user_id', user.id).eq('market_id', resolvedParams.id).single();
        if (pos) setPosition(pos);
      }
      setLoading(false);
    }
    if (resolvedParams.id) initData();
  }, [resolvedParams.id]);

  // --- 2. DOĞRU HESAPLAMA MOTORU (AMM SİMÜLASYONU) ---
  const calculateOutput = () => {
    if (!market || !amount) return 0;
    
    // Mevcut Havuzlar
    const poolYes = market.pool_yes;
    const poolNo = market.pool_no;
    const totalPool = poolYes + poolNo;

    // ALIM SENARYOSU (SQL'deki mantığın aynısı)
    if (mode === 'BUY') {
        const fee = amount * 0.02; // %2 Komisyon
        const netInvest = amount - fee;
        
        // Yeni Fiyat Tahmini: (Havuz + Para) / (Toplam + Para)
        let newPrice;
        if (selectedSide === 'YES') {
            newPrice = (poolYes + netInvest) / (totalPool + netInvest);
        } else {
            newPrice = (poolNo + netInvest) / (totalPool + netInvest);
        }
        
        // Elimize geçecek hisse
        return Math.floor(netInvest / newPrice);
    } 
    
    // SATIŞ SENARYOSU
    else {
        // Satarken o anki fiyattan satıyoruz (Basitleştirilmiş)
        let currentPrice;
        if (selectedSide === 'YES') currentPrice = poolYes / totalPool;
        else currentPrice = poolNo / totalPool;

        const grossPayout = amount * currentPrice;
        const netPayout = grossPayout * 0.98; // %2 Komisyon düş
        return Math.floor(netPayout);
    }
  };

  const handleTransaction = async () => {
    if (!user) { router.push('/login'); return; }
    setProcessing(true);
    let rpcName = mode === 'BUY' ? 'buy_share' : 'sell_share';
    let params = { p_market_id: market.id, p_outcome: selectedSide };
    if (mode === 'BUY') params.p_amount = amount; else params.p_shares = amount;

    const { data, error } = await supabase.rpc(rpcName, params);
    if (error || data.success === false) { alert("Hata: " + (error?.message || data?.message)); }
    else { alert("İşlem Başarılı!"); window.location.reload(); }
    setProcessing(false);
  };

  if (loading) return <div className="text-white text-center mt-20">Yükleniyor...</div>;
  if (!market) return <div className="text-white text-center mt-20">Piyasa bulunamadı!</div>;

  const estimatedOutput = calculateOutput();
  const currentYesPrice = (market.pool_yes / (market.pool_yes + market.pool_no)) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans pb-20">

        {/* ALT MENÜ (Breadcrumb) */}
      <div className="border-b border-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
            {/* Herkes Geri Dön Butonunu Görür */}
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold">
                ← Piyasalar
            </Link>
            
            {/* SADECE Giriş Yapmış Kullanıcı Portföy Linkini Görür */}
            {user && (
                <Link href="/portfolio" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">
                    Portföyüm →
                </Link>
            )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* SOL: Grafik ve Detaylar */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Grafik Alanı */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-80">
                <h3 className="text-sm font-bold text-gray-400 mb-4">FİYAT GRAFİĞİ (EVET %)</h3>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                        <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} />
                        <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                        <Line type="monotone" dataKey="yes" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{r: 8}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 p-6">
                <h1 className="text-3xl font-bold mb-4">{market.question}</h1>
                <p className="text-gray-300">{market.description}</p>
            </div>
        </div>

        {/* SAĞ: Gelişmiş İşlem Kutusu */}
        <div className="lg:col-span-1">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 sticky top-24 shadow-2xl">
                
                {market.is_resolved ? (
                    <div className="text-center py-10">
                         <div className={`text-xl font-bold px-4 py-2 rounded border ${market.outcome === 'YES' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                            SONUÇ: {market.outcome === 'YES' ? 'EVET' : 'HAYIR'}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Tablar */}
                        <div className="flex border-b border-slate-600 mb-6">
                            <button onClick={() => setMode('BUY')} className={`flex-1 pb-2 font-bold text-sm ${mode === 'BUY' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>AL</button>
                            <button onClick={() => setMode('SELL')} className={`flex-1 pb-2 font-bold text-sm ${mode === 'SELL' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>SAT</button>
                        </div>
                        
                        {/* Taraf Seçimi */}
                        <div className="flex bg-slate-900 rounded-lg p-1 mb-6">
                            <button onClick={() => setSelectedSide('YES')} className={`flex-1 py-3 rounded-md font-bold text-sm transition-all ${selectedSide === 'YES' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>EVET (%{currentYesPrice.toFixed(1)})</button>
                            <button onClick={() => setSelectedSide('NO')} className={`flex-1 py-3 rounded-md font-bold text-sm transition-all ${selectedSide === 'NO' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>HAYIR (%{(100-currentYesPrice).toFixed(1)})</button>
                        </div>

                        {/* Input */}
                        <div className="mb-4">
                            <label className="text-xs text-gray-400 block mb-1">{mode === 'BUY' ? 'Yatırılacak (TP)' : 'Satılacak (Adet)'}</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-white font-mono text-xl outline-none focus:border-blue-500" />
                            {mode === 'SELL' && (
                                <div className="text-xs text-right text-gray-400 mt-1 cursor-pointer hover:text-white" onClick={() => setAmount(selectedSide === 'YES' ? position.shares_yes : position.shares_no)}>
                                    Maksimum: {selectedSide === 'YES' ? position.shares_yes : position.shares_no}
                                </div>
                            )}
                        </div>

                        {/* Özet ve Buton */}
                        <div className="bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700/50">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-400 text-sm">{mode === 'BUY' ? 'Tahmini Alınacak:' : 'Tahmini Kazanılacak:'}</span>
                                <span className={`font-bold font-mono text-xl ${mode === 'BUY' ? 'text-blue-400' : 'text-green-400'}`}>
                                    {estimatedOutput.toLocaleString()} {mode === 'BUY' ? 'Adet' : 'TP'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                                * %2 işlem ücreti ve fiyat kayması dahildir.
                            </div>
                        </div>

                        <button onClick={handleTransaction} disabled={processing || !user} className={`w-full font-bold py-4 rounded-lg transition-all shadow-lg ${processing ? 'opacity-50 cursor-not-allowed' : ''} ${mode === 'BUY' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-slate-600 hover:bg-slate-500 shadow-slate-900/20'}`}>
                            {processing ? 'İşleniyor...' : (mode === 'BUY' ? 'EMRİ GÖNDER' : 'SATIŞ YAP')}
                        </button>
                    </>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}