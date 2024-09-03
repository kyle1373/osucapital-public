set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$BEGIN
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
    COALESCE(
      CASE 
        WHEN COALESCE(ua.avg_total_coins, 0) <= 0 THEN 0
        ELSE (
          (
            (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) - 
            COALESCE(ua.avg_total_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))) / 
            COALESCE(ua.avg_total_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))
          ) * 100
        )
      END, 0
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


