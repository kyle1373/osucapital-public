set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
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
  ORDER BY coin_differential_24h DESC
  LIMIT 5;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_trending_and_most_traded_stocks()
 RETURNS TABLE(category text, stock_id bigint, osu_name character varying, share_price numeric, price_change_percentage numeric, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, trade_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    three_days_ago timestamp;
BEGIN
    three_days_ago := NOW() - INTERVAL '3 days';

    -- Get top 3 trending stocks based on share price increase over the past 3 days
    RETURN QUERY
    WITH min_prices AS (
        SELECT 
            sh.stock_id, 
            MIN(sh.price) as min_price
        FROM 
            stocks_history sh
        WHERE 
            sh.date >= three_days_ago
        GROUP BY 
            sh.stock_id
    )
    SELECT
        'Trending' as category,
        s.stock_id,
        s.osu_name,
        s.share_price,
        COALESCE(
            (s.share_price - mp.min_price) / NULLIF(mp.min_price, 0) * 100, 
            0.0
        ) as price_change_percentage,
        s.osu_picture,
        s.osu_rank,
        s.osu_pp,
        s.last_updated,
        NULL::bigint as trade_count
    FROM
        stocks s
        JOIN min_prices mp ON s.stock_id = mp.stock_id
    ORDER BY
        price_change_percentage DESC
    LIMIT 3;

    -- Get top 2 most traded stocks based on the number of 'buy' trade entries in the past 24 hours
    RETURN QUERY
    SELECT
        'Most Traded' as category,
        s.stock_id,
        s.osu_name,
        s.share_price,
        NULL::numeric as price_change_percentage,
        s.osu_picture,
        s.osu_rank,
        s.osu_pp,
        s.last_updated,
        COUNT(t.id) as trade_count
    FROM
        stocks s
        JOIN trades t ON s.stock_id = t.stock_id
    WHERE
        t.timestamp >= NOW() - INTERVAL '24 hours' AND
        t.type = 'buy'
    GROUP BY
        s.stock_id
    ORDER BY
        trade_count DESC
    LIMIT 2;
END;
$function$
;


