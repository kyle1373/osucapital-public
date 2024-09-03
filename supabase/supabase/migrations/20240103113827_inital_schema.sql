set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id bigint)
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins double precision, coin_differential_24h double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) as total_coins,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) - uh.total_coins as coin_differential_24h
  FROM
    users u
    INNER JOIN friends f ON u.user_id = f.friend_id AND f.user_id = p_user_id
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


