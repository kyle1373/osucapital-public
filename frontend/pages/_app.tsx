import { AppProps } from "next/app";
import React, { useEffect } from "react";
import "../styles/globals.css";
import { UserProvider } from "@hooks/UserContext";
import Chart from "chart.js/auto";
import NProgress from "nprogress";
import "nprogress/nprogress.css"; // This is the default style
import { useRouter } from "next/router";
import "@styles/nprogress-custom.css";
import "react-tooltip/dist/react-tooltip.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SETTINGS } from "@constants/constants";
import Script from "next/script";
import Maintenance from "./maintenance";
import store from "@redux/store";
import { Provider } from "react-redux";
import { activatePageCache } from "@hooks/usePageCache";

function MyApp({ Component, pageProps }) {
  Chart.defaults.font.family = "Poppins, sans-serif";

  const router = useRouter();
  const isHomePage = router.pathname === "/";

  useEffect(() => {
    const handleStart = () => NProgress.start();
    const handleStop = () => NProgress.done();

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleStop);
    router.events.on("routeChangeError", handleStop);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleStop);
      router.events.off("routeChangeError", handleStop);
    };
  }, [router]);

  activatePageCache();


  return (
    <UserProvider>
      <title>osu! capital</title>
      {SETTINGS.Maintenance && !isHomePage ? (
        <Maintenance />
      ) : (
        <Component {...pageProps} />
      )}
      {process.env.NODE_ENV === "production" && (
        <>
          <Script
            async
            src="https://umami.osucapital.com/script.js"
            data-website-id="3c872e61-9b47-4b09-9c18-8ea1ab874fe0"
          />
          <Script
            async
            src="https://stats.superfx.dev/script.js"
            data-website-id="e89e20fe-b1a4-4e6c-a118-674c20846118"
          />
        </>
      )}
    </UserProvider>
  );
}


export default function App(props: AppProps) {
  return (
    <Provider store={store}>
      <MyApp {...props} />
    </Provider>
  );
}