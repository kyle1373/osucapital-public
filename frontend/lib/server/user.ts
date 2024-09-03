import { User } from "@/hooks/UserContext";
import { kvReadOnly, kvReadWrite } from "@/lib/kv";
import supabaseAdmin from "@lib/supabase/supabase";
import { getBadgeImageServer, maxLimitCoins } from "@lib/utils";

export interface UserStats {
  user_id: number;
  osu_name: string;
  osu_picture: string;
  osu_banner: string;
  coins_held: number;
  coins_invested: number;
  user_history: {
    date: string;
    coins: number;
    net_worth: number;
    global_rank: number;
    friend_rank: number;
  }[];
  badges: {
    badge_id: string;
    name: string;
    description: string;
    created_at: string;
  }[];
  global_rank: number;
  friend_rank: number;
  show_trades: boolean;
  liable_taxes: number;
  is_supporter: boolean;
  color_flare: string;
  osu_country_code: string;
}

export const checkIfStockExists = async (userId: number): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("stocks")
    .select("stock_id")
    .eq("stock_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return data.length > 0;
};

export const getUserStats = async (user_id: number): Promise<UserStats> => {
  const { data, error } = await supabaseAdmin
    .rpc("get_user_details", { user_req: user_id })
    .single();

  if (error) {
    throw new Error("Error occurred in getUserStats " + JSON.stringify(error));
  }

  const formattedCoinHistory: {
    date: string;
    coins: number;
    net_worth: number;
    global_rank: number;
    friend_rank: number;
  }[] = (data as UserStats).user_history.map((val, index, array) => {
    return {
      date:
        array.length -
        index +
        (index === array.length - 1 ? " day ago" : " days ago"),
      coins: maxLimitCoins(val.coins),
      net_worth: maxLimitCoins(val.net_worth),
      global_rank: val.global_rank,
      friend_rank: val.friend_rank,
    };
  });

  formattedCoinHistory.push({
    date: "Today",
    coins: maxLimitCoins(
      (data as UserStats).coins_held + (data as UserStats).coins_invested
    ),
    net_worth: maxLimitCoins(
      (data as UserStats).coins_held +
        (data as UserStats).coins_invested -
        (data as UserStats).liable_taxes
    ),
    global_rank: (data as UserStats).global_rank,
    friend_rank: (data as UserStats).friend_rank,
  });

  (data as UserStats).user_history = formattedCoinHistory;

  return data as UserStats;
};

export const getUserBySession = async (userSession: string): Promise<User> => {
  if (!userSession) {
    return null;
  }
  const pulledUser: User | null = await kvReadOnly.get(userSession);

  if (!pulledUser) {
    return null;
  }
  const keys = Object.keys(pulledUser);
  for (const key of keys) {
    if (pulledUser[key] === null || pulledUser[key] === undefined) {
      await kvReadWrite.del(userSession);
      return null;
    }
  }

  return pulledUser;
};

export interface UserTradeInfo {
  stock_id: number;
  stock_name: string;
  type: "buy" | "sell";
  num_shares: number;
  coins: number;
  timestamp: string;
  profit: number;
  coins_with_taxes: number;
}

export const getUserTradeHistory = async (
  userId: number,
  limit: number
): Promise<UserTradeInfo[]> => {
  const tradeHistory = await supabaseAdmin
    .from("trades")
    .select(
      "stock_id, stocks(osu_name), type, num_shares, timestamp, coins, profit, coins_with_taxes"
    )
    .order("timestamp", { ascending: false }) // Sort by timestamp in descending order
    .limit(limit)
    .eq("user_id", userId);

  if (tradeHistory.error) {
    throw new Error(tradeHistory.error.message);
  }

  const formattedData = tradeHistory.data.map((data) => {
    // Typescript seems to think users is an array when it's actually one object.
    // This is just used to remove the typescript error.
    const stocks: any = data.stocks;
    return { ...data, stock_name: stocks.osu_name };
  });

  return formattedData;
};

export const getUserFriendConnection = async (
  user_id: number,
  friend_id: number
): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from("friends")
    .select()
    .eq("user_id", user_id)
    .eq("friend_id", friend_id);

  if (error) {
    throw new Error(error.message);
  }

  return data.length > 0;
};

export const addFriendConnection = async (
  user_id: number,
  friend_id: number
) => {
  const { error } = await supabaseAdmin.from("friends").upsert({
    user_id: user_id,
    friend_id: friend_id,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }
};

export const removeFriendConnection = async (
  user_id: number,
  friend_id: number
) => {
  const { error } = await supabaseAdmin
    .from("friends")
    .delete()
    .eq("user_id", user_id)
    .eq("friend_id", friend_id);

  if (error) {
    throw new Error(error.message);
  }
};

export const getUserHeldCoins = async (user_id: number): Promise<number> => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("coins_held")
    .eq("user_id", user_id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.coins_held;
};

export interface Settings {
  show_trades?: boolean;
  color_flare?: string;
}
export const updateSettings = async (
  user_id: number,
  updated_settings: Settings
): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("users")
    .update(updated_settings)
    .eq("user_id", user_id);

  if (error) {
    throw new Error(error.message);
  }
};

export const getSettingsAndSubscriptionStatus = async (
  user_id: string
): Promise<{
  settings: Settings;
  username: string;
  joined_datetime: string;
  country_code: string;
  picture: string;
  isSubscribed: boolean;
  stripeCustomerId: string;
}> => {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(
      "osu_picture, osu_name, show_trades, color_flare, stripe_subscription_status, stripe_customer_id, joined, osu_country_code"
    )
    .eq("user_id", user_id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    username: data.osu_name,
    joined_datetime: data.joined,
    country_code: data.osu_country_code,
    picture: data.osu_picture,
    settings: {
      show_trades: data.show_trades,
      color_flare: data.color_flare,
    },
    isSubscribed: data.stripe_subscription_status === "active",
    stripeCustomerId: data.stripe_customer_id,
  };
};

// This function is used to get the badge image via the server itself and not the client. On the client if we did .env variables they would be undefined on first load. We gotta do this on the server.
export interface UserBadges {
  badge_id: string;
  badge_image: string;
  name: string;
  description: string;
  created_at: string;
}
export const getUserBadges = (userStats: UserStats): UserBadges[] => {
  const userBadges = userStats.badges?.map((badge) => {
    return {
      ...badge,
      badge_image: getBadgeImageServer(badge.badge_id),
    };
  });

  if (!userBadges) {
    return [];
  }
  return userBadges;
};

export const getNumUsers = async () => {
  const { data, error, count } = await supabaseAdmin
    .from("users")
    .select("*", { count: "exact" });

  if (error) {
    console.log("ERROR GETTING NUMBER OF USERS: " + error.message);
    return null;
  }

  return count;
};
