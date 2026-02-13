import Navbar from '@/components/Navbar';

export default function MainLayout({ children }) {
  return (
    <>
      {/* Sadece Navbar ve Sayfa İçeriği */}
      <Navbar />
      {children}
    </>
  );
}