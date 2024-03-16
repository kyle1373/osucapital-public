drop type "public"."stock_stats";

drop function if exists "public"."get_latest_leaderboard"();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id bigint)
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins numeric, coin_differential_24h numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0))::numeric(10,3) as total_coins,
    (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) - uh.total_coins)::numeric(10,3) as coin_differential_24h
  FROM
    users u
    LEFT JOIN friends f ON u.user_id = f.friend_id
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN LATERAL (
      SELECT h.total_coins
      FROM users_history h
      WHERE h.user_id = u.user_id
      ORDER BY h.date DESC
      LIMIT 1
    ) uh ON true
  WHERE f.user_id = p_user_id OR u.user_id = p_user_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, uh.total_coins
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_leaderboard()
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins numeric, coin_differential_24h numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(10,3) as total_coins,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(10,3) - uh.total_coins as coin_differential_24h
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN LATERAL (
      SELECT h.total_coins
      FROM users_history h
      WHERE h.user_id = u.user_id
      ORDER BY h.date DESC
      LIMIT 1
    ) uh ON true
  GROUP BY u.user_id, u.osu_name, u.osu_picture, uh.total_coins
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_details(user_req bigint)
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, coins_held numeric, coins_invested numeric, coin_history json, global_rank bigint, friend_rank bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY 
  WITH ranked_users AS (
    SELECT 
      u.user_id,
      u.coins_held,
      COALESCE(SUM(s.share_price * us.num_shares), 0) AS coins_invested,
      RANK() OVER (ORDER BY (u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC)::bigint AS global_rank
    FROM 
      users u
      LEFT JOIN users_stocks us ON u.user_id = us.user_id
      LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id
  ),
  friend_ranking AS (
  SELECT 
    f.user_id,
    LEAST(MIN(ru.global_rank), ru_self.global_rank) AS min_friend_rank
  FROM 
    friends f
    INNER JOIN ranked_users ru ON f.friend_id = ru.user_id
    INNER JOIN ranked_users ru_self ON f.user_id = ru_self.user_id
  WHERE 
    f.user_id = user_req
  GROUP BY f.user_id, ru_self.global_rank
)
  SELECT 
    ru.user_id,
    u.osu_name,
    u.osu_picture,
    ru.coins_held,
    ru.coins_invested,
    COALESCE((SELECT json_agg(json_build_object('date', uh.date, 'coins', uh.total_coins))
              FROM users_history uh WHERE uh.user_id = ru.user_id), '[]'::json) AS coin_history,
    COALESCE(ru.global_rank, 1) AS global_rank,
    COALESCE(fr.min_friend_rank, 1) AS friend_rank
  FROM 
    ranked_users ru
    INNER JOIN users u ON ru.user_id = u.user_id
    LEFT JOIN friend_ranking fr ON ru.user_id = fr.user_id
  WHERE 
    ru.user_id = user_req;
END; $function$
;


