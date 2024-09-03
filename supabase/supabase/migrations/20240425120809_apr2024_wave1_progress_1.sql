ALTER TYPE user_details_type ADD ATTRIBUTE is_supporter boolean;
ALTER TYPE user_details_type ADD ATTRIBUTE color_flare text;
ALTER TYPE user_details_type ADD ATTRIBUTE osu_country_code text;

ALTER TYPE leaderboard_entry_type ADD ATTRIBUTE is_supporter boolean;
ALTER TYPE leaderboard_entry_type ADD ATTRIBUTE color_flare text;
ALTER TYPE leaderboard_entry_type ADD ATTRIBUTE osu_country_code text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id bigint)
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    public.ensure_max_coins((u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(100,2)) AS total_coins,
    (
        (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(100,2) -
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
            (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(100,2)
        )
    )::numeric(100,2) AS coin_differential,
    (u.stripe_subscription_status = 'active') AS is_supporter,
    u.color_flare,
    u.osu_country_code
  FROM
    users u
    LEFT JOIN friends f ON u.user_id = f.friend_id AND f.user_id = p_user_id
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  WHERE f.friend_id IS NOT NULL OR u.user_id = p_user_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_leaderboard()
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    public.ensure_max_coins(u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(100,2)) AS total_coins,
    (
        u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(100,2) - 
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
            u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(100,2)
        )
    )::numeric(100,2) AS coin_differential,
    (u.stripe_subscription_status = 'active') AS is_supporter,
    u.color_flare,
    u.osu_country_code
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

DROP FUNCTION if exists public.get_top_players_by_season(p_season_id integer);

CREATE OR REPLACE FUNCTION public.get_top_players_by_season(p_season_id integer)
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        sl.user_id,
        u.osu_name,
        u.osu_picture,
        u.osu_banner,
        sl.total_coins,
        0.0 as coin_differential,
        (u.stripe_subscription_status = 'active') AS is_supporter,
        u.color_flare,
        u.osu_country_code
    FROM
        season_leaderboards sl
    JOIN
        users u ON u.user_id = sl.user_id
    WHERE
        sl.season_id = p_season_id
    ORDER BY
        sl.total_coins DESC
    LIMIT 100;
END;
$function$
;
