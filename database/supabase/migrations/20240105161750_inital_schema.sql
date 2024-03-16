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
    (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0))::numeric(10,2) as total_coins,
    (u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) - uh.total_coins)::numeric(10,2) as coin_differential_24h
  FROM
    users u
    LEFT JOIN friends f ON u.user_id = f.friend_id AND f.user_id = p_user_id
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN LATERAL (
      SELECT h.total_coins
      FROM users_history h
      WHERE h.user_id = u.user_id
      ORDER BY h.date DESC
      LIMIT 1
    ) uh ON true
  WHERE f.friend_id IS NOT NULL OR u.user_id = p_user_id
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
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(10,2) as total_coins,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0)::numeric(10,2) - uh.total_coins as coin_differential_24h
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

CREATE OR REPLACE FUNCTION public.get_stock_stats(p_stock_id bigint, p_user_id bigint)
 RETURNS TABLE(stock_id bigint, share_price numeric, shares_owned numeric, share_rank bigint, share_price_change_percentage numeric, osu_id bigint, osu_name character varying, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, share_price_history json)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price::numeric(10,2),
        COALESCE(SUM(us.num_shares), 0.0)::numeric(10,2) as shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint as share_rank,
        ((s.share_price - lag(s.share_price) OVER (ORDER BY s.last_updated)) / lag(s.share_price) OVER (ORDER BY s.last_updated) * 100)::numeric(10,2) as share_price_change_percentage,
        s.stock_id as osu_id,
        s.osu_name,
        s.osu_picture,
        s.osu_rank,
        s.osu_pp::numeric(10,2),
        s.last_updated,
        COALESCE(sp_history.share_price_history::json, '[]'::json) as share_price_history
    FROM
        stocks s
        LEFT JOIN users_stocks us ON s.stock_id = us.stock_id AND us.user_id = COALESCE(p_user_id, us.user_id)
        LEFT JOIN (
            SELECT
                sh.stock_id,
                json_agg(json_build_object('date', sh.date, 'price', sh.price))::text as share_price_history
            FROM
                stocks_history sh
            GROUP BY
                sh.stock_id
        ) sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        s.stock_id = p_stock_id
    GROUP BY
        s.stock_id, sp_history.share_price_history;
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
      COALESCE(SUM(s.share_price * us.num_shares), 0)::numeric(10,2) AS coins_invested,
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

CREATE OR REPLACE FUNCTION public.get_user_stocks(p_user_id bigint, p_page integer, p_page_size integer)
 RETURNS TABLE(stock_id bigint, share_price numeric, shares_owned numeric, share_rank bigint, share_price_change_percentage numeric, osu_id bigint, osu_name character varying, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, share_price_history json)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        us.num_shares as shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint as share_rank,
        COALESCE(
            (s.share_price - latest_price.price) / NULLIF(latest_price.price, 0) * 100, 
            0.0
        )::numeric(10,2) as share_price_change_percentage,
        s.stock_id as osu_id,
        s.osu_name,
        s.osu_picture,
        s.osu_rank,
        s.osu_pp,
        s.last_updated,
        COALESCE(sp_history.share_price_history, '[]'::json) as share_price_history
    FROM
        users_stocks us
        INNER JOIN stocks s ON us.stock_id = s.stock_id
        LEFT JOIN (
            SELECT 
                sh.stock_id, 
                sh.price 
            FROM 
                stocks_history sh
                INNER JOIN (
                    SELECT 
                        sh_max.stock_id, 
                        MAX(sh_max.date) as max_date 
                    FROM 
                        stocks_history sh_max
                    GROUP BY 
                        sh_max.stock_id
                ) sh_latest ON sh.stock_id = sh_latest.stock_id AND sh.date = sh_latest.max_date
        ) latest_price ON us.stock_id = latest_price.stock_id
        LEFT JOIN (
            SELECT
                sh_hist.stock_id,
                json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date DESC)::json as share_price_history
            FROM
                stocks_history sh_hist
            WHERE sh_hist.stock_id IN (SELECT us_inner.stock_id FROM users_stocks us_inner WHERE us_inner.user_id = p_user_id)
            GROUP BY
                sh_hist.stock_id
        ) sp_history ON us.stock_id = sp_history.stock_id
    WHERE
        us.user_id = p_user_id
    ORDER BY
        us.num_shares DESC, us.stock_id
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$function$
;


