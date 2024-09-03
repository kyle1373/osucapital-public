import Link from "next/link";
import React from "react";

import styles from "./index.module.css";
import { COOKIES, LIMIT, LINKS, SETTINGS } from "@constants/constants";
import CountdownTimer from "@components/CountdownTimer";
import SEO from "@components/SEO";
import Image from "next/image";
import CountUp from "react-countup";
import { getNumUsers } from "@lib/server/user";

type HomeProps = {
  showDashThumbnail: boolean;
  numUsers: number;
};

export default function Home(props: HomeProps) {
  const MobileView = (props) => (
    <div className="xl:hidden text-center p-10">
      <h1 className="text-4xl font-semibold text-white">osu! capital</h1>
      <h2 className="text-xl font-medium text-gray-300 mb-6">
        an osu! stock market
      </h2>
      <p className="text-gray-400 mt-4 font-medium text-sm mb-20">
        Invest fake currency into osu! player stocks. If their performance in
        osu! goes up, so does their stock price and your coin total. Compete on
        the global rankings for prizes, badges, and more!
      </p>
      <div className="flex flex-col space-y-4">
        <Link href="/api/auth/osu" legacyBehavior>
          <a className="bg-customPink-light hover:bg-customPink-dark transition rounded-lg shadow-lg duration-300 py-4">
            <span className="text-xl text-white font-semibold">Enter</span>
          </a>
        </Link>
        <Link href={LINKS.Discord} legacyBehavior>
          <a className="bg-purple-600 hover:bg-purple-700 transition rounded-lg shadow-lg duration-300 py-4">
            <span className="text-xl text-white font-semibold">Discord</span>
          </a>
        </Link>
      </div>
      <CountUp
        start={0}
        end={props.numUsers ?? 10000}
        duration={2.75}
        delay={0}
      >
        {({ countUpRef }) => (
          <div className="text-white font-medium mt-6">
            {/* This doesnt work for ipad. Just hardcoding without the ref for now. TODO: Maybe fix this? */}
            Join <span className="font-bold">{props.numUsers ?? 10000}</span>{" "}
            osu! players today!
          </div>
        )}
      </CountUp>
    </div>
  );

  const DesktopView = (props) => (
    <div className="w-[1200px] hidden xl:flex flex-row pl-10 pr-10 mt-20 mx-auto">
      <div className="w-[500px] pt-10">
        <h1 className="text-7xl font-semibold mb-1 text-white">osu! capital</h1>
        <h2 className="text-2xl font-medium text-gray-300">
          an osu! stock market
        </h2>
        <p className="text-gray-400 mt-6 font-medium text-sm mb-20">
          Invest fake currency into osu! player stocks. If their performance in
          osu! goes up, so does their stock price and your coin total. Compete
          on the global rankings for prizes, badges, and more!
        </p>
        <div className="flex gap-4 mb-3">
          <Link href="/api/auth/osu" legacyBehavior>
            <a className="flex bg-customPink-light hover:bg-customPink-dark transition rounded-lg shadow-lg duration-300 w-48 py-4 justify-center">
              <span className="text-xl text-center font-semibold text-white">
                Enter
              </span>
            </a>
          </Link>
          <Link href={LINKS.Discord} legacyBehavior>
            <a className="flex bg-purple-600 hover:bg-purple-700 transition rounded-lg shadow-lg duration-300 w-48 py-4 justify-center items-center">
              <span className="text-xl font-semibold text-white items-center">
                Discord
              </span>
            </a>
          </Link>
        </div>
        <CountUp
          start={0}
          end={props.numUsers ?? 10000}
          duration={2.75}
          delay={0}
        >
          {({ countUpRef }) => (
            <span className="text-white font-medium">
              {" "}
              {/* This doesnt work for ipad. Just hardcoding without the ref for now. TODO: Maybe fix this? */}
              Join <span className="font-bold">{props.numUsers ?? 10000}</span>{" "}
              osu! players today!
            </span>
          )}
        </CountUp>
      </div>
      <div>
        <img
          src={"/images/mockup.png"}
          alt={"osu! capital mockup"}
          width={700}
          className={`${styles.hoverAnim} justify-center`}
        />
      </div>
    </div>
  );
  return (
    <>
      <SEO isImageBig={true} />
      <main
        className={`${styles.backgroundtriangle} flex flex-col min-h-screen`}
      >
        <div className="flex-grow">
          <MobileView numUsers={props.numUsers} />
          <DesktopView numUsers={props.numUsers} />
        </div>
        <div className="text-xs text-gray-400 font-light p-4">
          <h1>
            Data subject to osu!'s{" "}
            <a className="underline" href={LINKS.OsuTermsOfService}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a className="underline" href={LINKS.OsuPrivacyPolicy}>
              Privacy Policy
            </a>
          </h1>
          <h1>
            Contact:{" "}
            <a className="underline" href={`mailto:${LINKS.OsuCapitalEmail}`}>
              {LINKS.OsuCapitalEmail}
            </a>
          </h1>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps(context) {
  const { query } = context;
  const userSession = context.req.cookies[COOKIES.userSession];
  if (userSession && !SETTINGS.Maintenance) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const showDashThumbnail = query.thumbnail === "dashboard";

  const numUsers = await getNumUsers();

  return {
    props: { showDashThumbnail, numUsers },
  };
}
