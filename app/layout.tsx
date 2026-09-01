import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPIP Debit Updater",
  description: "Panel kontrol update Google Sheets SPIP (Debit, UE, KK, Acquirer, Prop Channel)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
