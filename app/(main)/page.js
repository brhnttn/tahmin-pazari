import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
export const dynamic = 'force-dynamic';

// 1. Supabase İstemcisi Oluştur (Veri okumak için)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 2. Verileri Sunucuda Çek (Server Component)
// Next.js'in güzelliği: Bu işlem sunucuda olur, kullanıcı beklemez.
async function getMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false }); // En yeni en üstte

  if (error) {
    console.error('Veri çekme hatası:', error);
    return [];
  }
  return data;
}

export default async function Home() {
  const markets = await getMarkets();

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      {/* HERO SECTION */}
      <header className="py-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Geleceği Tahmin Et.
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Türkiye'nin gündemindeki olaylara tahmin yap, puanlarını katla ve liderlik tablosunda yüksel.
        </p>
      </header>

      {/* MARKET LİSTESİ */}
      <main className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets.map((market) => {
          // Fiyat Hesaplama (AMM Mantığı)
          // Fiyat = Pool / (Pool_Yes + Pool_No)
          const totalPool = market.pool_yes + market.pool_no;
          const yesPrice = (market.pool_yes / totalPool) * 100; // Yüzdeye çevir
          const noPrice = (market.pool_no / totalPool) * 100;

          return (
            <Link key={market.id} href={`/market/${market.id}`} className="group">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-900/20 h-full flex flex-col">
                
                {/* Görsel Alanı */}
                <div className="h-40 bg-slate-700 relative overflow-hidden">
                  {market.image_url ? (
                    <img src={market.image_url} alt={market.question} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">Görsel Yok</div>
                  )}
                  {market.is_resolved && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                        <span className={`text-xl font-bold px-4 py-2 rounded-lg border-2 ${market.outcome === 'YES' ? 'text-emerald-400 border-emerald-400' : 'text-red-400 border-red-400'}`}>
                            {market.outcome === 'YES' ? 'EVET' : 'HAYIR'} KAZANDI
                        </span>
                    </div>
                 )}
                  <div className="absolute top-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-xs font-bold text-white backdrop-blur">
                    YENİ
                  </div>
                </div>

                {/* İçerik */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-100 mb-2 leading-tight group-hover:text-blue-400 transition-colors">
                      {market.question}
                    </h2>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                      {market.description}
                    </p>
                  </div>

                  {/* Oranlar (Bar Çubuğu) */}
                  <div className="space-y-3">
                    {/* EVET Barı */}
                    <div className="relative h-10 bg-slate-700/50 rounded-lg overflow-hidden flex items-center px-3 justify-between group/bar">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 w-0 transition-all duration-1000"
                        style={{ width: `${yesPrice}%` }} // Dinamik Genişlik
                      ></div>
                      <span className="relative z-10 text-sm font-bold text-emerald-400">EVET</span>
                      <span className="relative z-10 text-sm font-bold text-white">%{yesPrice.toFixed(0)}</span>
                    </div>

                    {/* HAYIR Barı */}
                    <div className="relative h-10 bg-slate-700/50 rounded-lg overflow-hidden flex items-center px-3 justify-between">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-500/20 w-0 transition-all duration-1000"
                        style={{ width: `${noPrice}%` }}
                      ></div>
                      <span className="relative z-10 text-sm font-bold text-red-400">HAYIR</span>
                      <span className="relative z-10 text-sm font-bold text-white">%{noPrice.toFixed(0)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </Link>
          );
        })}
      </main>
      
    </div>
  );
}