import React, { useContext, useEffect, useRef, useState } from "react";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import { ClipLoader } from "react-spinners";
import "chart.js/auto";
import { showMessage } from "@lib/showMessage/showMessage";
import { SearchResult } from "@lib/server/search";
import SearchCard from "@components/SearchCard";
import { Settings, getSettingsAndSubscriptionStatus } from "@lib/server/user";
import Link from "next/link";
import { SwatchesPicker } from "react-color";
import { format, parseISO } from "date-fns";
import { LINKS } from "@constants/constants";
import SEO from "@components/SEO";

interface SearchProps {
  session: User;
  settings: Settings;
  isSubscribed: boolean;
  hasStripeCustomerId: boolean;
  username: string;
  picture: string;
  joined: string;
  error?: string;
}

export default function SettingsPage(props: SearchProps) {
  const { currentUser, showLoading, setCurrentUser, openSubscribeModal } =
    useCurrentUser();
  setCurrentUser(props.session);

  const [colorFlare, setColorFlare] = useState(props?.settings?.color_flare);

  const loadingRef = useRef(false);

  const [hideTrades, setHideTrades] = useState<boolean>(
    !props?.settings?.show_trades
  );

  // End of hooks

  if (props.error) {
    return (
      <>
        <SEO title={`Settings`} />
        <SidebarWrapper>
          <main className="h-full w-full py-6 px-4">
            <div className="text-red-400 font-semibold mt-8 text-center break-words">
              We encountered an issue loading your settings. Try logging out and
              logging back in. If this issue persists, join our{" "}
              <Link
                target="_blank"
                rel="noopener noreferrer"
                href={LINKS.Discord}
                className="text-blue-500 hover:text-blue-600 underline transition duration-300"
              >
                Discord community
              </Link>{" "}
              and we'll sort it out.
              <br />
              <br />
              {JSON.stringify(props.session)}
              <br />
              <br />
              {JSON.stringify(props.error)}
            </div>
            <Link href="/api/auth/logout">
              <div className="bg-customPink-light hover:bg-customPink-dark text-center transition rounded duration-300 w-60 py-3 mt-12">
                <span className="text-lg font-semibold text-white">
                  Log Out
                </span>
              </div>
            </Link>
          </main>
        </SidebarWrapper>
      </>
    );
  }

  const formattedJoinDate = format(
    parseISO(props.joined),
    "MMMM do, yyyy 'at' h:mma"
  );

  const handleChangeComplete = (color) => {
    if (props.isSubscribed) {
      const newHex = color?.hex;
      if (!newHex) {
        return;
      }
      setColorFlare(newHex);
      updateSettings({ colorFlare: newHex });
    }
  };

  const toggleTrades = () => {
    const newTradeState = !hideTrades;
    setHideTrades((previous) => !previous);
    updateSettings({ showTrades: !newTradeState });
  };

  const updateSettings = async (settings: { showTrades?; colorFlare? }) => {
    const { showTrades, colorFlare } = settings;

    if (loadingRef.current) {
      return;
    }
    showLoading(true);
    loadingRef.current = true;
    try {
      const response = await fetch(`/api/update_settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          show_trades: showTrades,
          color_flare: colorFlare,
        }),
      });
      const responseJSON = await response.json();
      if (responseJSON.error) {
        throw new Error(responseJSON.error);
      }
      showMessage(responseJSON.data);
    } catch (e) {
      showMessage(e?.message, true);
    } finally {
      showLoading(false);
      loadingRef.current = false;
    }
  };

  return (
    <>
      {" "}
      <SEO title={`Settings`} />
      <SidebarWrapper>
        <main className="h-full w-full py-6 px-4">
          <div className="md:text-base text-sm text-left mt-4 mr-4">
            <h1 className="text-white font-bold text-2xl mb-2">Privacy</h1>
            <label className="text-gray-300 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={hideTrades}
                onChange={toggleTrades}
                className="mr-2 h-3 w-3"
              />
              Hide your trades from other users (will still be visible to you)
            </label>
            <h1 className="text-white font-bold text-2xl mb-2 mt-12">
              Appearance
            </h1>
            <div className="relative w-max rounded">
              <SwatchesPicker
                color={colorFlare}
                onChangeComplete={handleChangeComplete}
                className="mb-4"
              />
              {!props.isSubscribed && (
                <button
                  onClick={openSubscribeModal}
                  className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur flex items-center justify-center p-4 text-center"
                >
                  <span className="text-white font-bold hover:opacity-70 underline">
                    Please support osu! capital to activate your color flare 🙏
                  </span>
                </button>
              )}
            </div>
            <div className="flex items-center">
              <img
                src={props.picture}
                alt={props.username}
                className="rounded mr-5 h-14 w-14"
              />
              <div>
                <h1 className=" font-semibold text-lg text-white">
                  <span
                    style={
                      {
                        "--glow-from-color": props.isSubscribed
                          ? colorFlare
                          : undefined,
                        "--glow-to-color": props.isSubscribed
                          ? colorFlare
                          : undefined,
                      } as any
                    }
                    className={props.isSubscribed ? "glow" : ""}
                  >
                    {props.username}
                  </span>
                </h1>
                <h2>
                  <p className="text-gray-300 text-xs">
                    Joined: {formattedJoinDate}
                  </p>
                </h2>
              </div>
            </div>
            <h1 className="text-white font-bold text-2xl mb-2 mt-12">
              Support osu! capital
            </h1>
            <h2
              className={`${
                props.isSubscribed ? "text-green-400" : "text-red-400"
              } font-semibold mb-4`}
            >
              Supporter status:{" "}
              {props.isSubscribed ? "Active 😊" : "Not Active 😭"}
            </h2>
            {!props.isSubscribed && (
              <div className="">
                <button
                  className="text-gray-300 text-sm underline hover:opacity-60 transition duration-300 block"
                  onClick={openSubscribeModal}
                >
                  Click here to support osu! capital
                </button>
              </div>
            )}
            {props.hasStripeCustomerId && (
              <div className="">
                <Link
                  className="text-gray-300 text-sm underline hover:opacity-60 transition duration-300 block"
                  href={"/api/stripe/billing_portal"}
                >
                  Click here to manage billing
                </Link>
              </div>
            )}
          </div>

          <Link href="/api/auth/logout">
            <div className="bg-customPink-light hover:bg-customPink-dark text-center transition rounded duration-300 w-60 py-3 mt-12">
              <span className="text-lg font-semibold text-white">Log Out</span>
            </div>
          </Link>
        </main>
      </SidebarWrapper>
    </>
  );
}

export const getServerSideProps = async (context) => {
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    // Handles redirect
    return pulledUser;
  }

  try {
    const pulledInfo = await getSettingsAndSubscriptionStatus(
      pulledUser.props.session.user_id
    );

    if (!pulledInfo.username || !pulledInfo.joined_datetime) {
      console.log("Something catastrophic happened. Logging out");
      context.res.setHeader(
        "Set-Cookie",
        "userSession=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    console.log(JSON.stringify(pulledInfo));
    return {
      props: {
        session: pulledUser.props.session,
        settings: pulledInfo.settings,
        isSubscribed: pulledInfo.isSubscribed,
        hasStripeCustomerId: !!pulledInfo.stripeCustomerId,
        username: pulledInfo.username,
        picture: pulledInfo.picture,
        joined: pulledInfo.joined_datetime,
      },
    };
  } catch (e) {
    console.log(e?.message);

    return {
      props: {
        session: pulledUser.props.session,
        error: e?.message,
        settings: null,
      },
    };
  }
};
