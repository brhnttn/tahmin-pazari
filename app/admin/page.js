'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState([]);
  
  // Form Verileri
  const [formData, setFormData] = useState({
    question: '', 
    description: '', 
    end_date: '', 
    image_url: '',
    initial_liquidity: 1000 
  });

  useEffect(() => {
    fetchMarkets();
  }, []);

  async function fetchMarkets() {
    const { data } = await supabase.from('markets').select('*').order('created_at', { ascending: false });
    setMarkets(data || []);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // --- GÜVENLİ BAŞLANGIÇ STRATEJİSİ (50/50) ---
    const totalLiquidity = Number(formData.initial_liquidity);
    const poolPart = totalLiquidity / 2; 
    const k = poolPart * poolPart; 

    const { error } = await supabase.from('markets').insert({
        question: formData.question,
        description: formData.description,
        end_date: new Date(formData.end_date).toISOString(),
        image_url: formData.image_url,
        
        pool_yes: poolPart, 
        pool_no: poolPart, 
        liquidity_parameter: k,
        
        outcome: null, 
        is_resolved: false
      });

    if (error) alert('Hata: ' + error.message);
    else {
      alert(`Piyasa 50/50 oranında, toplam ${totalLiquidity} TP likidite ile açıldı!`);
      setFormData({ question: '', description: '', end_date: '', image_url: '', initial_liquidity: 1000 });
      fetchMarkets();
    }
    setLoading(false);
  };

  const handleResolve = async (marketId, outcome) => {
    if(!confirm(`Bu piyasayı "${outcome}" olarak bitirmek istediğine emin misin?`)) return;
    const { data, error } = await supabase.rpc('resolve_market', { p_market_id: marketId, p_outcome: outcome });
    if(error) alert("Hata: " + error.message);
    else { alert(`İşlem Tamam! Dağıtılan ödül: ${data.total_payout} TP`); fetchMarkets(); }
  };

  // --- PLATFORM SIFIRLAMA FONKSİYONU ---
  const handleResetPlatform = async () => {
    if(confirm("DİKKAT! 🚨\n\n- Tüm piyasalar SİLİNECEK.\n- Tüm işlem geçmişi ve pozisyonlar SİLİNECEK.\n- Tüm kullanıcı bakiyeleri 1000 TP'ye SIFIRLANACAK.\n\nBu işlem geri alınamaz. Onaylıyor musun?")) {
        const { data, error } = await supabase.rpc('reset_platform');
        
        if(error) {
            alert("Hata: " + error.message);
        } else {
            alert(data); // SQL'den dönen "Başarıyla sıfırlandı" mesajı
            window.location.reload(); // Sayfayı yenile ki liste temizlensin
        }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-10 font-sans pb-20">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* SOL: GÜVENLİ EKLEME FORMU */}
        <div className="bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-700 h-fit">
            <h1 className="text-2xl font-bold mb-6 text-blue-400">Yeni Piyasa Ekle</h1>
            <div className="mb-4 text-xs bg-blue-900/30 text-blue-200 p-3 rounded border border-blue-900">
                ℹ️ Güvenlik gereği tüm piyasalar <b>%50 - %50</b> dengeli oranla başlatılır. Fiyatı kullanıcılar belirler.
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="text-sm text-gray-400">Soru</label><input required className="w-full bg-slate-900 p-2 rounded border border-slate-600" value={formData.question} onChange={e=>setFormData({...formData, question: e.target.value})} /></div>
                <div><label className="text-sm text-gray-400">Açıklama</label><textarea required className="w-full bg-slate-900 p-2 rounded border border-slate-600" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} /></div>
                <div><label className="text-sm text-gray-400">Resim URL</label><input className="w-full bg-slate-900 p-2 rounded border border-slate-600" value={formData.image_url} onChange={e=>setFormData({...formData, image_url: e.target.value})} /></div>
                <div><label className="text-sm text-gray-400">Bitiş Tarihi</label><input type="datetime-local" required className="w-full bg-slate-900 p-2 rounded border border-slate-600" value={formData.end_date} onChange={e=>setFormData({...formData, end_date: e.target.value})} /></div>
                
                <div>
                    <label className="text-sm text-gray-400">Başlangıç Likiditesi (TP)</label>
                    <input type="number" min="100" required className="w-full bg-slate-900 p-2 rounded border border-slate-600 font-mono text-yellow-400" value={formData.initial_liquidity} onChange={e=>setFormData({...formData, initial_liquidity: e.target.value})} />
                    <p className="text-xs text-gray-500 mt-1">Örn: 1000 yazarsan, 500 Evet / 500 Hayır olarak havuza eklenir.</p>
                </div>

                <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold mt-4 transition-all">
                    {loading ? 'Ekleniyor...' : 'Piyasayı Başlat 🚀'}
                </button>
            </form>
        </div>

        {/* SAĞ: LİSTE */}
        <div>
            <h2 className="text-2xl font-bold mb-6 text-yellow-400">Piyasa Yönetimi</h2>
            <div className="space-y-4">
                {markets.map(market => (
                    <div key={market.id} className={`p-4 rounded-lg border ${market.is_resolved ? 'bg-slate-800/50 border-gray-700 opacity-60' : 'bg-slate-800 border-slate-600'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg">{market.question}</h3>
                            {market.is_resolved && <span className="text-xs bg-gray-600 px-2 py-1 rounded">SONLANDI: {market.outcome}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mb-4">Havuz: {Math.floor(market.pool_yes)} E / {Math.floor(market.pool_no)} H</div>
                        
                        {!market.is_resolved ? (
                            <div className="flex gap-2">
                                <button onClick={() => handleResolve(market.id, 'YES')} className="flex-1 bg-emerald-900/50 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 py-2 rounded font-bold text-sm">✅ EVET KAZANDI</button>
                                <button onClick={() => handleResolve(market.id, 'NO')} className="flex-1 bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-900 py-2 rounded font-bold text-sm">❌ HAYIR KAZANDI</button>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500">Ödemeler dağıtıldı.</div>
                        )}
                    </div>
                ))}
                {markets.length === 0 && <p className="text-gray-500 italic">Henüz piyasa yok.</p>}
            </div>
        </div>
      </div>

      {/* --- YENİ EKLENEN KISIM: SIFIRLAMA ALANI --- */}
      <div className="max-w-5xl mx-auto mt-16 pt-8 border-t border-slate-700">
        <h3 className="text-xl font-bold text-red-500 mb-4 flex items-center gap-2">
            ⚠️ Geliştirici Bölgesi (Tehlikeli Alan)
        </h3>
        <div className="bg-red-900/10 border border-red-900/30 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-gray-400">
                <p className="mb-2"><strong className="text-red-400">Platformu Sıfırla:</strong> Bu işlem veritabanını temizler.</p>
                <ul className="list-disc list-inside space-y-1">
                    <li>Tüm piyasalar ve kullanıcı pozisyonları silinir.</li>
                    <li>İşlem geçmişi (Transactions) silinir.</li>
                    <li>Tüm kullanıcıların bakiyesi <b>1000 TP</b> olarak güncellenir.</li>
                    <li>Kullanıcı hesapları (üyelikler) SİLİNMEZ.</li>
                </ul>
            </div>
            
            <button 
                onClick={handleResetPlatform}
                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-red-900/20 transition-all whitespace-nowrap"
            >
                🗑️ PLATFORMU SIFIRLA
            </button>
        </div>
      </div>

    </div>
  );
}