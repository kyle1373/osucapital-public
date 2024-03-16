import App from "next/app";
import React, { useEffect } from "react";
import "../styles/globals.css";
import { UserProvider } from "@hooks/UserContext";
import Chart from "chart.js/auto";
import NProgress from "nprogress";
import "nprogress/nprogress.css"; // This is the default style
import { useRouter } from "next/router";
import "@styles/nprogress-custom.css";
import 'react-tooltip/dist/react-tooltip.css'
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SETTINGS } from "@constants/constants";
import styles from "./index.module.css";
import Maintenance from "./maintenance";

function MyApp({ Component, pageProps }) {
  Chart.defaults.font.family = "Poppins, sans-serif";

  const router = useRouter();
  const isHomePage = router.pathname === '/';

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

  return (
    <UserProvider>
      <title>osu! capital</title>
      {SETTINGS.Maintenance && !isHomePage ? <Maintenance/> : <Component {...pageProps} />}
      <Analytics />
      <SpeedInsights />
    </UserProvider>
  );
}

export default MyApp;