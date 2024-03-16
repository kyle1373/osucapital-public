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
      COALESCE(SUM(s.share_price * us.num_shares), 0)::numeric(10,3) AS coins_invested,
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
        ) as share_price_change_percentage,
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


