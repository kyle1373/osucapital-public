import supabaseAdmin from "@lib/supabase/supabase";

export interface LeaderboardUser {
  user_id: number;
  osu_name: string;
  osu_picture: string;
  total_coins: number;
  coin_differential: number;
  is_supporter: boolean;
  color_flare: string;
  osu_country_code: string;
}

export const getLatestLeaderboardUsers = async (): Promise<
  LeaderboardUser[]
> => {
  try {
    let { data, error, status } = await supabaseAdmin.rpc(
      "get_latest_leaderboard"
    );

    if (error && status !== 406) {
      throw new Error(error.message);
    }

    return data.map((item) => ({
      user_id: item.user_id,
      osu_name: item.osu_name,
      osu_picture: item.osu_picture,
      total_coins: item.total_coins,
      coin_differential: item.coin_differential,
      is_supporter: item.is_supporter,
      color_flare: item.color_flare,
      osu_country_code: item.osu_country_code,
    }));
  } catch (error) {
    console.error("Error fetching leaderboard data:", error?.message);
    return [];
  }
};

export const getLatestFriendLeaderboardUsers = async (
  user_id: number
): Promise<LeaderboardUser[]> => {
  try {
    let { data, error, status } = await supabaseAdmin.rpc(
      "get_friends_leaderboard",
      { p_user_id: user_id }
    );

    if (error && status !== 406) {
      throw new Error(error.message);
    }

    return data.map((item) => ({
      user_id: item.user_id,
      osu_name: item.osu_name,
      osu_picture: item.osu_picture,
      total_coins: item.total_coins,
      coin_differential: item.coin_differential,
      is_supporter: item.is_supporter,
      color_flare: item.color_flare,
      osu_country_code: item.osu_country_code,
    }));
  } catch (error) {
    console.error("Error fetching friend leaderboard data:", error?.message);
    return [];
  }
};

export const getTopTradersToday = async (): Promise<LeaderboardUser[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from("top_traders")
      .select()
      .order("coin_differential", { ascending: false })
      .limit(15);

    if (error) {
      throw new Error(error.message);
    }
    console.log(JSON.stringify(data));

    return data.map((item) => ({
      user_id: item.user_id,
      osu_name: item.osu_name,
      osu_picture: item.osu_picture,
      total_coins: item.total_coins,
      coin_differential: item.coin_differential,
      is_supporter: item.is_supporter,
      color_flare: item.color_flare,
      osu_country_code: item.osu_country_code,
    }));
  } catch (error) {
    console.error("Error fetching friend leaderboard data:", error?.message);
    return [];
  }
};

export interface TopShareTraders {
  user_id: number;
  username: string;
  picture: string;
  num_shares: number;
}

export const getTopShareholders = async (
  stockId: number
): Promise<TopShareTraders[]> => {
  try {
    let { data, error } = await supabaseAdmin
      .from("users_stocks")
      .select("user_id, users(osu_name, osu_picture), num_shares")
      .eq("stock_id", stockId)
      .order("num_shares", { ascending: false })
      .limit(5);

    if (error) throw new Error(error.message);

    return data.map((item) => ({
      user_id: item.user_id,
      username: (item.users as any).osu_name,
      picture: (item.users as any).osu_picture,
      num_shares: item.num_shares,
    }));
  } catch (error) {
    console.error("Error fetching top shareholders:", error?.message);
    return [];
  }
};

export interface Season {
  season_id: number;
  season_name: string;
  start_date: string;
  end_date: string;
  description: string | null;
  color_code: string;
}

export const getSeason = async (seasonId: number): Promise<Season> => {
  try {
    let { data, error } = await supabaseAdmin
      .from("seasons")
      .select(
        "season_id, season_name, start_date, end_date, description, color_code"
      )
      .eq("season_id", seasonId)
      .single();

    if (error) throw new Error(error.message);

    return data;
  } catch (error) {
    console.error("Error fetching all seasons:", error?.message);
    return undefined;
  }
};

export const getAllSeasons = async (): Promise<Season[]> => {
  try {
    let { data, error } = await supabaseAdmin
      .from("seasons")
      .select(
        "season_id, season_name, start_date, end_date, description, color_code"
      )
      .order("start_date", { ascending: false });

    if (error) throw new Error(error.message);

    return data;
  } catch (error) {
    console.error("Error fetching all seasons:", error?.message);
    return [];
  }
};

export const getSeasonLeaderboards = async (
  seasonId: number
): Promise<LeaderboardUser[]> => {
  try {
    let { data, error } = await supabaseAdmin.rpc("get_top_players_by_season", {
      p_season_id: seasonId,
    });

    if (error) {
      throw error;
    }

    return data.map((item) => ({
      user_id: item.user_id,
      osu_name: item.osu_name,
      osu_picture: item.osu_picture,
      total_coins: item.total_coins,
      coin_differential: item.coin_differential,
      is_supporter: item.is_supporter,
      color_flare: item.color_flare,
      osu_country_code: item.osu_country_code,
    }));
  } catch (error) {
    console.error("Error fetching season leaderboards:", error?.message);
    return [];
  }
};
