CREATE INDEX idx_stocks_history_price ON public.stocks_history USING btree (price);

CREATE INDEX idx_stocks_history_stock_id_date ON public.stocks_history USING btree (stock_id, date);

CREATE INDEX idx_stocks_osu_rank ON public.stocks USING btree (osu_rank);

CREATE INDEX idx_stocks_share_price ON public.stocks USING btree (share_price);

CREATE INDEX idx_users_history_user_id_date ON public.users_history USING btree (user_id, date);

CREATE INDEX idx_users_stocks_stock_id ON public.users_stocks USING btree (stock_id);

CREATE INDEX idx_users_stocks_user_id ON public.users_stocks USING btree (user_id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_stocks()
 RETURNS SETOF stock_details_type
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        COALESCE(us.num_shares, 0.0) AS shares_owned,
        rank() OVER (ORDER BY s.share_price DESC) AS share_rank,
        COALESCE(
            (s.share_price - sh_avg.avg_price) / NULLIF(sh_avg.avg_price, 0) * 100,
            0.0
        )::numeric(10,2) AS share_price_change_percentage,
        s.osu_name,
        s.osu_picture,
        s.osu_banner,
        s.osu_rank,
        s.osu_pp,
        s.osu_rank_history,
        s.last_updated,
        COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history
    FROM
        stocks s
        LEFT JOIN users_stocks us ON s.stock_id = us.stock_id
        LEFT JOIN (
            SELECT
                sh.stock_id,
                AVG(sh.price) AS avg_price
            FROM
                stocks_history sh
            WHERE
                sh.date >= now() - interval '2 days'
            GROUP BY
                sh.stock_id
        ) sh_avg ON s.stock_id = sh_avg.stock_id
        LEFT JOIN (
            SELECT
                sh_hist.stock_id,
                json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json AS share_price_history
            FROM
                stocks_history sh_hist
            GROUP BY
                sh_hist.stock_id
        ) sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL
    ORDER BY
        share_price_change_percentage DESC, stock_id
    LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH user_average_coins AS (
    SELECT
      h.user_id,
      AVG(h.total_coins) AS avg_total_coins
    FROM
      users_history h
    WHERE
      h.date >= now() - interval '1 day'
    GROUP BY
      h.user_id
  )
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) AS total_coins,
    (
      u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) -
      COALESCE(ua.avg_total_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))
    )::NUMERIC(13,2) AS coin_differential
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN user_average_coins ua ON u.user_id = ua.user_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner, ua.avg_total_coins
  ORDER BY coin_differential DESC
  LIMIT 10;
END;
$function$
;


