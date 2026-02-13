import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Tahmin Pazarı',
  description: 'Geleceği Tahmin Et, Kazan.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      {/* suppressHydrationWarning hatayı önler, className fontu yükler */}
      <body className={inter.className} suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}