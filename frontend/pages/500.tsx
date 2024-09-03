import Link from "next/link";
import React from "react";
import { NextPageContext } from "next";
import styles from "./index.module.css";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const goBack = () => {
    router.back();
  };

  return (
    <main className={styles.backgroundtrianglewithformatting}>
      <h1 className="text-9xl font-semibold mb-8 text-white">Oops!</h1>
      <h2 className="text-lg md:text-xl lg:text-2xl font-medium text-gray-300">
        Internal server error
      </h2>
      {/* Go Back Link */}
      <button
        onClick={goBack}
        className="bg-customPink-light hover:bg-customPink-dark transition rounded duration-300 px-16 py-4 mt-8"
      >
        <span className="text-xl font-semibold text-white">Go Back</span>
      </button>

      {/* Go Home Link */}
      <Link
        className="bg-customPink-light hover:bg-customPink-dark transition rounded duration-300 px-16 py-4 mt-4"
        href="/"
      >
        <span className="text-xl font-semibold text-white">Go Home</span>
      </Link>
    </main>
  );
}
