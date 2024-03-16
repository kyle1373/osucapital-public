import { COINS, LIMIT } from "@constants/constants";
import osuClient from "@lib/osuClient";
import supabaseAdmin from "@lib/supabase/supabase";
import {
  calculateBuyTax,
  calculateIfStockCanBeBought,
  calculateIfStockCanBeSold,
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
}

// TODO: convert all errors to promise catching and handle it outside of this function too
export const getStockStats = async (
  stock_id: number,
  user_id: number
): Promise<StockStats> => {
  const stockStats = await supabaseAdmin.rpc("get_stock_stats", {
    p_stock_id: stock_id,
    p_user_id: user_id,
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

  if (!formattedData) {
    try {
      const { osuUser, stockPrice } = await refreshStock(stock_id);

      if (stockPrice) {
        const resp2 = await supabaseAdmin.from("stocks_history").insert({
          stock_id: stock_id,
          price: stockPrice,
        });

        if (resp2.error) {
          throw new Error(resp2.error.message);
        }
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
    !formattedData.prevent_trades
  ) {
    try {
      const { osuUser, stockPrice, canBuyStock, canSellStock } =
        await refreshStock(stock_id);

      formattedData = {
        ...formattedData,
        share_price: stockPrice,
        osu_name: osuUser?.username,
        osu_picture: osuUser?.avatar_url,
        osu_rank: osuUser?.statistics?.global_rank,
        osu_pp: osuUser?.statistics?.pp,
        osu_rank_history: osuUser?.rankHistory.data,
        osu_join_date: osuUser?.join_date,
        osu_playcount_history: osuUser?.monthly_playcounts,
        is_buyable: canBuyStock,
        is_sellable: canSellStock,
      };
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

  formattedPriceHistory.push({
    date: "Today",
    price: formattedData.share_price,
  });

  formattedData.share_price_history = formattedPriceHistory;

  return formattedData;
};

export const getUserStocks = async (
  user_id: number,
  page: number
): Promise<{ stocks: StockStats[]; canPullMore: boolean }> => {
  if (page === 1) {
    // TODO: Optimize this. We're doing double pulls when we could only be doing one.
    // The first pull just refreshes the stocks, but somehow we should just return this data lol
    const pulledAllStocks = await supabaseAdmin
      .from("users_stocks")
      .select("stock_id, stocks(stock_id, last_updated, prevent_trades)")
      .eq("user_id", user_id);
    if (pulledAllStocks.error) {
      throw new Error("ERROR2: " + JSON.stringify(pulledAllStocks.error));
    }

    const allStockIds = [];

    for (var userStock of pulledAllStocks.data) {
      const stock: any = userStock.stocks;
      if (
        isAfterMinutes(stock.last_updated, LIMIT.UpdateStockBatchViewMinutes) &&
        !stock.prevent_trades
      ) {
        allStockIds.push(stock.stock_id);
      }
    }

    await refreshStocks(allStockIds);
  }
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

  const dataRemoveInvalid = data.filter(
    (stockStat: StockStats) => stockStat.share_price
  );

  const formattedStocks: StockStats[] = dataRemoveInvalid.map(
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
  stock_id: number
): Promise<StockTradeInfo[]> => {
  const tradeHistory = await supabaseAdmin
    .from("trades")
    .select(
      "user_id, users(osu_name), type, num_shares, timestamp, coins, profit, coins_with_taxes"
    )
    .order("timestamp", { ascending: false }) // Sort by timestamp in descending order
    .limit(20)
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

export async function refreshStocks(
  stock_ids: number[],
  updateTimestamp = true
) {
  const chunkSize = 50;
  const chunks = [];

  for (let i = 0; i < stock_ids.length; i += chunkSize) {
    const chunk = stock_ids.slice(i, i + chunkSize);
    chunks.push(chunk);
  }

  const { data: existingRecords, error: fetchError } = await supabaseAdmin
    .from("stocks")
    .select("stock_id, osu_name, last_updated, osu_rank_history")
    .in("stock_id", stock_ids);

  if (fetchError) {
    throw new Error("ERROR5: " + fetchError.message);
  }

  const existingRecordsMap = existingRecords.reduce((map, record) => {
    map[record.stock_id] = record;
    return map;
  }, {});

  const newData = [];
  let chunkCounter = 0;

  for (const chunk of chunks) {
    if (chunkCounter === 2) {
      await sleep(1000);
      chunkCounter = 0;
    }

    const osuUserDetails = await osuClient.users.details(chunk);

    if (
      osuUserDetails === null ||
      osuUserDetails === undefined ||
      osuUserDetails.hasOwnProperty("error")
    ) {
      throw new Error(
        (osuUserDetails as any)?.error ||
          "Too many requests or an unknown error occurred"
      );
    }

    const osuUserDetailsMap = osuUserDetails.reduce((map, value) => {
      map[value.id] = value;
      return map;
    }, {});

    newData.push(
      ...chunk
        .map((stockId) => {
          const osuUserDetail = osuUserDetailsMap[stockId];
          if (osuUserDetail) {
            return {
              stock_id: osuUserDetail.id,
              last_updated: updateTimestamp
                ? new Date(
                    new Date().getTime() -
                      LIMIT.UpdateStockBatchViewMinutes * 60000
                  ).toISOString()
                : existingRecordsMap[stockId].last_updated,
              share_price: calculateStockPrice(
                parseInt(osuUserDetail.statistics_rulesets?.osu?.global_rank),
                osuUserDetail.statistics_rulesets?.osu?.pp,
                existingRecordsMap[osuUserDetail.id].osu_rank_history
              ),
              osu_name: osuUserDetail.username,
              osu_picture: osuUserDetail.avatar_url,
              osu_banner:
                osuUserDetail?.cover.custom_url || osuUserDetail?.cover.url,
              osu_rank: osuUserDetail.statistics_rulesets?.osu?.global_rank,
              osu_pp: osuUserDetail.statistics_rulesets?.osu?.pp,
              osu_rank_history:
                existingRecordsMap[osuUserDetail.id].osu_rank_history,
              osu_country_code: osuUserDetail.country_code,
            };
          }
          return null;
        })
        .filter(Boolean)
    ); // filter out null values
    chunkCounter++;
  }

  // Perform batch upsert
  if (newData.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from("stocks")
      .upsert(newData); // This replaces individual updates

    if (upsertError) {
      throw new Error("ERROR_BATCH_UPSERT: " + upsertError.message);
    }
  }
}

export async function refreshStock(stock_id: number) {
  const osuUser = await osuClient.user.details(stock_id, "osu", "id");

  if (!osuUser || osuUser.hasOwnProperty("error")) {
    // User might be banned. Set their info to be blank
    try {
      await supabaseAdmin.from("stocks").upsert({
        stock_id: stock_id,
        last_updated: new Date().toISOString(),
        share_price: null,
        osu_rank: null,
        osu_pp: null,
        osu_rank_history: null,
        monthly_playcount: null,
        is_buyable: false,
        is_sellable: false,
      });
    } catch (e) {
      console.error("UNCAUGHT ERROR:", e?.message || e);
    }
    throw new Error("osu! user does not exist");
  }

  const isBuyable = calculateIfStockCanBeBought(
    osuUser.statistics.global_rank,
    osuUser.statistics.pp,
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

  try {
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from("stocks")
      .upsert({
        stock_id: stock_id,
        last_updated: new Date().toISOString(),
        share_price: stockPrice,
        osu_name: osuUser?.username,
        osu_picture: osuUser?.avatar_url,
        osu_banner:
          osuUser?.cover_url || osuUser?.cover.url || osuUser?.cover.custom_url,
        osu_rank: osuUser?.statistics.global_rank,
        osu_pp: osuUser?.statistics.pp,
        osu_rank_history: osuUser?.rankHistory?.data
          ? osuUser?.rankHistory.data
          : [],
        osu_playcount_history: osuUser?.monthly_playcounts,
        osu_join_date: osuUser?.join_date,
        is_buyable: isBuyable.canBeBought,
        is_sellable: isSellable,
        osu_country_code: osuUser?.country_code,
      })
      .select("prevent_trades");

    if (upsertError || upsertData.length !== 1) {
      throw new Error(upsertError.message || "upsertData length is not 1");
    }

    return {
      osuUser: osuUser,
      stockPrice: stockPrice,
      canBuyStock: isBuyable.canBeBought && !upsertData[0].prevent_trades,
      canSellStock: isSellable && !upsertData[0].prevent_trades,
      buyableRequirements: isBuyable.buyableStatus,
    };
  } catch (e) {
    throw Error("Cannot refresh stock stats: " + e?.message);
  }
}

export async function millisecondsUntilTradingBonus(userId: number) {
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
  const response = await supabaseAdmin.rpc("get_top_stocks");
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
