import React, { useContext, useEffect, useRef, useState } from "react";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import { ClipLoader } from "react-spinners";
import "chart.js/auto";
import { showMessage } from "@lib/showMessage/showMessage";
import { SearchResult } from "@lib/server/search";
import SearchCard from "@components/SearchCard";
import { Settings, getSettings } from "@lib/server/user";
import Link from "next/link";

interface SearchProps {
  session: User;
  settings: Settings;
}

export default function SettingsPage(props: SearchProps) {
  const { currentUser, showLoading, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  const [hideTrades, setHideTrades] = useState<boolean>(
    !props?.settings?.show_trades
  );

  const loadingRef = useRef(false);

  const toggleTrades = () => {
    setHideTrades((previous) => !previous);
  };

  const updateSettings = async (e) => {
    e.preventDefault();
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
          show_trades: !hideTrades,
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
    <SidebarWrapper>
      <main className="h-full w-full py-6 px-4">
        <div className="md:text-base text-sm text-left mt-4 mr-4">
          <label className="text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={hideTrades}
              onChange={toggleTrades}
              className="mr-2"
            />
            Hide your trades from other users (will still be visible for you)
          </label>
        </div>
        <button
          className="bg-customPink-light hover:bg-customPink-dark transition rounded duration-300 w-60 py-3 mt-6"
          onClick={updateSettings}
        >
          <span className="text-lg font-semibold text-white">
            Update Settings
          </span>
        </button>
        <Link href="/api/auth/logout">
          <div className="bg-customPink-light hover:bg-customPink-dark text-center transition rounded duration-300 w-60 py-3 mt-6">
            <span className="text-lg font-semibold text-white">
              Log Out
            </span>
          </div>
        </Link>
      </main>
    </SidebarWrapper>
  );
}

export const getServerSideProps = async (context) => {
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    // Handles redirect
    return pulledUser;
  }

  try {
    const pulledSettings = await getSettings(pulledUser.props.session.user_id);
    return {
      props: {
        session: pulledUser.props.session,
        settings: pulledSettings,
      },
    };
  } catch (e) {
    console.log(e?.message);
    return {
      props: {
        session: pulledUser.props.session,
        settings: null,
      },
    };
  }
};
