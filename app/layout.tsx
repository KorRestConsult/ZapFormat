import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Parts AI",
  description: "Подбор и заказ автозапчастей"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="header">
          <Link className="brand" href="/">PARTS<span>AI</span></Link>
          <nav>
            <Link href="/garage">Гараж</Link>
            <Link href="/orders">Заказы</Link>
            <Link href="/cart">Корзина</Link>
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
