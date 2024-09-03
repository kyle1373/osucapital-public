import { GetServerSidePropsContext } from "next";
import SidebarWrapper from "@components/SidebarWrapper";
import { User, useCurrentUser } from "@hooks/UserContext";
import TitleCard from "./components/TitleCard";
import {
  StockStats,
  StockTradeInfo,
  calculateImprovementBonus,
  checkIfTraderExists,
  getStockBuyHistoryByUser,
  getStockStats,
  getStockTradeHistory,
  millisecondsUntilTradingBonus,
} from "@lib/server/stock";
import { getUserByContext, mustBeLoggedInServer } from "@lib/authorization";
import { getUserBySession, getUserHeldCoins } from "@lib/server/user";
import { FaArrowDown, FaCoins } from "react-icons/fa";
import {
  calculateIfStockCanBeBought,
  didUserJustSubscribe,
  strictParseInt,
  tradesParam,
  truncateToTwoDecimals,
} from "@lib/utils";
import ModalPopup from "./components/ModalPopup";
import { showMessage } from "@lib/showMessage/showMessage";
import { useRouter } from "next/router";
import { useState, useRef } from "react";
import CustomGraph from "@components/CustomGraph";
import osuClient from "@lib/osuClient";
import ActivityTable from "@components/ActivityTable";
import { isUserSubscribed } from "@lib/server/stripe";
import SellAllSharesModalPopup from "./components/SellAllSharesPopup";
import Head from "next/head";
import SEO from "@components/SEO";

interface StockProfileProps {
  session: User;
  stock: StockStats;
  traderExists: boolean;
  recentTrades: StockTradeInfo[];
  userTradeHistory: tradesParam[];
  heldCoins: number;
  canDoTradingBonus: boolean;
  isSubscribed: boolean;
  isBanned: boolean;
}

export default function StockProfile(props: StockProfileProps) {
  const { currentUser, setCurrentUser, showLoading, openSubscribeModal } =
    useCurrentUser();

  setCurrentUser(props.session);
  const router = useRouter();

  const [showBuyModal, setShowBuyModal] = useState(false);

  const shouldDisplayShowMoreTrades =
    props.recentTrades?.length == 20 && !props.isSubscribed && currentUser;

  const onShowMoreTradesPressed = () => {
    if (!props.isSubscribed) {
      openSubscribeModal();
    }
  };

  const [showSellModal, setShowSellModal] = useState(false);

  const [showSellAllSharesModal, setShowSellAllSharesModal] = useState(false);

  // TODO: useRef is used to prevent race conditions when setting numSharesBuySell. Sometime get rid of it.
  const numSharesBuySellRef = useRef<number>();

  const [numSharesBuySell, setNumSharesBuySell] = useState<number>(undefined);

  const stockBuyLimitations = calculateIfStockCanBeBought(
    props.stock?.osu_rank,
    props.stock?.osu_pp,
    props.stock?.osu_rank_history,
    props.stock?.osu_playcount_history,
    props.stock?.osu_join_date
  ).reasonsNotMet;

  const stockCanBeBought =
    !props.stock?.prevent_trades && props.stock?.is_buyable;
  const stockCanBeSold =
    !props.stock?.prevent_trades && props.stock?.is_sellable;

  const pushLogin = () => {
    router.push(`/api/auth/osu?return=${"/stock/" + props.stock?.stock_id}`);
  };

  const openSellModal = () => {
    if (!currentUser) {
      pushLogin();
      return;
    }

    if (props.session.user_id === props.stock.stock_id) {
      showMessage("You cannot sell your own stock", true);
      return;
    }
    setShowSellModal(true);
  };

  const closeSellModal = () => {
    setShowSellModal(false);
  };

  const openSellAllSharesModal = () => {
    if (!currentUser) {
      pushLogin();
      return;
    }

    if (props.session.user_id === props.stock.stock_id) {
      showMessage("You cannot sell your own stock", true);
      return;
    }
    setShowSellAllSharesModal(true);
  };
  const closeSellAllSharesModal = () => {
    setShowSellAllSharesModal(false);
  };

  const openBuyModal = () => {
    if (!currentUser) {
      pushLogin();
      return;
    }

    if (props.session.user_id === props.stock.stock_id) {
      showMessage("You cannot buy your own stock", true);
      return;
    }

    setShowBuyModal(true);
  };

  const closeBuyModal = () => {
    setShowBuyModal(false);
  };

  const submitSellAllBannedShares = async () => {
    showLoading(true);
    try {
      const response = await fetch(
        `/api/sell_all_shares/${props.stock.stock_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const responseJSON = await response.json();

      if (responseJSON.error) {
        showLoading(false);
        return showMessage(responseJSON.error, true);
      }

      showMessage(responseJSON.data, false);
      numSharesBuySellRef.current = undefined;
      setNumSharesBuySell(undefined);
      closeSellAllSharesModal();
      router.replace(router.asPath);
    } catch (e) {
      showMessage(e?.message, true);
    } finally {
      showLoading(false);
    }
  };

  const submitTrade = async (type: "buy" | "sell") => {
    if (!numSharesBuySellRef.current || numSharesBuySellRef.current <= 0)
      return showMessage("Provide a valid number of shares", true);
    showLoading(true);
    try {
      const response = await fetch(`/api/trade/${props.stock.stock_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seen_share_price: props.stock.share_price,
          num_shares: numSharesBuySellRef.current,
          trade_type: type,
        }),
      });

      const responseJSON = await response.json();

      if (responseJSON.error) {
        showLoading(false);
        return showMessage(responseJSON.error, true);
      }

      showMessage(responseJSON.data, false);
      numSharesBuySellRef.current = undefined;
      setNumSharesBuySell(undefined);
      setShowBuyModal(false);
      setShowSellModal(false);
      router.replace(router.asPath);
    } catch (e) {
      showMessage(e?.message, true);
    } finally {
      showLoading(false);
    }
  };

  if (!props.stock) {
    return (
      <>
        <SEO title={`Uh oh! This stock does not exist`} />
        <SidebarWrapper>
          <main className="h-full w-full overflow-y-auto px-4 py-8">
            <div className="text-2xl font-bold text-white text-center">
              Sorry! This stock could not be found.
            </div>
          </main>
        </SidebarWrapper>
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${props.stock.osu_name} - Stock Profile`}
        description={
          "Invest into " +
          props.stock.osu_name +
          " stocks on osucapital! If they improve in osu, their share price increases and so does your coin total! Join 10,000+ other osu players to compete in osu's biggest stock market."
        }
        imageUrl={props.stock.osu_picture}
      />
      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-4">
          <div className="flex flex-wrap justify-center items-center gap-4">
            <div className="max-w-full md:max-w-4xl w-full">
              <div className="bg-blue-900 bg-opacity-40 overflow-hidden shadow rounded-t-lg">
                <img
                  src={props.stock.osu_banner}
                  alt="Banner"
                  className="w-full md:h-28 h-18 object-cover"
                />
                <div className="p-4 w-full flex sm:-mt-16">
                  <div className="relative sm:rounded-2xl rounded-md overflow-hidden sm:w-40 sm:h-40 h-16 w-16 shadow-xl shadow-[rgba(0,0,0,0.2)]">
                    <img
                      src={props.stock.osu_picture}
                      alt="Profile"
                      className="flex-shrink-0 top-0 left-0 sm:w-40 sm:h-40 h-16 w-16 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-[rgba(0,0,0,0.78)]">
                      <h2 className="sm:text-3xl text-lg font-bold text-center text-blue-300">
                        Stock
                      </h2>
                    </div>
                  </div>
                  <div className="sm:ml-8 ml-4 break-words flex-grow sm:mt-16 -mt-1">
                    {" "}
                    {/* Allows text to break and fill space */}
                    <h1 className="text-white font-bold sm:text-4xl text-lg break-all">
                      {props.stock.osu_name}
                    </h1>
                    {props.stock.osu_rank && props.stock.share_price && (
                      <>
                        <h2 className="text-white font-normal sm:mt-2 sm:text-base text-sm break-words">
                          Rank #{props.stock.osu_rank}
                        </h2>
                        <h2 className="flex flex-row justify-start items-center font-normal sm:text-base text-sm  text-white break-words">
                          {props.stock.share_price}
                          <FaCoins size={12} className="ml-2" />
                        </h2>
                      </>
                    )}
                  </div>
                </div>
                <h2 className="justify-start items-center text-center mb-2 px-4 pb-4 font-medium sm:text-lg text-base text-white break-words">
                  {props.stock.share_price
                    ? "You currently own " +
                      props.stock.shares_owned +
                      " shares valued at " +
                      truncateToTwoDecimals(
                        props.stock.shares_owned * props.stock.share_price
                      ) +
                      " coins"
                    : `This player is ${
                        props.isBanned ? "banned" : "inactive"
                      }.`}
                </h2>
                <div className="flex px-2 flex-wrap justify-center items-center gap-2 mb-4 -mt-3">
                  {props.stock.share_price && (
                    <button
                      onClick={openBuyModal}
                      disabled={!props.stock.share_price || !stockCanBeBought}
                      className={`md:text-lg text-sm font-semibold bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl ${
                        !props.stock.share_price || !stockCanBeBought
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Buy
                    </button>
                  )}
                  {props.stock.share_price && (
                    <button
                      onClick={openSellModal}
                      disabled={!props.stock.share_price || !stockCanBeSold}
                      className={`md:text-lg text-sm font-semibold bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl ${
                        !props.stock.share_price || !stockCanBeSold
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      Sell
                    </button>
                  )}
                  {!props.stock.share_price &&
                    props.stock.shares_owned !== 0 && (
                      <button
                        onClick={openSellAllSharesModal}
                        disabled={props.stock.shares_owned === 0}
                        className={`md:text-lg text-sm font-semibold bg-red-600 text-white px-5 py-2 rounded hover:bg-red-700 transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl ${
                          props.stock.shares_owned === 0
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        Sell all shares
                      </button>
                    )}
                  {!props.isBanned && (
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={"https://osu.ppy.sh/users/" + props.stock.stock_id}
                      className="bg-customPink-light font-semibold text-white px-5 py-2 rounded hover:bg-customPink-dark md:text-lg text-sm transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl"
                    >
                      osu! Profile
                    </a>
                  )}
                  {props.traderExists && (
                    <button
                      onClick={() => {
                        router.push(`/user/${props.stock.stock_id}`);
                      }}
                      className="md:text-lg text-sm font-semibold bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition duration-300 shadow-[rgba(0,0,0,0.29)] shadow-xl"
                    >
                      Trader Profile
                    </button>
                  )}
                </div>
                {props.stock.prevent_trades &&
                  !(stockBuyLimitations && stockBuyLimitations.length > 0) && (
                    <h2 className="text-center font-medium text-xs text-gray-400 mb-4">
                      Trades are currently locked for this stock
                    </h2>
                  )}
                {stockBuyLimitations &&
                  stockBuyLimitations.length > 0 &&
                  !props.isBanned && (
                    <div className="text-center mt-4 mb-4">
                      <h2 className="font-medium text-xs text-gray-200 mb-2">
                        Limitations preventing stock trading:
                      </h2>
                      <ul className="list-disc text-gray-300 text-xs mx-auto">
                        {stockBuyLimitations.map((limitation, index) => (
                          <div key={index}>Stock must {limitation}</div>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              <div className="rounded-b-lg w-full bg-blue-950 bg-opacity-40 items-center justify-center overflow-hidden">
                <div className="m-2">
                  <CustomGraph
                    title="Share Price"
                    xAxisData={props.stock.share_price_history.map(
                      (entry) => entry.date
                    )}
                    yAxisData={props.stock.share_price_history.map(
                      (entry) => entry.price
                    )}
                    lineColor={"#66a7f5"}
                    noDataElement={
                      <div className="flex justify-center font-bold items-center text-white text-opacity-50 md:text-2xl text-base w-full h-full">
                        No Data Collected
                      </div>
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <ActivityTable
                  trades={props.recentTrades}
                  type="StockTradeInfo"
                />
              </div>
              {shouldDisplayShowMoreTrades && (
                <div className="flex justify-center mt-4">
                  <button
                    className="bg-blue-900 bg-opacity-40 text-sm rounded-full text-white font-semibold px-8 py-2 flex items-center justify-center space-x-2 hover:opacity-60 transition duration-300"
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
          {showBuyModal && (
            <ModalPopup
              stockName={props.stock.osu_name}
              type={"buy"}
              buyHistory={props.userTradeHistory}
              sharePrice={props.stock.share_price}
              coinsHeld={props.heldCoins}
              numShares={numSharesBuySell}
              numSharesBefore={props.stock.shares_owned}
              numSharesRef={numSharesBuySellRef}
              setNumShares={setNumSharesBuySell}
              onClose={closeBuyModal}
              onSubmit={() => submitTrade("buy")}
              doTradingBonus={props.canDoTradingBonus}
            />
          )}

          {showSellModal && (
            <ModalPopup
              stockName={props.stock.osu_name}
              type={"sell"}
              buyHistory={props.userTradeHistory}
              sharePrice={props.stock.share_price}
              numSharesRef={numSharesBuySellRef}
              coinsHeld={props.heldCoins}
              numShares={numSharesBuySell}
              numSharesBefore={props.stock.shares_owned}
              setNumShares={setNumSharesBuySell}
              onClose={closeSellModal}
              onSubmit={() => submitTrade("sell")}
              doTradingBonus={props.canDoTradingBonus}
            />
          )}

          {showSellAllSharesModal && (
            <SellAllSharesModalPopup
              stockName={props.stock.osu_name}
              isBanned={props.stock.is_banned}
              numShares={props.stock.shares_owned}
              buyHistory={props.userTradeHistory}
              onSubmit={() => submitSellAllBannedShares()}
              onClose={closeSellAllSharesModal}
            />
          )}
        </main>
      </SidebarWrapper>
    </>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { params } = context;
  const stockId = strictParseInt(params.stock_id as string);
  const pulledUser = await getUserByContext(context);

  if (!params || !params.stock_id) {
    return {
      props: {
        session: pulledUser,
        stock: null,
      },
    };
  }

  if (isNaN(stockId)) {
    const osuUser = await osuClient.user.details(
      params.stock_id as string,
      "osu",
      "username"
    );

    if (!osuUser || osuUser.hasOwnProperty("error")) {
      return {
        props: {
          session: pulledUser,
          stock: null,
        },
      };
    }

    return {
      redirect: {
        destination: "/stock/" + osuUser.id,
        permanent: false,
      },
    };
  }

  const pulledStockStats = await getStockStats(stockId, pulledUser?.user_id);

  if (
    !pulledStockStats ||
    !pulledStockStats.osu_name ||
    !pulledStockStats.osu_picture
  ) {
    return {
      props: {
        session: pulledUser,
        stock: null,
      },
    };
  }

  try {
    const traderExists = await checkIfTraderExists(stockId);
    let isSubscribed = false;
    let pulledUserTradeHistory: tradesParam[] = [];
    let pulledCoins = 0;
    let canDoTradingBonus = false;
    if (pulledUser) {
      isSubscribed = await isUserSubscribed(pulledUser.user_id);
      pulledUserTradeHistory = await getStockBuyHistoryByUser(
        stockId,
        pulledUser.user_id
      );

      pulledCoins = await getUserHeldCoins(pulledUser.user_id);

      const msUntilTradingBonus = await millisecondsUntilTradingBonus(
        pulledUser.user_id
      );

      canDoTradingBonus = msUntilTradingBonus === 0;
    }

    const limit = isSubscribed ? 100 : 20;
    const pulledTrades = await getStockTradeHistory(stockId, limit);

    const pulledUserWithStats: StockProfileProps = {
      session: pulledUser,
      stock: pulledStockStats,
      traderExists: traderExists,
      recentTrades: pulledTrades,
      userTradeHistory: pulledUserTradeHistory,
      heldCoins: pulledCoins,
      canDoTradingBonus,
      isSubscribed,
      isBanned: pulledStockStats.is_banned,
    };

    return {
      props: pulledUserWithStats,
    };
  } catch (e) {
    console.error(e?.message);
    return {
      props: {
        session: pulledUser,
        stock: null,
      },
    };
  }
};
