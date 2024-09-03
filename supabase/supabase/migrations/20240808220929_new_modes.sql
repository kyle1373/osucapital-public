drop index if exists "public"."idx_trending_stocks_share_price_change_percentage";

drop materialized view if exists "public"."trending_stocks";

create materialized view "public"."trending_stocks" as  SELECT s.stock_id,
    s.share_price,
    rank() OVER (ORDER BY s.share_price DESC) AS share_rank,
    ( SELECT (COALESCE((((s.share_price - avg(sh_hist.price)) / NULLIF(avg(sh_hist.price), (0)::numeric)) * (100)::numeric), 0.0))::numeric(100,2) AS "coalesce"
           FROM ( SELECT sh_hist_1.price
                   FROM stocks_history sh_hist_1
                  WHERE (sh_hist_1.stock_id = s.stock_id)
                  ORDER BY sh_hist_1.date DESC
                 LIMIT 2) sh_hist) AS share_price_change_percentage,
    COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history,
    s.osu_name,
    s.osu_picture,
    s.osu_banner,
    s.osu_rank,
    s.osu_pp,
    s.osu_rank_history,
    s.last_updated,
    s.osu_playcount_history,
    s.osu_join_date,
    s.is_buyable,
    s.prevent_trades,
    s.osu_country_code,
    s.is_sellable,
    s.is_banned,
    s.mode
   FROM (stocks s
     LEFT JOIN ( SELECT sh_hist.stock_id,
            json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date DESC) AS share_price_history
           FROM stocks_history sh_hist
          GROUP BY sh_hist.stock_id) sp_history ON ((s.stock_id = sp_history.stock_id)))
  WHERE ((s.share_price IS NOT NULL) AND (s.osu_rank IS NOT NULL) AND (s.is_buyable IS NOT FALSE) AND (s.prevent_trades IS NOT TRUE));



