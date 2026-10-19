import type { AppProps } from "next/app";
import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // PWA-ready: register the (minimal) service worker in production only.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — SW is optional in the MVP */
      });
    }
  }, []);

  return <Component {...pageProps} />;
}
