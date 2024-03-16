import Link from "next/link";
import React from "react";

import styles from "./index.module.css";
import { COOKIES, LIMIT, LINKS, SETTINGS } from "@constants/constants";
import CountdownTimer from "@components/CountdownTimer";
import { FaHeart } from "react-icons/fa";

export default function Home() {
  return (
    <main className={styles.backgroundtriangle}>
      <h1 className="text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold mb-8 text-white">
        osu! capital
      </h1>
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-300">
        a stock market for osu! players
      </h2>

      <CountdownTimer targetDate={LIMIT.SeasonOpenDate} />

      <Link
        className="bg-purple-800 hover:bg-purple-900 transition rounded-lg shadow-lg duration-300 w-72 py-4 mt-6"
        href={LINKS.Discord}
      >
        <span className="text-2xl font-semibold text-white">Join Discord</span>
      </Link>
      <Link
        className="transition rounded-lg duration-300 mt-6"
        href="https://ko-fi.com/osucapital/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="hover:underline text-sm font-semibold flex justify-center items-center text-white">
          Donate <FaHeart size={12} className="ml-2" />
        </span>
      </Link>
    </main>
  );
}

export function getServerSideProps(context) {
  const userSession = context.req.cookies[COOKIES.userSession];
  if (userSession && !SETTINGS.Maintenance) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
