import { GetServerSidePropsContext } from "next";
import { User, useCurrentUser } from "@hooks/UserContext";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import {
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

interface TraderProfileProps {
  session: User;
  badges: UserBadges[];
  trader: UserStats;
  userStocks: StockStats[];
  canPullMoreUserStocks: boolean;
  isFriend: boolean;
  recentTrades: UserTradeInfo[];
}

export default function TraderProfile(props: TraderProfileProps) {
  const { setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  const [isFriend, setIsFriend] = useState<boolean>(props.isFriend);
  const [loadingFriend, setLoadingFriend] = useState(false);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [userStocks, setUserStocks] = useState<StockStats[]>(props.userStocks);
  const [loadingUserStocks, setLoadingUserStocks] = useState<boolean>(false);
  const stocksPageRef = useRef(2);
  const [canPullMore, setCanPullMore] = useState(props.canPullMoreUserStocks);

  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
      // Set image error state to true when image fails to load
      setImageError(true);
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
      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-8">
          <div className="text-2xl font-bold text-white text-center">
            Sorry! This trader does not exist.
          </div>
        </main>
      </SidebarWrapper>
    );
  }

  return (
    <SidebarWrapper>
      <main className="h-full w-full overflow-y-auto px-4 py-4">
        <div className="flex flex-wrap justify-center items-center gap-4">
          <div className="max-w-full md:max-w-4xl w-full">
            <div className="bg-orange-900 bg-opacity-40 overflow-hidden shadow rounded-t-lg">
              <div className="w-full relative sm:h-28 h-18 object-cover">
                {!imageError ? <img
                  src={props.trader.osu_banner}
                  alt="Banner"
                  onError={handleImageError}
                  className="w-full sm:h-28 h-16 object-cover"
                /> : <div
                className="w-full sm:h-28 h-16 object-cover bg-black bg-opacity-20"
              />}
                {props.badges && (
                  <div className="sm:pl-52 pl-4 absolute flex flex-row flex-wrap gap-2 bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.78)]">
                    {props.badges?.map((badge) => (
                      <div data-tooltip-id={badge.badge_id}>
                        <img className="h-8 my-2 bg-gray-600 bg-opacity-20" src={badge.badge_image} />
                        <ReactTooltip
                          id={badge.badge_id}
                          className=" max-w-xs z-50 whitespace-pre-wrap break-words"
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
                  <h1 className="text-white font-bold sm:text-4xl text-lg break-all">
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
              <div className="flex space-x-2 justify-center mb-4">
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
            <div className="mt-4">
              <ActivityTable trades={props.recentTrades} type="UserTradeInfo" />
            </div>
          </div>
        </div>
      </main>
    </SidebarWrapper>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    return pulledUser;
  }

  const { params } = context;
  if (!params || !params.user_id) {
    return {
      props: {
        session: pulledUser.props.session,
        trader: null,
      },
    };
  }

  const traderId = strictParseInt(params.user_id as string);

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
    const pulledUserStats = await getUserStats(traderId);
    let pulledTrades = [];
    if (
      pulledUserStats.show_trades ||
      pulledUserStats.user_id == pulledUser.props.session.user_id ||
      pulledUser?.props?.session?.user_id === 11461481
    ) {
      pulledTrades = await getUserTradeHistory(traderId);
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
      isFriend: isFriend,
      userStocks: null,
      canPullMoreUserStocks: null,
      recentTrades: pulledTrades,
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
