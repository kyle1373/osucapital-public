set check_function_bodies = off;

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
      (COALESCE(SUM(s.share_price * us.num_shares), 0))::numeric(10,2) AS coins_invested,
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
      MIN(ru.global_rank) AS min_friend_rank
    FROM 
      friends f
      INNER JOIN ranked_users ru ON f.friend_id = ru.user_id
    WHERE 
      f.user_id = user_req
    GROUP BY f.user_id
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


