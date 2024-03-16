drop function if exists "public"."get_friends_leaderboard"(p_user_id bigint);

drop function if exists "public"."get_latest_leaderboard"();

drop function if exists "public"."get_top_traders_today"();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id bigint)
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins numeric, coin_differential numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0))::numeric(10,2) as total_coins,
    (
        (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0))::numeric(10,2) - 
        COALESCE(
            (SELECT AVG(hist.total_coins) 
             FROM (
                 SELECT h.total_coins 
                 FROM users_history h
                 WHERE h.user_id = u.user_id
                 ORDER BY h.date DESC 
                 LIMIT 2
             ) hist
            ), 
            (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0))::numeric(13,2)
        )
    )::numeric(13,2) as coin_differential
  FROM
    users u
    LEFT JOIN friends f ON u.user_id = f.friend_id AND f.user_id = p_user_id
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  WHERE f.friend_id IS NOT NULL OR u.user_id = p_user_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_leaderboard()
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins numeric, coin_differential numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(10,2) as total_coins,
    (
        u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(10,2) - 
        COALESCE(
            (SELECT AVG(hist.total_coins) 
             FROM (
                 SELECT h.total_coins 
                 FROM users_history h
                 WHERE h.user_id = u.user_id
                 ORDER BY h.date DESC 
                 LIMIT 2
             ) hist
            ), 
            u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(13,2)
        )
    )::numeric(13,2) as coin_differential
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins numeric, coin_differential numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) as total_coins,
    (
        u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) - 
        COALESCE(
            (SELECT AVG(hist.total_coins) 
             FROM (
                 SELECT h.total_coins 
                 FROM users_history h
                 WHERE h.user_id = u.user_id
                 ORDER BY h.date DESC 
                 LIMIT 2
             ) hist
            ), 
            u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)
        )
    )::NUMERIC(13,2) as coin_differential
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture
  ORDER BY coin_differential DESC
  LIMIT 5;
END;
$function$
;


