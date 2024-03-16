import { LINKS } from "@constants/constants";
import Link from "next/link";
import styles from "./index.module.css";

export default function Maintenance() {
  return (
    <main className={styles.backgroundtriangle}>
      <h1 className="text-4xl font-semibold mb-8 text-white">
        osu! capital is currently undergoing maintenance
      </h1>
      <h2 className="text-2xl font-medium text-gray-300">
        {"we'll be back shortly!"}
      </h2>
      <Link
        className="bg-purple-800 hover:bg-purple-900 transition rounded-lg shadow-lg duration-300 w-72 py-4 mt-10"
        href={LINKS.Discord}
      >
        <span className="text-2xl font-semibold text-white">Join Discord</span>
      </Link>
    </main>
  );
}
