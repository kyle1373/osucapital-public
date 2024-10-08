import React, { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { mustBeLoggedInServer } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import "chart.js/auto";
import { UserStats, getUserStats } from "@lib/server/user";
import {
  StockStats,
  getTrendingStocks,
  getUserStocks,
  millisecondsUntilTradingBonus,
} from "@lib/server/stock";
import InfiniteScroll from "react-infinite-scroll-component";
import { showMessage } from "@lib/showMessage/showMessage";
import CustomGraph from "@components/CustomGraph";
import {
  COINS,
  COLORS,
  LIMIT,
  LINKS,
  SETTINGS,
  TEXT,
} from "@constants/constants";
import { LeaderboardUser, getTopTradersToday } from "@lib/server/leaderboard";
import DashboardCard from "./components/DashboardCard";
import TitleCard from "./components/TitleCard";
import LabelCard from "./components/LabelCard";
import { formatDistanceToNow } from "date-fns";
import YourStockCard from "./components/YourStockCard";
import { FaArrowDown } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import { useRouter } from "next/router";
import {
  didUserJustSubscribe,
  maxLimitCoins,
  truncateToTwoDecimals,
} from "@lib/utils";
import InfoCardBig from "./components/InfoCardBig";
import InfoCardSmall from "./components/InfoCardSmall";
import { isUserSubscribed } from "@lib/server/stripe";
import ImportantNoticeCard from "./components/ImportantNoticeCard";
import SEO from "@components/SEO";
import axios from "axios";
import { usePageCache } from "@hooks/usePageCache";

interface DashboardProps {
  session: User;
  stats: UserStats;
  userStocks: StockStats[];
  tradingBonusMilliseconds: number;
  tradingBonusRelative: string;
  canPullMore: boolean;
  errors: string[];
  isSubscribed: boolean;
}

export default function Dashboard(props: DashboardProps) {
  const { pageCache, cachePageData } = usePageCache();

  const { currentUser, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  const globalRankHover = `This is your rank across all osu! capital users`;
  const friendRankHover = "This is your rank across your osu! capital friends";

  const countryRankHover = `This is your rank across all osu! capital users in your country`;

  const coinsHeldHover =
    "These are coins that you have right now and can use to invest into stocks";
  const coinsInvestedHover =
    "These are coins that you have invested into stocks";
  const profitTaxesHover =
    "These are coins which are currently liable to taxes through profits you have made on your stocks";
  const netWorthHover = "Net Worth = Coins Held + Coins Invested";

  const [canPullMore, setCanPullMore] = useState(props.canPullMore);
  const [myStocks, setMyStocks] = useState<StockStats[]>(props.userStocks);
  const [loading, setLoading] = useState(false);
  const page = useRef(2);
  const router = useRouter();

  const [topTraders, setTopTraders] = useState(
    pageCache("/", "topTraders") ?? {
      data: [],
      fetching: false,
      error: null,
    }
  );

  const [trendingStocks, setTrendingStocks] = useState(
    pageCache("/", "trendingStocks") ?? {
      data: [],
      fetching: false,
      error: null,
    }
  );

  const getTopTradersAPICall = async () => {
    if (topTraders.fetching) {
      return;
    }
    setTopTraders((prevState) => {
      return { ...prevState, fetching: true };
    });

    try {
      const response = await axios.get("/api/public/top_traders");
      if (response.status !== 200) {
        throw new Error(response?.data?.error);
      }
      setTopTraders((prevState) => {
        return { ...prevState, data: response.data };
      });
    } catch (e) {
      setTopTraders((prevState) => {
        return { ...prevState, error: e.message || e, data: [] };
      });
    } finally {
      setTopTraders((prevState) => {
        return { ...prevState, fetching: false };
      });
    }
  };

  const getTrendingStocksAPICall = async () => {
    if (trendingStocks.fetching) {
      return;
    }
    setTrendingStocks((prevState) => {
      return { ...prevState, fetching: true };
    });

    try {
      const response = await axios.get("/api/public/trending_stocks");
      if (response.status !== 200) {
        throw new Error(response?.data?.error);
      }
      setTrendingStocks((prevState) => {
        return { ...prevState, data: response.data };
      });
    } catch (e) {
      setTrendingStocks((prevState) => {
        return { ...prevState, error: e.message || e, data: [] };
      });
    } finally {
      setTrendingStocks((prevState) => {
        return { ...prevState, fetching: false };
      });
    }
  };

  useEffect(() => {
    if (trendingStocks.data.length === 0) {
      getTrendingStocksAPICall();
    }
    if (topTraders.data.length === 0) {
      getTopTradersAPICall();
    }
  }, []);

  useEffect(() => {
    cachePageData("/", "topTraders", topTraders);
    cachePageData("/", "trendingStocks", trendingStocks);
  }, [trendingStocks, topTraders]);

  if (!props.stats || props.errors?.length !== 0) {
    return (
      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-4">
          <div className="text-2xl font-bold text-white text-center mb-2">
            {`Welcome, ${props.session.osu_name}!`}
          </div>
          <div className="text-base text-neutral-300 mb-4 ">
            osu! capital is a stock market where you invest currency into osu!
            players. Rank up by making good bets on who you think is underrated.
            When their osu! performance goes up, so does their stock price and
            your coin total. Good luck, and join our{" "}
            <Link
              target="_blank"
              rel="noopener noreferrer"
              href={LINKS.Discord}
              className="text-blue-500 hover:text-blue-600 underline transition duration-300"
            >
              Discord community
            </Link>
            !
          </div>
          <div className="text-red-400 font-semibold mt-8 text-center break-words">
            We encountered an issue loading your dashboard. Try logging out and
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
            {JSON.stringify(props.errors)}
          </div>
        </main>
      </SidebarWrapper>
    );
  }

  const netWorth = maxLimitCoins(
    truncateToTwoDecimals(
      props.stats?.coins_held +
        props.stats?.coins_invested -
        props.stats?.liable_taxes
    )
  );

  const getCoinGain = () => {
    if (
      !props.stats?.user_history[props.stats.user_history.length - 2]?.net_worth
    ) {
      return 0;
    }
    return (
      netWorth -
      props.stats?.user_history[props.stats.user_history.length - 2]?.net_worth
    );
  };

  const getRankGains = () => {
    const globalRankDiff = props.stats?.user_history[
      props.stats.user_history.length - 2
    ]?.global_rank
      ? -1 *
        (props.stats.global_rank -
          props.stats.user_history[props.stats.user_history.length - 2]
            ?.global_rank)
      : 0;

    const friendRankDiff = props.stats.user_history[
      props.stats.user_history.length - 2
    ]?.friend_rank
      ? -1 *
        (props.stats.friend_rank -
          props.stats.user_history[props.stats.user_history.length - 2]
            ?.friend_rank)
      : 0;

    return { global: globalRankDiff, friend: friendRankDiff };
  };

  const fetchStocks = async () => {
    if (!canPullMore || loading) return;
    setLoading(true);
    try {
      const stockResponse = await fetch(
        `/api/user_stocks?user_id=${props.session.user_id}&page=${page.current}`
      );
      const newStocks = await stockResponse.json();
      if (newStocks.error) {
        throw new Error(newStocks.error);
      }
      setCanPullMore(newStocks.canPullMore);
      setMyStocks((prevStocks) => [...prevStocks, ...newStocks.stocks]);
      page.current = page.current + 1;
    } catch (e) {
      showMessage("Error pulling stocks: " + e.message, true);
    } finally {
      setLoading(false);
    }
  };

  // Rank view toggle
  const handleRankClick = (showFriendRankings) => {
    localStorage.setItem("showFriendRankings", showFriendRankings.toString());
    router.push("/leaderboard");
  };

  const WelcomeCard = () => (
    <TitleCard title={"Welcome " + props.session.osu_name}>
      <div className="text-base text-white text-center">
        osu! capital is a stock market where you invest currency into osu!
        players. Rank up by making good bets on who you think is underrated.
        When their osu! performance goes up, so does their stock price and your
        coin total.{" "}
        {/* <span className="text-yellow-300 font-bold">
          This season features a $100 prizepool, where the top 10 traders will
          each receive a percentage!{" "}
        </span>{" "} */}
        Join our{" "}
        <Link
          target="_blank"
          rel="noopener noreferrer"
          href={LINKS.Discord}
          className="text-blue-300 hover:text-blue-400 underline transition duration-300"
        >
          Discord community
        </Link>{" "}
        for more information!
      </div>
    </TitleCard>
  );

  return (
    <>
      <SEO title={"Dashboard"} />

      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-4 gap-4">
          {SETTINGS.SeasonClosed && <ImportantNoticeCard />}
          <div className="lg:hidden space-y-4">
            <WelcomeCard />
            {/* <LabelCard
              label={
                props.tradingBonusMilliseconds === 0
                  ? "Your next buy will"
                  : "Your next trading bonus:"
              }
              secondLabel={
                props.tradingBonusMilliseconds === 0
                  ? "give you " + COINS.TradingBonus + " coins!"
                  : props.tradingBonusRelative
              }
            /> */}
            <TitleCard
              title={"Net Worth History"}
              subTitle={TEXT.CurrentSeason}
            >
              <div className="py-5 h-40">
                <CustomGraph
                  title="Net Worth"
                  xAxisData={props.stats.user_history.map(
                    (entry) => entry.date
                  )}
                  yAxisData={props.stats.user_history.map(
                    (entry) => entry.net_worth
                  )}
                  lineColor={"#9d5bf4"}
                  noDataElement={
                    <div className="flex truncate font-bold justify-center items-center text-opacity-30 text-2xl w-full h-full text-white">
                      No Data Collected
                    </div>
                  }
                />
              </div>
            </TitleCard>
            <LabelCard label={"Your Summary"} />
            <div className="flex flex-col gap-4 sm:flex-row">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleRankClick(false)}
              >
                <InfoCardSmall
                  label={"Global Rank"}
                  info={"#" + props.stats.global_rank}
                  changeInfo={getRankGains().global}
                  hoverInfo={globalRankHover}
                />
              </div>
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleRankClick(true)}
              >
                <InfoCardSmall
                  label={"Friend Rank"}
                  info={"#" + props.stats.friend_rank}
                  changeInfo={getRankGains().friend}
                  hoverInfo={friendRankHover}
                />
              </div>
            </div>
            <div className="flex-1">
              <InfoCardBig
                label={"Net Worth"}
                info={netWorth}
                changeInfo={getCoinGain() !== 0 ? getCoinGain() : undefined}
                hoverInfo={netWorthHover}
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <InfoCardSmall
                  label={"Coins Held"}
                  info={props.stats.coins_held}
                  hoverInfo={coinsHeldHover}
                />
              </div>
              <div className="flex-1">
                <InfoCardSmall
                  label={"Coins Invested"}
                  info={props.stats.coins_invested}
                  hoverInfo={coinsInvestedHover}
                />
              </div>
            </div>
            <LabelCard label={"Your Stocks"} />
            <div className="grid xl:grid-cols-2 grid-cols-1 gap-4">
              {myStocks?.map((stock, index) => {
                return (
                  <div key={index}>
                    <YourStockCard stockStats={stock} />
                  </div>
                );
              })}
            </div>
            {canPullMore && (
              <div className="flex justify-center">
                <button
                  disabled={loading}
                  onClick={fetchStocks}
                  className="bg-violet-900 text-white rounded-full font-semibold px-10 py-2 flex items-center mb-4"
                >
                  {loading ? (
                    <ClipLoader color={"#FFFFFF"} size={24} />
                  ) : (
                    <>
                      <FaArrowDown className="mr-2" />
                      Show More
                      <FaArrowDown className="ml-2" />
                    </>
                  )}
                </button>
              </div>
            )}
            <TitleCard title={"Trending Stocks"}>
              <div className="space-y-4 ml-4">
                {trendingStocks.error && (
                  <div className="flex justify-center items-center text-center text-white">
                    <h1>Oops! An error occurred. Please try again later</h1>
                  </div>
                )}
                {trendingStocks.fetching && (
                  <div className="flex justify-center items-center">
                    <ClipLoader color="#FFFFFF" size={30} />
                  </div>
                )}
                {trendingStocks.data?.map((stock) => {
                  return (
                    <Link
                      className="flex flex-row items-center hover:underline text-white"
                      href={"/stock/" + stock.stock_id}
                    >
                      <img
                        src={stock.osu_picture}
                        className="h-10 w-10 rounded mr-6"
                      />
                      <h1 className="text-white font-semibold text-lg mr-4">
                        {stock.osu_name}
                      </h1>
                      <h2
                        className={
                          stock.share_price_change_percentage >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {stock.share_price_change_percentage}%
                      </h2>
                    </Link>
                  );
                })}
              </div>
            </TitleCard>
            <TitleCard title={"Top Traders Today"}>
              <div className="space-y-4 ml-4">
                {topTraders.error && (
                  <div className="flex justify-center items-center text-center text-white">
                    <h1>Oops! An error occurred. Please try again later</h1>
                  </div>
                )}
                {topTraders.fetching && (
                  <div className="flex justify-center items-center">
                    <ClipLoader color="#FFFFFF" size={30} />
                  </div>
                )}
                {topTraders.data.map((trader) => {
                  return (
                    <Link
                      className="flex flex-row items-center hover:underline text-white"
                      href={"/user/" + trader.user_id}
                    >
                      <img
                        src={trader.osu_picture}
                        className="h-10 w-10 rounded mr-6"
                      />
                      <h1
                        className={`${
                          trader.is_supporter ? "glow" : ""
                        } text-white font-semibold text-lg mr-4`}
                        style={
                          {
                            "--glow-from-color": trader.is_supporter
                              ? trader.color_flare
                              : undefined,
                            "--glow-to-color": trader.is_supporter
                              ? trader.color_flare
                              : undefined,
                          } as any
                        }
                      >
                        {trader.osu_name}
                      </h1>
                      <h2
                        className={
                          trader.coin_differential >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {trader.coin_differential}%
                      </h2>
                    </Link>
                  );
                })}
              </div>
            </TitleCard>
          </div>
          <div className="hidden lg:flex gap-4">
            <div className="lg:w-1/3 space-y-4 mb-4">
              <DashboardCard />
              <WelcomeCard />
              {/* <LabelCard
                label={
                  props.tradingBonusMilliseconds === 0
                    ? "Your next buy will"
                    : "Your next trading bonus:"
                }
                secondLabel={
                  props.tradingBonusMilliseconds === 0
                    ? "give you " + COINS.TradingBonus + " coins!"
                    : props.tradingBonusRelative
                }
              /> */}
              <TitleCard title={"Trending Stocks"}>
                <div className="space-y-4 ml-4">
                  {trendingStocks.error && (
                    <div className="flex justify-center items-center text-center text-white">
                      <h1>Oops! An error occurred. Please try again later</h1>
                    </div>
                  )}
                  {trendingStocks.fetching && (
                    <div className="flex justify-center items-center">
                      <ClipLoader color="#FFFFFF" size={30} />
                    </div>
                  )}
                  {trendingStocks.data?.map((stock) => {
                    return (
                      <Link
                        className="flex flex-row items-center hover:underline text-white"
                        href={"/stock/" + stock.stock_id}
                      >
                        <img
                          src={stock.osu_picture}
                          className="h-10 w-10 rounded mr-6"
                        />
                        <h1 className="text-white font-semibold text-lg mr-4">
                          {stock.osu_name}
                        </h1>
                        <h2
                          className={
                            stock.share_price_change_percentage >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {stock.share_price_change_percentage}%
                        </h2>
                      </Link>
                    );
                  })}
                </div>
              </TitleCard>
              <TitleCard title={"Top Traders Today"}>
                <div className="space-y-4 ml-4">
                  {topTraders.error && (
                    <div className="flex justify-center items-center text-center text-white">
                      <h1>Oops! An error occurred. Please try again later</h1>
                    </div>
                  )}
                  {topTraders.fetching && (
                    <div className="flex justify-center items-center">
                      <ClipLoader color="#FFFFFF" size={30} />
                    </div>
                  )}
                  {topTraders.data.map((trader) => {
                    return (
                      <Link
                        className="flex flex-row items-center hover:underline text-white"
                        href={"/user/" + trader.user_id}
                      >
                        <img
                          src={trader.osu_picture}
                          className="h-10 w-10 rounded mr-6"
                        />
                        <h1
                          className={`${
                            trader.is_supporter ? "glow" : ""
                          } text-white font-semibold text-lg mr-4`}
                          style={
                            {
                              "--glow-from-color": trader.is_supporter
                                ? trader.color_flare
                                : undefined,
                              "--glow-to-color": trader.is_supporter
                                ? trader.color_flare
                                : undefined,
                            } as any
                          }
                        >
                          {trader.osu_name}
                        </h1>
                        <h2
                          className={
                            trader.coin_differential >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }
                        >
                          {trader.coin_differential}%
                        </h2>
                      </Link>
                    );
                  })}
                </div>
              </TitleCard>
            </div>
            <div className="lg:w-2/3 space-y-4 gap-4">
              <LabelCard label={"Your Summary"} />
              <div className="flex flex-col gap-4 sm:flex-row">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleRankClick(false)}
                >
                  <InfoCardSmall
                    label={"Global Rank"}
                    info={"#" + props.stats.global_rank}
                    changeInfo={getRankGains().global}
                    hoverInfo={globalRankHover}
                  />
                </div>
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleRankClick(true)}
                >
                  <InfoCardSmall
                    label={"Friend Rank"}
                    info={"#" + props.stats.friend_rank}
                    changeInfo={getRankGains().friend}
                    hoverInfo={friendRankHover}
                  />
                </div>
              </div>
              <div className="flex-1">
                <InfoCardBig
                  label={"Net Worth"}
                  info={netWorth}
                  changeInfo={getCoinGain() !== 0 ? getCoinGain() : undefined}
                  hoverInfo={netWorthHover}
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <InfoCardSmall
                    label={"Coins Held"}
                    info={props.stats.coins_held}
                    hoverInfo={coinsHeldHover}
                  />
                </div>
                <div className="flex-1">
                  <InfoCardSmall
                    label={"Coins Invested"}
                    info={props.stats.coins_invested}
                    hoverInfo={coinsInvestedHover}
                  />
                </div>
              </div>
              <TitleCard
                title={"Net Worth History"}
                subTitle={TEXT.CurrentSeason}
              >
                <div className="py-5 h-40">
                  <CustomGraph
                    title="Net Worth"
                    xAxisData={props.stats.user_history.map(
                      (entry) => entry.date
                    )}
                    yAxisData={props.stats.user_history.map(
                      (entry) => entry.net_worth
                    )}
                    lineColor={"#9d5bf4"}
                    noDataElement={
                      <div className="flex truncate font-bold justify-center items-center text-opacity-30 text-2xl w-full h-full text-white">
                        No Data Collected
                      </div>
                    }
                  />
                </div>
              </TitleCard>
              <LabelCard label={"Your Stocks"} />
              <div className="grid xl:grid-cols-2 grid-cols-1 gap-4">
                {myStocks?.map((stock, index) => {
                  return (
                    <div key={index}>
                      <YourStockCard stockStats={stock} />
                    </div>
                  );
                })}
              </div>
              {canPullMore && (
                <div className="flex justify-center">
                  <button
                    disabled={loading}
                    onClick={fetchStocks}
                    className="bg-violet-900 text-white rounded-full font-semibold px-10 py-2 flex items-center"
                  >
                    {loading ? (
                      <ClipLoader color={"#FFFFFF"} size={24} />
                    ) : (
                      <>
                        <FaArrowDown className="mr-2" />
                        Show More
                        <FaArrowDown className="ml-2" />
                      </>
                    )}
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

export const getServerSideProps = async (context) => {
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    // Handles redirect
    return pulledUser;
  }

  let userStats: UserStats = null;
  let tradingBonusMilliseconds: number = null;
  let userStocks: StockStats[] = null;
  let canPullMore: boolean = false;
  const errors = [];
  try {
    userStats = await getUserStats(pulledUser.props.session.user_id);
  } catch (e) {
    console.warn(e);
    // context.res.setHeader(
    //   "Set-Cookie",
    //   "userSession=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    // );
    errors.push("GET USER STATS ERROR\n\n" + e?.name + ": " + e?.message);
  }
  try {
    tradingBonusMilliseconds = await millisecondsUntilTradingBonus(
      pulledUser.props.session.user_id
    );
  } catch (e) {
    errors.push("GET TRADING BONUS ERROR\n\n" + e?.name + ": " + e?.message);
  }
  try {
    const userStockResult = await getUserStocks(
      pulledUser.props.session.user_id,
      1
    );
    userStocks = userStockResult.stocks;
    canPullMore = userStockResult.canPullMore;
  } catch (e) {
    errors.push("GET USER STOCKS ERROR\n\n" + e?.name + ": " + e?.message);
  }

  const tradingBonusRelative = tradingBonusMilliseconds
    ? formatDistanceToNow(
        new Date(tradingBonusMilliseconds + new Date().getTime()),
        { addSuffix: true }
      )
    : "later";

  const isSubscribed = await isUserSubscribed(pulledUser.user_id);
  const pulledUserWithStats: DashboardProps = {
    session: pulledUser.props.session,
    stats: userStats,
    tradingBonusMilliseconds,
    tradingBonusRelative,
    errors,
    userStocks,
    canPullMore,
    isSubscribed,
  };

  return {
    props: pulledUserWithStats,
  };
};
