DROP FUNCTION public.get_trending_and_most_traded_stocks();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_trending_and_most_traded_stocks()
 RETURNS TABLE(category text, stock_id bigint, osu_name character varying, share_price numeric, price_change_percentage numeric, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, trade_count bigint, share_price_history json)
 LANGUAGE plpgsql
AS $function$
DECLARE
    three_days_ago timestamp;
BEGIN
    three_days_ago := NOW() - INTERVAL '3 days';

    -- Subquery to get share price history
    WITH share_price_history AS (
        SELECT
            sh.stock_id,
            json_agg(json_build_object('date', sh.date, 'price', sh.price) ORDER BY sh.date) as share_price_history
        FROM
            stocks_history sh
        GROUP BY
            sh.stock_id
    )
    -- Get top 3 trending stocks
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
    ),
    trending_stocks AS (
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
            NULL::bigint as trade_count,
            COALESCE(sp_history.share_price_history::json, '[]'::json)
        FROM
            stocks s
            JOIN min_prices mp ON s.stock_id = mp.stock_id
            LEFT JOIN share_price_history sp_history ON s.stock_id = sp_history.stock_id
        ORDER BY
            price_change_percentage DESC
        LIMIT 3
    )
    SELECT * FROM trending_stocks;

    -- Get top 2 most traded stocks
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
        COUNT(t.id) as trade_count,
        COALESCE(sp_history.share_price_history::json, '[]'::json)
    FROM
        stocks s
        JOIN trades t ON s.stock_id = t.stock_id
        LEFT JOIN share_price_history sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        t.timestamp >= NOW() - INTERVAL '24 hours' AND
        t.type = 'buy'
    GROUP BY
        s.stock_id, sp_history.share_price_history
    ORDER BY
        trade_count DESC
    LIMIT 2;
END;
$function$;
