import { COINS, LIMIT, SETTINGS } from "@constants/constants";
import osuClient from "@lib/osuClient";
import supabaseAdmin from "@lib/supabase/supabase";
import {
  calculateBuyTax,
  calculateIfStockCanBeBought,
  calculateIfStockCanBeSold,
  checkRebalance,
  getCleanErrorMessage,
  isAfterMinutes,
  monthlyPlaycountEntry,
  sleep,
  tradesParam,
  truncateToTwoDecimals,
} from "@lib/utils";
import { erf } from "mathjs";
import { response as UserDetails } from "osu-api-extended/dist/types/v2_users_details";

export interface StockStats {
  stock_id: number;
  share_price: number;
  shares_owned: number;
  share_rank: number;
  share_price_change_percentage: number | null;
  share_price_history: {
    date: string;
    price: number;
  }[];
  osu_name: string;
  osu_banner: string;
  osu_picture: string;
  osu_rank: number | null;
  osu_pp: number | null;
  last_updated: string;
  osu_rank_history: number[] | null;
  is_buyable: boolean | null;
  is_sellable: boolean | null;
  prevent_trades: boolean | null;
  osu_playcount_history: monthlyPlaycountEntry[] | null;
  osu_join_date: string | null;
  is_banned: boolean;
}

export const checkIfTraderExists = async (userId: number): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("user_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data.length > 0;
};

export const getStockStats = async (
  stock_id: number,
  user_id: number
): Promise<StockStats> => {
  const stockStats = await supabaseAdmin.rpc("get_stock_stats", {
    p_stock_id: stock_id,
    p_user_id: user_id ?? 0,
  });

  if (stockStats.error) {
    console.error(
      "Error in pulling stock stats: " + JSON.stringify(stockStats.error)
    );
    return null;
  }

  // The data returned should always just be 1 or 0, but this is just a failsafe
  let formattedData: StockStats =
    stockStats.data.length > 0 ? stockStats.data[0] : null;

  if (SETTINGS.SeasonClosed && !formattedData) {
    return null;
  }

  if (!formattedData) {
    try {
      await refreshStock({
        stock_id,
        log_history_if_new: true,
      });
    } catch (e) {
      console.error(
        "CAUGHT ERROR IN getStockStats for stock_id " +
          stock_id +
          "\n" +
          e.message
      );
      return null;
    }

    const repulledStockStats = await supabaseAdmin
      .rpc("get_stock_stats", {
        p_stock_id: stock_id,
        p_user_id: user_id,
      })
      .single();

    if (repulledStockStats.error) {
      console.error(repulledStockStats.error);
      return null;
    }

    formattedData = repulledStockStats.data as StockStats;
  } else if (
    isAfterMinutes(formattedData.last_updated, LIMIT.UpdateStockViewMinutes) &&
    !formattedData.prevent_trades &&
    !SETTINGS.SeasonClosed
  ) {
    try {
      const { osuUser, stockPrice, canBuyStock, canSellStock, isBanned } =
        await refreshStock({ stock_id });

      if (!isBanned) {
        formattedData = {
          ...formattedData,
          share_price: stockPrice,
          osu_name: osuUser?.username ?? null,
          osu_picture: osuUser?.avatar_url ?? null,
          osu_rank: osuUser?.statistics?.global_rank ?? null,
          osu_pp: osuUser?.statistics?.pp ?? null,
          osu_rank_history: osuUser?.rankHistory?.data ?? null,
          osu_join_date: osuUser?.join_date ?? null,
          osu_playcount_history: osuUser?.monthly_playcounts ?? null,
          is_buyable: canBuyStock ?? null,
          is_sellable: canSellStock ?? null,
        };
      }
    } catch (e) {
      console.error(
        "CAUGHT ERROR IN getStockStats for stock_id " +
          stock_id +
          "\n" +
          e.message
      );
      return null;
    }
  }

  const formattedPriceHistory: {
    date: string;
    price: number;
  }[] = formattedData.share_price_history.map((val, index, array) => {
    return {
      date:
        array.length -
        index +
        (index === array.length - 1 ? " day ago" : " days ago"),
      price: val.price,
    };
  });

  if (formattedData.share_price) {
    formattedPriceHistory.push({
      date: "Today",
      price: formattedData.share_price,
    });
  }

  formattedData.share_price_history = formattedPriceHistory;

  if (SETTINGS.SeasonClosed) {
    formattedData.prevent_trades = true;
  }

  return formattedData;
};

export const getUserStocks = async (
  user_id: number,
  page: number
): Promise<{ stocks: StockStats[]; canPullMore: boolean }> => {
  const limit = 10;

  // Note: this function actually returns limit + 1 items. We use the limit + 1 to determine if there is more items that need to be loaded
  const { data, error } = await supabaseAdmin.rpc("get_user_stocks", {
    p_user_id: user_id,
    p_page: page,
    p_page_size: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  let canPullMore = false;
  if (data.length === limit + 1) {
    canPullMore = true;
    data.pop();
  }

  const formattedStocks: StockStats[] = data.map((stockStat: StockStats) => {
    const formattedPriceHistory = stockStat.share_price_history.map(
      (val, index, array) => {
        return {
          date:
            array.length -
            index +
            (index === array.length - 1 ? " day ago" : " days ago"),
          price: val.price,
        };
      }
    );
    if (stockStat.share_price) {
      formattedPriceHistory.push({
        date: "Today",
        price: stockStat.share_price,
      });
    }
    return {
      ...stockStat,
      share_price_history: formattedPriceHistory,
    };
  });

  return { stocks: formattedStocks, canPullMore: canPullMore };
};

export interface StockTradeInfo {
  user_id: number;
  osu_name: string;
  type: "buy" | "sell";
  num_shares: number;
  coins: number;
  timestamp: string;
  profit: number;
  coins_with_taxes: number;
}

export const getStockTradeHistory = async (
  stock_id: number,
  limit: number
): Promise<StockTradeInfo[]> => {
  const tradeHistory = await supabaseAdmin
    .from("trades")
    .select(
      "user_id, users(osu_name), type, num_shares, timestamp, coins, profit, coins_with_taxes"
    )
    .order("timestamp", { ascending: false }) // Sort by timestamp in descending order
    .limit(limit)
    .eq("stock_id", stock_id);

  if (tradeHistory.error) {
    throw new Error(tradeHistory.error.message);
  }

  const formattedData = tradeHistory.data.map((data) => {
    // Typescript seems to think users is an array when it's actually one object.
    // This is just used to remove the typescript error.
    const users: any = data.users;
    return { ...data, osu_name: users.osu_name };
  });

  return formattedData;
};

export async function buyShares(
  userId: number,
  stockId: number,
  numShares: number,
  sharePrice: number
) {
  const tradingBonusMilliseconds = await millisecondsUntilTradingBonus(userId);
  const response = await supabaseAdmin.rpc("buy_shares", {
    p_user_id: userId,
    p_stock_id: stockId,
    p_num_shares: numShares,
    p_share_price: sharePrice,
    p_trading_fee: calculateBuyTax(sharePrice * numShares),
    p_trading_bonus: tradingBonusMilliseconds === 0 ? COINS.TradingBonus : 0,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}

export async function sellShares(
  userId: number,
  stockId: number,
  numShares: number,
  sharePrice: number
) {
  const response = await supabaseAdmin.rpc("sell_shares", {
    p_user_id: userId,
    p_stock_id: stockId,
    p_num_shares: numShares,
    p_share_price: sharePrice,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }
}

function rankStockPriceCalculation(rank: number) {
  let rankStockPrice = -1;
  rankStockPrice = (rank + 100 + 180000) / (rank + 36);
  rankStockPrice =
    rankStockPrice < 9.5 ? 9.5 : Math.round(rankStockPrice * 100) / 100;

  return rankStockPrice;
}

function ppStockPriceCalculation(pp: number) {
  let ppStockPrice = -1;
  if (pp <= 10000) {
    ppStockPrice = 0.001 * pp;
  } else if (pp <= 15400) {
    ppStockPrice = 0.5 * pp - 4990;
  } else if (pp <= 19400) {
    ppStockPrice = pp - 12690;
  } else if (pp <= 21405) {
    ppStockPrice = 2 * pp - 32090;
  } else {
    ppStockPrice = 4 * pp - 74900;
  }

  ppStockPrice /= 10;
  ppStockPrice =
    ppStockPrice < 0.5 ? 0.5 : Math.round(ppStockPrice * 100) / 100;
  return ppStockPrice;
}

function oldCalculateStockPrice(
  rank: number,
  pp: number,
  rankHistory: number[]
): number {
  if (!pp || isNaN(pp) || pp === 0 || !rank || isNaN(rank) || rank === 0) {
    return null;
  }

  const ppStockPrice = ppStockPriceCalculation(pp);
  const rankStockPrice = rankStockPriceCalculation(rank);
  const improvementBonus = calculateImprovementBonus(rankHistory);
  const totalPrice = ppStockPrice + rankStockPrice + improvementBonus;

  return truncateToTwoDecimals(
    totalPrice < COINS.MinimumSharePrice ? COINS.MinimumSharePrice : totalPrice
  );
}

export function calculateStockPrice(
  rank: number,
  pp: number,
  rankHistory: number[]
) {
  if (
    !pp ||
    isNaN(pp) ||
    pp === 0 ||
    !rank ||
    isNaN(rank) ||
    rank === 0 ||
    rankHistory === null ||
    rankHistory === undefined
  ) {
    return null;
  }

  const reversedRankHistory = rankHistory.slice().reverse(); // Constants
  const P_BASE = 10000 / 3;
  const P_PP_LIMIT = 30000;
  const I_BASE = 10000 / 3;
  const I_DAYS_RETROPERSPECTIVE = 10;
  const R_BASE = 10000 / 3;
  const R_RANK_LIMIT = 100000;

  // Helper functions
  const getPPRatio = (pp) => pp / P_PP_LIMIT;
  const normalizedErf = (value) => {
    const normalized = erf(value) / erf(1);
    return Math.max(0, Math.min(normalized, 1)); // Clamping between 0 and 1
  };
  const getRankCommonness = (rank) => Math.log(rank) / Math.log(R_RANK_LIMIT);

  // P-Component
  const getP = (pp) => P_BASE * getPPRatio(pp);

  // I-Component
  const getRankChangeWeight = (index) => {
    // Apply no weight change for the first 5 entries
    if (index < 5) {
      return 1;
    } else {
      // Apply smoothly decreasing weight starting from the sixth entry
      // Here, we subtract 4 from the index to start the decrease from 1/2
      return 1 / (index - 3);
    }
  };

  const getImprovementRate = (reversedRankHistory) => {
    let rate = 0;
    let weightedCount = 0;

    for (
      let i = 0;
      i < Math.min(I_DAYS_RETROPERSPECTIVE, reversedRankHistory.length - 1);
      i++
    ) {
      const change = reversedRankHistory[i + 1] - reversedRankHistory[i];
      const weight = getRankChangeWeight(i);
      rate += (weight * change) / reversedRankHistory[i + 1];
      weightedCount += weight;
    }

    return weightedCount !== 0 ? rate / weightedCount : 0;
  };
  const getI = (reversedRankHistory) =>
    I_BASE * normalizedErf(getImprovementRate(reversedRankHistory));

  // R-Component
  const getR = (rank) => Math.max(0, R_BASE * (1 - getRankCommonness(rank)));

  const total = Math.max(
    1,
    (getP(pp) + getI(reversedRankHistory) + getR(rank)) / 10
  );

  return truncateToTwoDecimals(total);
}

export function calculateImprovementBonus(rankHistory: number[]) {
  if (!rankHistory) {
    return 0;
  }
  const relevantHistory = rankHistory.slice(-3);
  let difference = 0;
  if (relevantHistory.length > 0) {
    difference =
      rankStockPriceCalculation(relevantHistory[relevantHistory.length - 1]) -
      rankStockPriceCalculation(relevantHistory[0]);
  }

  return truncateToTwoDecimals(difference > 200 ? 200 : difference);
}

export async function refreshTopViews() {
  const { error } = await supabaseAdmin.rpc("refresh_top_views");

  if (error) {
    throw new Error(JSON.stringify(error));
  }
}

export async function refreshStock({
  stock_id,
  log_history_if_new,
}: {
  stock_id: number;
  log_history_if_new?: boolean;
}) {
  if (SETTINGS.SeasonClosed) {
    return {};
  }
  const osuUser = await osuClient.user.details(stock_id, "osu", "id");

  console.log("Refreshing " + stock_id);

  const { data: originalStockData, error: originalStockDataPullError } =
    await supabaseAdmin
      .from("stocks")
      .select()
      .eq("stock_id", stock_id)
      .maybeSingle();

  if (originalStockDataPullError) {
    throw new Error(
      "Error pulling originalStockData " + originalStockDataPullError.message
    );
  }

  if (!osuUser || osuUser.hasOwnProperty("error")) {
    // User might be banned. Set their info to be blank
    if (originalStockData) {
      const { error } = await supabaseAdmin.from("stocks").upsert({
        stock_id: stock_id,
        last_updated: new Date().toISOString(),
        share_price: null,
        osu_rank: null,
        osu_pp: null,
        is_buyable: false,
        is_sellable: false,
        is_banned: true,
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        isBanned: true,
      };
    } else {
      throw new Error("osu! user does not exist in database");
    }
  }

  const isBuyable = calculateIfStockCanBeBought(
    osuUser.statistics?.global_rank,
    osuUser.statistics?.pp,
    osuUser.rankHistory?.data,
    osuUser.monthly_playcounts,
    osuUser.join_date
  );

  const isSellable = calculateIfStockCanBeSold(isBuyable.buyableStatus);

  const stockPrice = calculateStockPrice(
    osuUser?.statistics?.global_rank,
    osuUser?.statistics?.pp,
    osuUser?.rankHistory?.data
  );

  const shouldCheckRebalance =
    originalStockData?.share_price &&
    (stockPrice > originalStockData.share_price
      ? stockPrice >= 1.05 * originalStockData.share_price
      : originalStockData.share_price >= 1.02 * stockPrice);

  let bestPlays = originalStockData?.osu_best_plays;
  let didRebalanceOccur = false;
  if (
    SETTINGS.CheckPPRebalanceOnStocks &&
    (shouldCheckRebalance || !bestPlays)
  ) {
    // Check if a rebalance occurred

    const osuUserBestPlays = await osuClient.scores.user.category(
      stock_id,
      "best",
      {
        mode: "osu",
        limit: "100",
      }
    );

    const pulledBestPlays = osuUserBestPlays.map((play) => {
      return {
        id: play.id,
        pp: play.pp as unknown as number,
        date: play.created_at,
      };
    });

    let rebalancedScoreDetails = [];
    if (bestPlays && originalStockData?.share_price) {
      let rebalanceResult = checkRebalance(bestPlays, pulledBestPlays);
      didRebalanceOccur = rebalanceResult.didRebalance;
      rebalancedScoreDetails = rebalanceResult.rebalancedScores;
    }

    const { error } = await supabaseAdmin.from("best_plays_test").insert({
      old_best_plays: bestPlays,
      new_best_plays: pulledBestPlays,
      stock_id: stock_id,
      did_rebalance_occur: didRebalanceOccur,
      rebalanced_scores: rebalancedScoreDetails,
    });

    if (!error) {
      console.log("Successfully inserted rebalance plays for", stock_id);
    }

    bestPlays = pulledBestPlays;
  }

  // Inserted fields for refreshStock rpc function

  const osu_user_data = {
    last_updated: new Date().toISOString(),
    share_price: stockPrice,
    osu_name: osuUser?.username,
    osu_picture: osuUser?.avatar_url,
    osu_banner:
      osuUser?.cover_url || osuUser?.cover?.url || osuUser?.cover?.custom_url,
    osu_rank: osuUser?.statistics.global_rank,
    osu_pp: osuUser?.statistics.pp,
    osu_rank_history: osuUser?.rankHistory?.data
      ? osuUser?.rankHistory.data
      : [],
    osu_playcount_history: osuUser?.monthly_playcounts ?? [],
    osu_join_date: osuUser?.join_date,
    is_buyable: isBuyable.canBeBought,
    is_sellable: isSellable,
    osu_country_code: osuUser?.country_code,
    is_banned: false,
    osu_best_plays: bestPlays ?? [],
  };

  try {
    console.log("Performing rebalance", didRebalanceOccur);
    const { error: refreshStockError } = await supabaseAdmin.rpc(
      "refresh_stock",
      {
        p_stock_id: stock_id,
        p_osu_user_data: osu_user_data,
        p_do_dilute_shares: didRebalanceOccur,
      }
    );

    if (refreshStockError) {
      throw new Error(
        refreshStockError.message || "upsertData length is not 1"
      );
    }

    console.log("Calculated stock price for " + stock_id + " is " + stockPrice);

    if (log_history_if_new && stockPrice) {
      const prev_history = await supabaseAdmin
        .from("stocks_history")
        .select()
        .eq("stock_id", stock_id)
        .limit(1);

      if (prev_history.error) {
        throw new Error(
          "Error pulling stocks history: " + prev_history.error.message
        );
      }

      if (prev_history.data.length === 0) {
        const insert_history = await supabaseAdmin
          .from("stocks_history")
          .insert({
            stock_id: stock_id,
            price: stockPrice,
          });
        if (insert_history.error) {
          throw new Error(
            "Error inserting into stocks history: " +
              insert_history.error.message
          );
        }
      }
    }

    const preventTrades =
      originalStockData && originalStockData?.prevent_trades;

    return {
      osuUser: osuUser,
      stockPrice: stockPrice,
      canBuyStock: isBuyable.canBeBought && !preventTrades,
      canSellStock: isSellable && !preventTrades,
      buyableRequirements: isBuyable.buyableStatus,
    };
  } catch (e) {
    console.log("Cannot refresh stock stats: " + e?.message);
    throw Error("Cannot refresh stock stats: " + e?.message);
  }
}

export async function millisecondsUntilTradingBonus(userId: number) {
  // We're disabling trading bonus right now because they're creating postgres constraint violations atm
  return 100
  const now = new Date();
  const currentUtcTime = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  );

  // Start of today in UTC (12 AM)
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Query to check if the user has made a trade today
  let { data, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "buy")
    .gte("timestamp", startOfToday.toISOString())
    .lte("timestamp", now.toISOString());

  if (error) throw new Error(error.message);

  // If the user has not traded today
  if (data.length === 0) {
    return 0; // User can have a trading bonus now
  }

  // Calculate milliseconds until next bonus (next day 12 AM UTC)
  const startOfNextDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return startOfNextDay.getTime() - currentUtcTime;
}

export async function getTrendingStocks(
  showTimestamps = false
): Promise<StockStats[]> {
  // const response = await supabaseAdmin.rpc("get_top_stocks");
  const response = await supabaseAdmin
    .from("trending_stocks")
    .select()
    .order("share_price_change_percentage", { ascending: false })
    .limit(15);
  if (response.error) {
    console.error(JSON.stringify(response.error));
    throw new Error(response.error.message);
  }

  if (!showTimestamps) {
    const formattedStocks: StockStats[] = response.data.map(
      (stockStat: StockStats) => {
        const formattedPriceHistory = stockStat.share_price_history.map(
          (val, index, array) => {
            return {
              date:
                array.length -
                index +
                (index === array.length - 1 ? " day ago" : " days ago"),
              price: val.price,
            };
          }
        );
        formattedPriceHistory.push({
          date: "Today",
          price: stockStat.share_price,
        });
        return {
          ...stockStat,
          share_price_history: formattedPriceHistory,
        };
      }
    );
    return formattedStocks;
  }
  return response.data;
}

export async function getStockBuyHistoryByUser(
  stockId: number,
  userId: number
): Promise<tradesParam[]> {
  const { data, error } = await supabaseAdmin
    .from("trades")
    .select(
      "id, timestamp, type, coins, num_shares, shares_left, coins_with_taxes, share_price"
    )
    .gt("shares_left", 0)
    .eq("user_id", userId)
    .eq("stock_id", stockId)
    .order("timestamp", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const returnedData = data.map((val) => {
    return {
      id: val.id,
      timestamp: val.timestamp,
      type: val.type,
      coins: val.coins,
      num_shares: val.num_shares,
      shares_left: val.shares_left,
      coins_with_taxes: val.coins_with_taxes,
      share_price: val.share_price,
    };
  });

  return returnedData;
}
