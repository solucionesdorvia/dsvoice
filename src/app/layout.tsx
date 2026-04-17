import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Image from "next/image";
import Link from "next/link";

import { partner } from "@/lib/partner";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: `DS SAFETY VOICE · ${partner.name}`,
    template: `%s · DS SAFETY VOICE`,
  },
  description: `Muestra de funcionamiento DS SAFETY VOICE. Dos buscadores: Dräger VOICE (sustancias) y catálogo DS SAFETY (productos).`,
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: "#0B2748",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-[15px] text-foreground antialiased`}
      >
        <header className="border-b border-border/60 bg-background">
          <div className="container flex min-h-14 items-center justify-between py-2">
            <Link
              href="/"
              className="relative flex shrink-0 items-center"
              aria-label="DS safety — Inicio"
            >
              <Image
                src="/logo-ds-safety.png"
                alt="DS safety — Seguridad e Higiene"
                width={200}
                height={48}
                className="h-10 w-auto max-w-[min(100%,220px)] object-contain object-left"
                priority
              />
            </Link>
            <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:gap-4">
              <Link href="/" className="hover:text-brand">
                Inicio
              </Link>
              <Link href="/voice" className="hover:text-brand">
                Dräger VOICE
              </Link>
              <Link href="/catalogo-safety" className="hover:text-brand">
                Catálogo DS SAFETY
              </Link>
              <Link href="/about" className="hover:text-brand">
                Acerca de
              </Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-16 border-t border-border/60">
          <div className="container flex flex-col gap-2 py-6 text-xs text-muted-foreground">
            <p>
              <strong className="font-medium text-foreground/80">
                Implementado por {partner.name}.
              </strong>
              {partner.catalogUrl ? (
                <>
                  {" "}
                  <a
                    href={partner.catalogUrl}
                    className="text-brand underline-offset-2 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {partner.catalogLabel}
                  </a>
                </>
              ) : null}
            </p>
            <p>
              <strong className="font-medium text-foreground/80">
                Desarrollado por Dorvia.
              </strong>
            </p>
            <p className="text-[11px] text-muted-foreground/90">
              © {new Date().getFullYear()} {partner.name} · Muestra de
              funcionamiento DS SAFETY VOICE
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
