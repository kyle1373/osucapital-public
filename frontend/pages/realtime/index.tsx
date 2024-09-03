import React, { useContext, useEffect, useRef, useState } from "react";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import { ClipLoader } from "react-spinners";
import "chart.js/auto";
import { showMessage } from "@lib/showMessage/showMessage";
import { realtimeGetLogsRequestBodyType } from "@pages/api/realtime/get_logs";
import {
  QueryRealtimeLogsReturn,
  queryRealtimeLogs,
} from "@lib/server/realtime";
import { isUserSubscribed } from "@lib/server/stripe";
import SEO from "@components/SEO";

interface RealtimeProps {
  session: User;
  isSubscribed: boolean;
  previewData?: string;
}

export default function SettingsPage(props: RealtimeProps) {
  const { currentUser, showLoading, setCurrentUser, openSubscribeModal } =
    useCurrentUser();
  setCurrentUser(props.session);

  const loadingRef = useRef(false);
  const afterIDRef = useRef(null);
  const [profileChanges, setProfileChanges] = useState(false);
  const [ppChanges, setPPChanges] = useState(true);
  const [playcountChanges, setPlaycountChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [realtimeLogs, setRealtimeLogs] = useState<QueryRealtimeLogsReturn[]>(
    props.isSubscribed ? undefined : JSON.parse(props.previewData)
  );

  const openSubscribeModalIfNotSubscribed = () => {
    if (!props.isSubscribed) {
      openSubscribeModal();
    }
  };

  const handleSearchChange = (e) => {
    if (props.isSubscribed) {
      setSearchQuery(e.target.value);
    } else {
      openSubscribeModal();
    }
  };

  const handleProfileChanges = () => {
    if (props.isSubscribed) {
      setProfileChanges(!profileChanges);
    } else {
      openSubscribeModal();
    }
  };

  const handlePPChanges = () => {
    if (props.isSubscribed) {
      setPPChanges(!ppChanges);
    } else {
      openSubscribeModal();
    }
  };

  const handlePlaycountChanges = () => {
    if (props.isSubscribed) {
      setPlaycountChanges(!playcountChanges);
    } else {
      openSubscribeModal();
    }
  };

  const getRealtimeDatetime = (realtimeLog: QueryRealtimeLogsReturn) => {
    const datetimeString: string = realtimeLog.datetime;
    const date = new Date(datetimeString); // Convert ISO string to Date object

    // Get month, date, and year parts
    const month = (date.getMonth() + 1).toString().padStart(2, "0"); // getMonth() is zero-based, add 1 to make it 1-based
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();

    // Get hours and minutes
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    // Format MM/DD/YYYY HH:MM
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  };

  const getRealtimeLogBackground = (realtimeLog: QueryRealtimeLogsReturn) => {
    var bg = "";
    if (realtimeLog.type === "pp_change") {
      const newPP = realtimeLog.changes.osu_pp.new;
      const oldPP = realtimeLog.changes.osu_pp.old;

      const newRank = realtimeLog.changes.osu_rank.new;
      const oldRank = realtimeLog.changes.osu_rank.old;

      const ppDiff = newPP - oldPP;
      const rankDiff = oldRank - newRank;

      if (rankDiff < 0) {
        bg += " bg-red-950";
      } else if (ppDiff < 25) {
        bg += " bg-green-950";
      } else if (ppDiff < 50) {
        bg += " bg-green-900";
      } else if (ppDiff < 100) {
        bg += " bg-green-800";
      } else if (ppDiff < 200) {
        bg += " bg-green-700";
      } else {
        bg += " bg-green-600";
      }
    }

    if (realtimeLog.type === "profile_change") {
      bg += " bg-yellow-950";
    }

    if (realtimeLog.type === "playcount_change") {
      bg += " bg-blue-950";
    }

    return bg;
  };

  const getRealtimeLogMessage = (realtimeLog: QueryRealtimeLogsReturn) => {
    var log = null;
    if (realtimeLog.type === "pp_change") {
      const newPP = realtimeLog.changes.osu_pp.new;
      const oldPP = realtimeLog.changes.osu_pp.old;

      const newRank = realtimeLog.changes.osu_rank.new;
      const oldRank = realtimeLog.changes.osu_rank.old;

      const ppDiff =
        newPP - oldPP >= 0
          ? "+" + (newPP - oldPP).toFixed(2) + "pp"
          : (newPP - oldPP).toFixed(2) + "pp";

      if (newRank < oldRank) {
        log =
          "ranked up from #" +
          oldRank +
          " to #" +
          newRank +
          " (" +
          ppDiff +
          ")";
      } else if (newRank === oldRank) {
        log =
          "kept their rank and " +
          (newPP - oldPP >= 0 ? " gained " : " lost ") +
          ppDiff;
      } else {
        log =
          "ranked down from #" +
          oldRank +
          " to #" +
          newRank +
          " (" +
          ppDiff +
          ")";
      }
    }

    if (realtimeLog.type === "profile_change") {
      const oldUsername = realtimeLog.changes.osu_username.old;
      const newUsername = realtimeLog.changes.osu_username.new;
      const oldPicture = realtimeLog.changes.osu_picture.old;
      const newPicture = realtimeLog.changes.osu_picture.new;

      if (oldUsername !== newUsername && oldPicture !== newPicture) {
        log =
          "changed their name from " +
          oldUsername +
          " to " +
          newUsername +
          " and updated their picture";
      } else if (oldUsername !== newUsername) {
        log = "changed their name from " + oldUsername + " to " + newUsername;
      } else {
        log = "updated their picture";
      }
    }

    if (realtimeLog.type === "playcount_change") {
      log = "has just played a map";
    }

    return log;
  };

  useEffect(() => {
    if (props.isSubscribed) {
      queryRealtimeLogs();
    }
  }, [profileChanges, playcountChanges, ppChanges]);

  const searchRealtime = (e) => {
    e.preventDefault();
    if (props.isSubscribed) {
      if (!profileChanges && !ppChanges && !playcountChanges) {
        showMessage(
          "Your filters are empty! Please activate at least 1 filter"
        );
      }
      queryRealtimeLogs();
    } else {
      openSubscribeModal();
    }
  };

  const queryRealtimeLogs = async () => {
    if (!profileChanges && !ppChanges && !playcountChanges) {
      setRealtimeLogs([]);
      return;
    }
    if (loadingRef.current) {
      return;
    }
    showLoading(true);
    loadingRef.current = true;
    setRealtimeLogs(null);
    try {
      const requestBody: realtimeGetLogsRequestBodyType = {
        profile_changes: profileChanges,
        pp_changes: ppChanges,
        playcount_changes: playcountChanges,
      };
      if (searchQuery) {
        requestBody.search_query = searchQuery;
      }

      const response = await fetch(`/api/realtime/get_logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const responseJSON = await response.json();
      if (responseJSON.error) {
        throw new Error(responseJSON.error);
      }

      setRealtimeLogs(responseJSON);
    } catch (e) {
      showMessage(e?.message, true);
    } finally {
      showLoading(false);
      loadingRef.current = false;
    }
  };

  return (
    <>
      <SEO title={`Realtime`} />
      <SidebarWrapper>
        <main className="h-full w-full py-6 px-4 text-white relative">
          <form onSubmit={searchRealtime} className="text-center">
            <div className="flex flex-wrap justify-center gap-4 items-end">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={openSubscribeModalIfNotSubscribed}
                placeholder="Search..."
                className="flex-auto rounded px-4 py-2 bg-neutral-500 placeholder:text-neutral-300 placeholder:font-medium text-white font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2 text-white rounded bg-customPink-light hover:bg-customPink-dark font-medium transition duration-300"
              >
                Submit
              </button>
            </div>
            <div className="mt-4 mb-8 flex flex-col sm:flex-row justify-center">
              <label className="flex items-center cursor-pointer text-white mr-2">
                <input
                  type="checkbox"
                  checked={ppChanges}
                  onChange={handlePPChanges}
                  className="mr-2"
                />
                Player Improvements
              </label>
              <label className="flex items-center cursor-pointer text-white mr-2">
                <input
                  type="checkbox"
                  checked={playcountChanges}
                  onChange={handlePlaycountChanges}
                  className="mr-2"
                />
                Player Activity
              </label>
              <label className="flex items-center cursor-pointer text-white">
                <input
                  type="checkbox"
                  checked={profileChanges}
                  onChange={handleProfileChanges}
                  className="mr-2"
                />
                Player Profile Updates
              </label>
            </div>
          </form>
          {realtimeLogs?.length === 0 && (
            <h1 className="text-white font-semibold text-center">
              No results found with your given filters 😔
            </h1>
          )}
          {realtimeLogs?.map((entry, index) => {
            var afterBlurIndex = 4;
            var shouldBlur = !props.isSubscribed && index >= afterBlurIndex;
            var dimAmount = "bg-opacity-0";
            var blurAmount = "backdrop-blur-none";

            var normalizedIndex = index - afterBlurIndex;
            if (normalizedIndex < 0) {
              blurAmount = "backdrop-blur-none";
              dimAmount = "bg-opacity-0";
            } else {
              switch (normalizedIndex) {
                case 0:
                  blurAmount = "backdrop-blur-sm";
                  dimAmount = "bg-opacity-30";
                  break;
                case 1:
                  blurAmount = "backdrop-blur";
                  dimAmount = "bg-opacity-40";
                  break;
                case 2:
                  blurAmount = "backdrop-blur-md";
                  dimAmount = "bg-opacity-50";
                  break;
                case 3:
                  blurAmount = "backdrop-blur-lg";
                  dimAmount = "bg-opacity-60";
                  break;
                default:
                  blurAmount = "backdrop-blur-xl";
                  dimAmount = "bg-opacity-60";
                  break;
              }
            }
            return (
              <div>
                <a
                  key={entry.osu_id + entry.datetime + entry.type}
                  onClick={openSubscribeModalIfNotSubscribed}
                  target={props.isSubscribed && "_blank"}
                  rel={!props.isSubscribed && "noopener noreferrer"}
                  href={
                    props.isSubscribed ? "/stock/" + entry.osu_id : undefined
                  }
                  className={
                    "flex items-center w-full rounded hover:opacity-70 transition duration-300 mb-4 p-4 relative cursor-pointer" +
                    getRealtimeLogBackground(entry)
                  }
                >
                  {shouldBlur && (
                    <div
                      className={
                        "absolute rounded top-0 left-0 w-full h-full bg-black " +
                        dimAmount +
                        " " +
                        blurAmount +
                        " backdrop-blur-lg z-10 flex items-center justify-center text-center px-4"
                      }
                    >
                      <div className=" p-4 font-bold rounded text-white hover:opacity-70 underline">
                        Please support osu! capital for full access 🙏
                      </div>
                    </div>
                  )}
                  <img
                    src={entry.osu_picture}
                    alt={entry.osu_name}
                    className="rounded mr-4 h-20 w-20"
                  />
                  <div className="flex flex-col justify-between">
                    <h1 className="font-bold md:text-xl text-lg">
                      {entry.osu_name + " (#" + entry.osu_rank + ")"}
                    </h1>
                    <h1 className="font-normal md:text-base text-sm">
                      {getRealtimeLogMessage(entry)}
                    </h1>
                    <h1 className="font-normal text-xs mt-2 text-gray-300">
                      {getRealtimeDatetime(entry)}
                    </h1>
                  </div>
                </a>
              </div>
            );
          })}
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
    const isSubscribed = await isUserSubscribed(
      pulledUser.props.session.user_id
    );

    if (!isSubscribed) {
      const previewData = await queryRealtimeLogs({
        searchPpChanges: true,
        searchPlaycountChanges: true,
        searchProfileChanges: true,
        limit: 8,
      });
      return {
        props: {
          session: pulledUser.props.session,
          isSubscribed: false,
          previewData: JSON.stringify(previewData),
        },
      };
    }
    return {
      props: {
        session: pulledUser.props.session,
        isSubscribed: true,
        previewData: null,
      },
    };
  } catch (e) {
    console.log(e?.message);
    return {
      props: {
        session: pulledUser.props.session,
      },
    };
  }
};
