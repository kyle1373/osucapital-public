import osuClient from "@/lib/osuClient";
import supabaseAdmin from "@/lib/supabase/supabase";

export interface SearchResult {
  type: "Trader" | "Stock";
  osu_id: number;
  osu_name: string;
  osu_picture: string;
}

export const searchTradersAndStocks = async (
  query: string,
  stocksEnabled=true,
  tradersEnabled=true
): Promise<SearchResult[]> => {
  query = query?.trim()
  if(!query || query === ""){
    return []
  }

  const osuData = await osuClient.site.search({
    query: query,
  });

  let stocks: SearchResult[] = [];
  let traders: SearchResult[] = [];

  if (stocksEnabled) {
    stocks = osuData.user.data.map((osuUser) => ({
      type: "Stock",
      osu_id: osuUser.id,
      osu_name: osuUser.username,
      osu_picture: osuUser.avatar_url,
    }));
  }

  if (tradersEnabled) {
    const osu_ids: number[] = osuData.user.data.map((user) => user.id);

    const traderUsers = await supabaseAdmin
    .from('users')
    .select('user_id, osu_name, osu_picture')
    .in('user_id', osu_ids);

    if(traderUsers.error){
      throw new Error(traderUsers.error.message);
    }

    traders = traderUsers.data.map((trader) => ({
      type: "Trader",
      osu_id: trader.user_id,
      osu_name: trader.osu_name,
      osu_picture: trader.osu_picture,
    }));
  }

  // Create a map of traders for quick lookup
  const traderMap = new Map<number, SearchResult>();
  traders.forEach((trader) => {
    traderMap.set(trader.osu_id, trader);
  });

  // Insert traders before their respective stocks
  let stocksAndTraders: SearchResult[] = [];

  if (!stocksEnabled && tradersEnabled) {
    stocksAndTraders = traders;
  } else {
    stocks.forEach((stock) => {
      const trader = traderMap.get(stock.osu_id);
      if (trader) {
        stocksAndTraders.push(trader);
      }
      stocksAndTraders.push(stock);
    });
  }

  return stocksAndTraders;
};