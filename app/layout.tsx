import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: "Parts AI — автозапчасти без лишнего",
  description: "Поиск, подбор и заказ автозапчастей",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <CartProvider>
          <Header />
          <main className="shell">{children}</main>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
