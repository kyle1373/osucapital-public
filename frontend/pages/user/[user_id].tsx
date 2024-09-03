import { GetServerSidePropsContext } from "next";
import { User, useCurrentUser } from "@hooks/UserContext";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import {
  checkIfStockExists,
  UserBadges,
  UserStats,
  UserTradeInfo,
  getUserBadges,
  getUserFriendConnection,
  getUserStats,
  getUserTradeHistory,
} from "@lib/server/user";
import CustomGraph from "@components/CustomGraph";
import SidebarWrapper from "@components/SidebarWrapper";
import { useRef, useState } from "react";
import { ClipLoader } from "react-spinners";
import ActivityTable from "@components/ActivityTable";
import { FaCoins } from "react-icons/fa";
import { showMessage } from "@lib/showMessage/showMessage";
import { StockStats, getUserStocks } from "@lib/server/stock";
import osuClient from "@lib/osuClient";
import { strictParseInt, truncateToTwoDecimals } from "@lib/utils";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { isUserSubscribed } from "@lib/server/stripe";
import { FaArrowDown } from "react-icons/fa6";
import Head from "next/head";
import { exists } from "fs";
import router from "next/router";
import SEO from "@components/SEO";

interface TraderProfileProps {
  session: User;
  badges: UserBadges[];
  trader: UserStats;
  stockExists: boolean;
  userStocks: StockStats[];
  canPullMoreUserStocks: boolean;
  isFriend: boolean;
  showHiddenTradesText: boolean;
  recentTrades: UserTradeInfo[];
  isSubscribed: boolean;
  hideTrades: boolean;
}

export default function TraderProfile(props: TraderProfileProps) {
  const { setCurrentUser, openSubscribeModal } = useCurrentUser();
  setCurrentUser(props.session);

  const [isFriend, setIsFriend] = useState<boolean>(props.isFriend);
  const [loadingFriend, setLoadingFriend] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [userStocks, setUserStocks] = useState<StockStats[]>(props.userStocks);
  const [loadingUserStocks, setLoadingUserStocks] = useState<boolean>(false);
  const stocksPageRef = useRef(2);
  const [canPullMore, setCanPullMore] = useState(props.canPullMoreUserStocks);

  const shouldDisplayShowMoreTrades =
    props.recentTrades?.length == 20 && !props.isSubscribed;

  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    // Set image error state to true when image fails to load
    setImageError(true);
  };

  const onShowMoreTradesPressed = () => {
    if (!props.isSubscribed) {
      openSubscribeModal();
    }
  };

  const fetchStocks = async () => {
    if (!canPullMore || loadingUserStocks) return;
    setLoadingUserStocks(true);
    try {
      const stockResponse = await fetch(
        `/api/user_stocks?user_id=${props.trader.user_id}&page=${stocksPageRef.current}`
      );
      const newStocks = await stockResponse.json();
      if (newStocks.error) {
        throw new Error(newStocks.error);
      }
      setCanPullMore(newStocks.canPullMore);
      setUserStocks((prevStocks) => [...prevStocks, ...newStocks.stocks]);
      stocksPageRef.current = stocksPageRef.current + 1;
    } catch (e) {
      showMessage("Error pulling stocks: " + e?.message, true);
    } finally {
      setLoadingUserStocks(false);
    }
  };

  const toggleFriendship = async () => {
    if (loadingFriend) return;
    setLoadingFriend(true);
    try {
      const response = await fetch(`/api/user/${props.trader.user_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: isFriend ? "unfriend" : "friend",
        }),
      });
      const responseJSON = await response.json();
      if (responseJSON.error) {
        throw new Error(responseJSON.error);
      }
      setIsFriend((beforeFriend) => !beforeFriend);
    } catch (e) {
      showMessage(e?.message, true);
    } finally {
      setLoadingFriend(false);
    }
  };

  if (!props.trader) {
    return (
      <>
        <SEO title={`Uh oh! This trader does not exist`} />
        <SidebarWrapper>
          <main className="h-full w-full overflow-y-auto px-4 py-8">
            <div className="text-2xl font-bold text-white text-center">
              Sorry! This trader does not exist.
            </div>
          </main>
        </SidebarWrapper>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${props.trader.osu_name} - Trader Profile`}
        imageUrl={props.trader.osu_picture}
      />
      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap justify-center items-center gap-4">
            <div className="max-w-full md:max-w-4xl w-full">
              <div className="bg-orange-900 bg-opacity-40 overflow-hidden shadow rounded-t-lg">
                <div className="w-full relative sm:h-28 h-18 object-cover">
                  {!imageError ? (
                    <img
                      src={props.trader.osu_banner}
                      alt="Banner"
                      onError={handleImageError}
                      className="w-full sm:h-28 h-16 object-cover"
                    />
                  ) : (
                    <div className="w-full sm:h-28 h-16 object-cover bg-black bg-opacity-20" />
                  )}
                  {props.badges && (
                    <div className="sm:pl-52 pl-4 absolute flex flex-row flex-wrap gap-2 bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.78)]">
                      {props.badges?.map((badge) => (
                        <div data-tooltip-id={badge.badge_id}>
                          <img
                            className="h-8 my-2 bg-gray-600 bg-opacity-20"
                            src={badge.badge_image}
                          />
                          <ReactTooltip
                            id={badge.badge_id}
                            className=" max-w-xs z-10 whitespace-pre-wrap break-words"
                            place="top"
                            content={badge.name}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 w-full flex sm:-mt-16">
                  <div className="relative sm:rounded-2xl rounded-md overflow-hidden sm:w-40 sm:h-40 h-16 w-16 shadow-xl shadow-[rgba(0,0,0,0.2)]">
                    <img
                      src={props.trader.osu_picture}
                      alt="Profile"
                      className="flex-shrink-0 top-0 left-0 sm:w-40 sm:h-40 h-16 w-16 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.78)]">
                      <h2 className="sm:text-3xl text-base font-bold text-center text-orange-300">
                        Trader
                      </h2>
                    </div>
                  </div>
                  <div className="sm:ml-8 ml-4 break-words flex-grow sm:mt-16 -mt-1">
                    <h1
                      className={`${
                        props.trader.is_supporter ? "glow" : ""
                      } font-bold sm:text-4xl text-lg break-all text-white`}
                      style={
                        {
                          "--glow-from-color": props.trader.is_supporter
                            ? props.trader.color_flare
                            : undefined,
                          "--glow-to-color": props.trader.is_supporter
                            ? props.trader.color_flare
                            : undefined,
                        } as any
                      }
                    >
                      {props.trader.osu_name}
                    </h1>
                    <h2 className="text-white font-normal sm:mt-2 sm:text-base text-sm break-words">
                      Rank #{props.trader.global_rank}
                    </h2>
                    <h2 className="flex flex-row justify-start items-center font-normal sm:text-base text-sm  text-white break-words">
                      {truncateToTwoDecimals(
                        props.trader.coins_held + props.trader.coins_invested
                      )}
                      <FaCoins size={12} className="ml-2" />
                    </h2>
                  </div>
                </div>
                <div className="flex px-2 flex-wrap justify-center items-center gap-2 mb-4">
                  {props.trader.user_id !== props.session.user_id &&
                    (isFriend ? (
                      <button
                        onClick={toggleFriendship}
                        className="md:text-lg text-sm font-semibold bg-red-600 text-white px-5 py-2 rounded shadow-xl shadow-[rgba(0,0,0,0.29)] hover:bg-red-700 transition duration-300"
                      >
                        {loadingFriend ? (
                          <ClipLoader color={"#FFFFFF"} size={20} />
                        ) : (
                          "Remove Friend"
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={toggleFriendship}
                        className="md:text-lg text-sm font-semibold bg-blue-700 text-white px-5 py-2 rounded shadow-xl shadow-[rgba(0,0,0,0.29)] hover:bg-blue-800 transition duration-300"
                      >
                        {loadingFriend ? (
                          <ClipLoader color={"#FFFFFF"} size={20} />
                        ) : (
                          "Add Friend"
                        )}
                      </button>
                    ))}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={"https://osu.ppy.sh/users/" + props.trader.user_id}
                    className="bg-customPink-light font-semibold text-white px-5 py-2 rounded hover:bg-customPink-dark md:text-lg text-sm transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl"
                  >
                    osu! Profile
                  </a>
                  {props.stockExists && (
                    <button
                      onClick={() => {
                        router.push(`/stock/${props.trader.user_id}`);
                      }}
                      className="md:text-lg text-sm font-semibold bg-violet-600 text-white px-5 py-2 rounded hover:bg-violet-700 transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl"
                    >
                      Stock Profile
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-b-lg w-full bg-orange-950 bg-opacity-40 items-center justify-center overflow-hidden">
                <div className="m-2">
                  <CustomGraph
                    title="Total Coins"
                    xAxisData={props.trader.user_history.map(
                      (entry) => entry.date
                    )}
                    yAxisData={props.trader.user_history.map(
                      (entry) => entry.coins
                    )}
                    lineColor={"#ce7125"}
                    noDataElement={
                      <div className="flex justify-center font-bold items-center text-white text-opacity-50 md:text-2xl text-base w-full h-full">
                        No Data Collected
                      </div>
                    }
                  />
                </div>
              </div>
              {props.showHiddenTradesText && (
                <h1 className="mt-4 text-center text-white font-bold">
                  This user's trades are hidden
                </h1>
              )}
              {!props.hideTrades && (
                <div className="mt-4">
                  <ActivityTable
                    trades={props.recentTrades}
                    type="UserTradeInfo"
                  />
                </div>
              )}
              {shouldDisplayShowMoreTrades && (
                <div className="flex justify-center mt-4">
                  <button
                    className="bg-orange-900 bg-opacity-40 text-sm rounded-full text-white font-semibold px-8 py-2 flex items-center justify-center space-x-2 hover:opacity-60 transition duration-300"
                    onClick={onShowMoreTradesPressed}
                  >
                    <FaArrowDown size={14} />
                    <span>Show More</span>
                    <FaArrowDown size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </SidebarWrapper>
    </>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { params } = context;
  const traderId = strictParseInt(params.user_id as string);
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    return pulledUser;
  }

  if (!params || !params.user_id) {
    return {
      props: {
        session: pulledUser.props.session,
        trader: null,
      },
    };
  }

  if (isNaN(traderId)) {
    const osuUser = await osuClient.user.details(
      params.user_id as string,
      "osu",
      "username"
    );

    if (!osuUser || osuUser.hasOwnProperty("error")) {
      return {
        props: {
          session: pulledUser.props.session,
          stock: null,
        },
      };
    }

    return {
      redirect: {
        destination: "/user/" + osuUser.id,
        permanent: false,
      },
    };
  }
  try {
    const isSubscribed = await isUserSubscribed(
      pulledUser.props.session.user_id
    );

    const stockExists = await checkIfStockExists(traderId);
    const tradeLimit = isSubscribed ? 100 : 20;

    const pulledUserStats = await getUserStats(traderId);

    const showHiddenTradesText =
      !pulledUserStats.show_trades &&
      pulledUserStats.user_id !== pulledUser.props.session.user_id;

    // We do this separation so SuperFX knows if a user has hid their trades yet he can still see their trades for admin purposes
    const hideTrades =
      showHiddenTradesText && pulledUser.props.session.user_id !== 11461481;

    let pulledTrades = [];
    if (!hideTrades) {
      pulledTrades = await getUserTradeHistory(traderId, tradeLimit);
    }
    // const { stocks, canPullMore } = await getUserStocks(traderId, 1);
    const isFriend = await getUserFriendConnection(
      pulledUser.props.session.user_id,
      traderId
    );
    const pulledUserWithStats: TraderProfileProps = {
      session: pulledUser.props.session,
      badges: getUserBadges(pulledUserStats),
      trader: pulledUserStats,
      stockExists: stockExists,
      isFriend: isFriend,
      userStocks: null,
      canPullMoreUserStocks: null,
      hideTrades,
      showHiddenTradesText,
      recentTrades: pulledTrades,
      isSubscribed: isSubscribed,
    };
    return {
      props: pulledUserWithStats,
    };
  } catch (e) {
    console.error(e?.message);
    return {
      props: {
        session: pulledUser.props.session,
        trader: null,
      },
    };
  }
};
