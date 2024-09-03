set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH user_latest_coins AS (
    SELECT
      DISTINCT ON (h.user_id) h.user_id,
      h.total_coins AS total_latest_coins
    FROM
      users_history h
    ORDER BY
      h.user_id, h.date DESC
  ),
  banned_trades AS (
    SELECT DISTINCT
      t.user_id
    FROM
      trades t
    WHERE
      t.timestamp >= now() - interval '1 day'
      AND t.sold_while_banned = TRUE
  )
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) AS total_coins,
    COALESCE(
      CASE 
        WHEN COALESCE(ua.total_latest_coins, 0) <= 0 THEN 0
        ELSE (
          (
            (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) - 
            COALESCE(ua.total_latest_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))) / 
            COALESCE(ua.total_latest_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))
          ) * 100
        )
      END, 0
    )::NUMERIC(13,2) AS coin_differential,
    (u.stripe_subscription_status = 'active') AS is_supporter,
    u.color_flare,
    u.osu_country_code
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN user_latest_coins ua ON u.user_id = ua.user_id
  LEFT JOIN banned_trades bt ON u.user_id = bt.user_id
  WHERE
    bt.user_id IS NULL
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner, ua.total_latest_coins
  ORDER BY coin_differential DESC
  LIMIT 10;
END;$function$
;


