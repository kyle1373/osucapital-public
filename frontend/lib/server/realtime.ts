import supabaseAdmin from "@lib/supabase/supabase";

export interface OsuPlayerQueueItem {
  osu_id: number;
  osu_country_code: string;
  osu_picture: {
    old: string;
    new: string;
  };
  osu_username: {
    old: string;
    new: string;
  };
  osu_pp: {
    old: number;
    new: number;
  };
  osu_rank: {
    old: number;
    new: number;
  };
  osu_playcount: {
    old: number;
    new: number;
  };
  prior_update_datetime: string;
  current_update_datetime: string;
}

export const insertDataIntoRealtime = async (items: OsuPlayerQueueItem[]) => {
  items.sort((a, b) =>
    a.current_update_datetime.localeCompare(b.current_update_datetime)
  );

  const data = items.map((item) => ({
    osu_id: item.osu_id,
    osu_country_code: item.osu_country_code,
    osu_pp_old: item.osu_pp.old,
    osu_pp_new: item.osu_pp.new,
    osu_rank_old: item.osu_rank.old,
    osu_rank_new: item.osu_rank.new,
    osu_playcount_old: item.osu_playcount.old,
    osu_playcount_new: item.osu_playcount.new,
    osu_picture_old: item.osu_picture.old,
    osu_picture_new: item.osu_picture.new,
    osu_username_old: item.osu_username.old,
    osu_username_new: item.osu_username.new,
    pp_changed: item.osu_pp.old !== item.osu_pp.new,
    profile_changed:
      item.osu_username.old !== item.osu_username.new ||
      item.osu_picture.old !== item.osu_picture.new,
    playcount_changed: item.osu_playcount.old !== item.osu_playcount.new,
    created_at: item.current_update_datetime, // Assuming the created_at should be set to the current update time
  }));

  try {
    const { error } = await supabaseAdmin.from("realtime_logs").insert(data);
    if (error) throw new Error(error.message);
    console.log("Data successfully inserted into realtime_logs");
  } catch (error) {
    console.error("Error inserting data into realtime_logs:", error.message);
    throw error;
  }
};

export type QueryRealtimeLogsParams = {
  searchPpChanges: boolean;
  searchProfileChanges: boolean;
  searchPlaycountChanges: boolean;
  userIDs?: number[];
  afterLogID?: number;
  limit?: number;
};

export type QueryRealtimeLogsReturn = {
  type: "profile_change" | "pp_change" | "playcount_change";
  datetime: string;
  osu_id: number;
  osu_picture: string;
  osu_name: string;
  osu_rank: number;
  osu_pp: number;
  osu_country_code: string;
  changes: {
    osu_picture?: {
      old: string;
      new: string;
    };
    osu_username?: {
      old: string;
      new: string;
    };
    osu_pp?: {
      old: number;
      new: number;
    };
    osu_rank?: {
      old: number;
      new: number;
    };
    osu_playcount?: {
      old: number;
      new: number;
    };
  };
};

export const queryRealtimeLogs = async ({
  searchPpChanges,
  searchProfileChanges,
  searchPlaycountChanges,
  userIDs,
  afterLogID,
  limit = 300,
}: QueryRealtimeLogsParams): Promise<QueryRealtimeLogsReturn[]> => {
  if (!searchPpChanges && !searchProfileChanges && !searchPlaycountChanges) {
    return [];
  }
  let query = supabaseAdmin
    .from("realtime_logs")
    .select(
      `
        id,
        created_at,
        osu_id,
        osu_picture_old,
        osu_picture_new,
        osu_username_old,
        osu_username_new,
        osu_pp_old,
        osu_pp_new,
        osu_rank_old,
        osu_rank_new,
        osu_playcount_old,
        osu_playcount_new,
        osu_country_code,
        pp_changed,
        profile_changed,
        playcount_changed
      `
    )
    .order("id", { ascending: false })
    .limit(limit);

  if (userIDs && userIDs.length > 0) {
    query = query.in("osu_id", userIDs);
  }

  if (afterLogID) {
    query = query.gt("id", afterLogID);
  }

  let conditions = [];
  if (searchPpChanges) {
    conditions.push("pp_changed.is.true");
  }
  if (searchProfileChanges) {
    conditions.push("profile_changed.is.true");
  }
  if (searchPlaycountChanges) {
    conditions.push("playcount_changed.is.true");
  }

  if (conditions.length > 0) {
    query = query.or(conditions.join(","));
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to query database: ${error.message}`);
  }

  const results: QueryRealtimeLogsReturn[] = [];

  data.forEach((row) => {
    if (row.pp_changed && searchPpChanges) {
      results.push(transformRow(row, "pp_change"));
    }
    if (row.playcount_changed && searchPlaycountChanges) {
      results.push(transformRow(row, "playcount_change"));
    }
    if (row.profile_changed && searchProfileChanges) {
      results.push(transformRow(row, "profile_change"));
    }
  });

  return results;
};

function transformRow(
  row: any,
  type: "profile_change" | "pp_change" | "playcount_change"
): QueryRealtimeLogsReturn {
  return {
    type: type,
    datetime: row.created_at,
    osu_id: row.osu_id,
    osu_picture: row.osu_picture_new,
    osu_name: row.osu_username_new,
    osu_rank: row.osu_rank_new,
    osu_pp: row.osu_pp_new,
    osu_country_code: row.osu_country_code,
    changes: {
      osu_picture:
        type === "profile_change"
          ? { old: row.osu_picture_old, new: row.osu_picture_new }
          : null,
      osu_username:
        type === "profile_change"
          ? { old: row.osu_username_old, new: row.osu_username_new }
          : null,
      osu_pp:
        type === "pp_change"
          ? { old: row.osu_pp_old, new: row.osu_pp_new }
          : null,
      osu_rank:
        type === "pp_change"
          ? { old: row.osu_rank_old, new: row.osu_rank_new }
          : null,
      osu_playcount:
        type === "playcount_change"
          ? { old: row.osu_playcount_old, new: row.osu_playcount_new }
          : null,
    },
  };
}
