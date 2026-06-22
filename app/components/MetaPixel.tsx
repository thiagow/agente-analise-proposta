"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    if (typeof window !== "undefined" && (window as any).fbq) {
      if (pathname === "/formulario") {
        (window as any).fbq("track", "AcessouFormulario");
      } else if (pathname === "/") {
        (window as any).fbq("track", "InicioAgenteAnalista");
      }
    }
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '885762810795367');
          fbq('track', 'PageView');
          ${pathname === "/" ? "fbq('track', 'InicioAgenteAnalista');" : ""}
          ${pathname === "/formulario" ? "fbq('track', 'AcessouFormulario');" : ""}
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=885762810795367&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
    </>
  );
}
