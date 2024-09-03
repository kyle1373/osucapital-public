import { LINKS } from "@constants/constants";
import Link from "next/link";

export default function ImportantNoticeCard() {
  return (
    <div className="rounded-lg w-full bg-green-950 border-green-900 border-2 items-center justify-center overflow-hidden mb-4">
      <div className="justify-center items-center bg-green-900 p-2">
        <h1 className="text-lg text-white font-semibold text-center px-8">
          This season has concluded. Thanks for playing!
        </h1>
      </div>

      <div className="p-2 text-white">
        If you placed in the top 10,{" "}
        <Link
          className=" text-sky-200 transition hover:text-sky-300 underline duration-300"
          href={LINKS.Discord}
        >
          {" "}
          message superfx64 on Discord to claim your prize!
        </Link>
      </div>
      <div className="p-2 mt-4 text-white">
        The next season will begin on May 10th, 2024 at 4pm UTC. See you there!
      </div>
    </div>
  );
}
