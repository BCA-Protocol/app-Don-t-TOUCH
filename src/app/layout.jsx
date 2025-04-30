"use client";
import Header from "@/components/header";
import SideBar from "@/components/SideBar";
import { usePathname } from "next/navigation";
import "./globals.css";
import { Open_Sans, Roboto_Mono } from "next/font/google";
import clsx from "clsx";
import Script from "next/script";

const open_sans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
});

const roboto_mono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
  weight: "700",
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const publicPages = ["/signup", "/", "/reset-password"];
  const isPublicPage = publicPages.includes(pathname);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={clsx(
        "h-full scroll-smooth antialiased",
        open_sans.variable,
        roboto_mono.variable
      )}
    >
      <head>
        <title>BCA Protocol app</title>
        <meta name="description" content="BCA Protocol app" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180I hax180" href="/favicon.png" />
        <meta name="theme-color" content="#ffffff" />
        {/* GTM Script */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-WVQ3KSLP');
          `,
          }}
        />
        {/* Blockchain Analytics Script */}
        <Script
          id="blockchain-analytics-script"
          src="https://analytics.blockchain-ads.com/script.js"
          data-website-id="1e5b0721-a275-46d6-9bc7-7fda4f8b92d0"
          strategy="afterInteractive"
        />
        {/* Cookie3 Analytics Script */}
        <Script
          src="https://cdn.markfi.xyz/scripts/analytics/0.11.24/cookie3.analytics.min.js"
          integrity="sha384-ihnQ09PGDbDPthGB3QoQ2Heg2RwQIDyWkHkqxMzq91RPeP8OmydAZbQLgAakAOfI"
          crossOrigin="anonymous"
          async
          strategy="lazyOnload"
          site-id="d5bd7afc-d179-4a2a-a949-0dc31d50279a"
        />
      </head>
      <body className="relative flex flex-col h-full bg-black">
        {/* GTM noscript */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WVQ3KSLP"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {!isPublicPage && (
          <>
            <Header />
            <SideBar currentPath={pathname} />
            <main className="lg:pl-64">
              <div>{children}</div>
            </main>
          </>
        )}
        {isPublicPage && (
          <main>
            <div>{children}</div>
          </main>
        )}
      </body>
    </html>
  );
}
