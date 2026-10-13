import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nasi Katok 3 Abdul | Sistem Pesanan",
  description: "Sistem pesanan Nasi Katok 3 Abdul",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ms"><body>{children}</body></html>;
}
