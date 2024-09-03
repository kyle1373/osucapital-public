import { COINS } from "@constants/constants";
import { type ClassValue, clsx } from "clsx";
import { truncate } from "fs";
import { twMerge } from "tailwind-merge";
import confetti from "canvas-confetti";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isAfterMinutes(dateString: string, minutes: number): boolean {
  const convertedDate = new Date(dateString);
  return new Date(convertedDate.getTime() + minutes * 60000) < new Date();
}

export function truncateToTwoDecimals(num: number) {
  try {
    return Math.floor(num * 100) / 100;
  } catch (e) {
    return null;
  }
}

export function hasDecimalsAfterTwoPlaces(num: number) {
  // Convert the number to a string and split at the decimal point
  const parts = num.toString().split(".");

  // Check if there's a decimal part and if its length is more than 2
  if (parts.length === 2 && parts[1].length > 2) {
    return true;
  } else {
    return false;
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function strictParseInt(str) {
  if (!/^\d+$/.test(str)) {
    return NaN;
  }
  return parseInt(str);
}

export function numberWithCommas(x: number): string {
  if (!x || isNaN(x)) {
    return "0";
  }
  if (Math.abs(x) < 1000) {
    return x.toString();
  }
  return x.toFixed().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

export function calculateBuyTax(coinsExchanged: number) {
  if (!coinsExchanged || coinsExchanged <= 0) {
    return 0;
  }
  const tax = truncateToTwoDecimals(COINS.BuyTax * coinsExchanged);

  return Math.max(tax, 0.01);
}

export interface tradesParam {
  id: number;
  timestamp: string;
  type: "buy" | "sell";
  coins: number;
  num_shares: number;
  shares_left: number;
  coins_with_taxes: number;
  share_price: number;
}

export function calculateSellProfitAndTax(
  trades: tradesParam[],
  numShares: number,
  currentSharePrice: number
) {
  let sharesToSell = numShares;
  let totalCostBasis = 0;
  let totalProfitBeforeTax = 0;
  let totalTaxAmount = 0;

  if (!trades) {
    return {
      profit: 0,
      tax: 0,
    };
  }

  trades.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const trade of trades) {
    if (trade.type === "buy" && trade.shares_left > 0 && sharesToSell > 0) {
      const sharesUsed = Math.min(sharesToSell, trade.shares_left);
      const daysPassed =
        (Date.now() - new Date(trade.timestamp).getTime()) / (1000 * 3600 * 24);
      const costPerShare = trade.share_price;
      const profitBeforeTax = (currentSharePrice - costPerShare) * sharesUsed;
      const taxAmount = calculateTaxOnProfit(profitBeforeTax, daysPassed);

      totalCostBasis += costPerShare * sharesUsed;
      totalProfitBeforeTax += profitBeforeTax;
      totalTaxAmount += taxAmount;

      sharesToSell -= sharesUsed;
    }
  }

  const coinsEarned = currentSharePrice * numShares;
  const netProfit = coinsEarned - totalCostBasis - totalTaxAmount;

  return {
    profit: truncateToTwoDecimals(netProfit),
    tax: truncateToTwoDecimals(totalTaxAmount),
  };
}

// NOTE: This function is also used on the database. If you want to modify this function, also modify calculate_tax_on_profit on the db
function calculateTaxOnProfit(profit: number, daysHeld: number): number {
  return 0;

  const adjustedDaysHeld = Math.max(0, daysHeld) + 1;
  const taxRate =
    0.1 *
    Math.min(1, Math.max(0, 1 - Math.log(adjustedDaysHeld) / Math.log(8)));
  const taxAmount = Math.max(0, profit * taxRate);

  return taxAmount;
}

export function getBadgeImageServer(badge_id: string) {
  return process.env.IMAGE_HOSTING_URL + "/" + badge_id + ".png";
}

/*
 * This function maximizes the coins that can be displayed
 */

export function maxLimitCoins(coins: number) {
  return Math.min(COINS.MaxCoins, coins);
}

interface StockBuyableStatus {
  IsNotBannedRequirement: {
    Reason: string;
    Met: boolean;
  };
  RankRequirement: {
    Reason: string;
    Met: boolean;
  };
  RecentPlaycountRequirement: {
    Reason: string;
    Met: boolean;
  };
  AccountAgeRequirement: {
    Reason: string;
    Met: boolean;
  };
  PPRequirement: {
    // check globalPP
    Reason: string;
    Met: boolean;
  };
  RecentUnbanRequirement: {
    // Checked by seeing if rank has doubled over last 10 days
    Reason: string;
    Met: boolean;
  };
}

// If ALL of these requirements are met, then this stock can be bought

export interface monthlyPlaycountEntry {
  start_date: string;
  count: number;
}

export const calculateIfStockCanBeBought = (
  globalRank: number,
  globalPP: number,
  rankHistory: number[],
  monthlyPlaycount: monthlyPlaycountEntry[],
  joinDate: string
): {
  buyableStatus: StockBuyableStatus;
  canBeBought: boolean;
  reasonsNotMet: string[];
} => {
  const returnVal: StockBuyableStatus = {
    RankRequirement: {
      Reason: "be above rank 100,000",
      Met: false,
    },
    RecentPlaycountRequirement: {
      Reason: "have 1,000 playcount in the last 6 months",
      Met: false,
    },
    AccountAgeRequirement: {
      Reason: "be over 3 months old",
      Met: false,
    },
    PPRequirement: {
      Reason: "have above 4,000pp",
      Met: false,
    },
    RecentUnbanRequirement: {
      Reason: "not be recently unbanned",
      Met: false,
    },
    IsNotBannedRequirement: {
      Reason: "not be banned",
      Met: false,
    },
  };

  const reasonsNotMet: string[] = [];

  if (
    globalRank ||
    !(!globalPP && globalPP !== 0) ||
    rankHistory ||
    monthlyPlaycount
  ) {
    returnVal.IsNotBannedRequirement.Met = true;
  } else {
    reasonsNotMet.push(returnVal.IsNotBannedRequirement.Reason);
  }

  if (globalRank && globalRank <= 100000) {
    returnVal.RankRequirement.Met = true;
  } else {
    reasonsNotMet.push(returnVal.RankRequirement.Reason);
  }

  if (globalPP && globalPP >= 4000) {
    returnVal.PPRequirement.Met = true;
  } else {
    reasonsNotMet.push(returnVal.PPRequirement.Reason);
  }

  const today = new Date();

  // Recent Playcount Check
  if (monthlyPlaycount) {
    const sixMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 6));
    const recentPlaycount = monthlyPlaycount
      .filter(({ start_date }) => new Date(start_date) >= sixMonthsAgo)
      .reduce((total, { count }) => total + count, 0);
    if (recentPlaycount > 1000) {
      returnVal.RecentPlaycountRequirement.Met = true;
    } else {
      reasonsNotMet.push(returnVal.RecentPlaycountRequirement.Reason);
    }
  } else {
    reasonsNotMet.push(returnVal.RecentPlaycountRequirement.Reason);
  }

  // Account Age Check
  if (joinDate) {
    const joinDateTime = new Date(joinDate);
    const threeMonthsAgo = new Date(new Date().setMonth(today.getMonth() - 3));
    if (joinDateTime < threeMonthsAgo) {
      returnVal.AccountAgeRequirement.Met = true;
    } else {
      reasonsNotMet.push(returnVal.AccountAgeRequirement.Reason);
    }
  } else {
    reasonsNotMet.push(returnVal.AccountAgeRequirement.Reason);
  }

  function checkSignificantRankDrop(rankHistory: number[]) {
    // Check if the rankHistory has at least two elements
    if (!rankHistory || rankHistory.length < 2) {
      return false; // Not enough data to compare
    }

    // Get the last 10 entries, or fewer if there aren't 10
    const lastTenEntries = rankHistory.slice(-10);

    // Iterate through the last 10 entries to find if there's a significant drop
    for (let i = 0; i < lastTenEntries.length - 1; i++) {
      // No need to check the last entry against itself
      const currentRank = lastTenEntries[i];
      const nextRank = lastTenEntries[i + 1];

      // Check if the current rank is greater than 300 and there's a drop greater than a factor of the previous value
      if (currentRank > 300 && nextRank > currentRank * 2) {
        return true; // Found a significant drop
      }
    }

    return false; // No significant drop found in the last 10 entries
  }

  if (!checkSignificantRankDrop(rankHistory)) {
    returnVal.RecentUnbanRequirement.Met = true;
  } else {
    reasonsNotMet.push(returnVal.RecentUnbanRequirement.Reason);
  }

  const canBeBought = Object.values(returnVal).every(
    (requirement) => requirement.Met
  );

  return {
    buyableStatus: returnVal,
    canBeBought,
    reasonsNotMet,
  };
};

export const calculateIfStockCanBeSold = (
  buyableResponse: StockBuyableStatus
): boolean => {
  return buyableResponse.IsNotBannedRequirement.Met;
};

export const shootFireworks = () => {
  const duration = 5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    // since particles fall down, start a bit higher than random
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.2, 0.4), y: Math.random() - 0.2 },
      })
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.6, 0.8), y: Math.random() - 0.2 },
      })
    );
  }, 250);
};

export const formatCurrency = (amount = 0, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumIntegerDigits: 2,
  }).format(amount / 100);

export const didUserJustSubscribe = (query) => {
  const doesStripeSessionExist = !!query?.stripe_session_id;

  return doesStripeSessionExist;
};

export const getCleanErrorMessage = (error: Error) => {
  var caller_line = error.stack?.split("\n")[4];
  var index = caller_line.indexOf("at ");
  var clean = caller_line.slice(index + 2, caller_line.length);
  return clean;
};

/*
checkRebalance

This function checks if a rebalance ocurred. True if it did. False if it did not
*/
export function checkRebalance(
  oldPlays: { id: number; pp: number; date: string }[],
  newPlays: { id: number; pp: number; date: string }[]
): {didRebalance: boolean, rebalancedScores: {
  id: number;
  oldPP: number;
  newPP: number;
  date: string;
}[]} {
  const oldPlayMap = new Map(oldPlays.map(play => [play.id, play]));
  let rebalancedScores = 0;
  const rebalancedScoreDetails: { id: number; oldPP: number; newPP: number; date: string }[] = [];

  for (const newPlay of newPlays) {
    const oldPlay = oldPlayMap.get(newPlay.id);
    if (oldPlay !== undefined && oldPlay.pp !== newPlay.pp) {
      rebalancedScores++;
      rebalancedScoreDetails.push({
        id: newPlay.id,
        oldPP: oldPlay.pp,
        newPP: newPlay.pp,
        date: newPlay.date
      });
      if (rebalancedScores > 2) {
        console.log("Rebalanced scores:", rebalancedScoreDetails);
        return {didRebalance: true, rebalancedScores: rebalancedScoreDetails};
      }
    }
  }

  if (rebalancedScores > 0) {
    console.log("Rebalanced scores:", rebalancedScoreDetails);
  } else {
    console.log("No rebalanced scores detected.");
  }

  return {didRebalance: false, rebalancedScores: rebalancedScoreDetails};
}