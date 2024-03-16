set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_trending_and_most_traded_stocks()
 RETURNS TABLE(category text, stock_id bigint, osu_name character varying, share_price numeric, price_change_percentage numeric, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, trade_count bigint, share_price_history json)
 LANGUAGE plpgsql
AS $function$
DECLARE
    three_days_ago timestamp;
BEGIN
    three_days_ago := NOW() - INTERVAL '3 days';

    -- Subquery for aggregating share price history
    -- This needs to be repeated within each separate query block
    -- First Query Block: Trending Stocks
    RETURN QUERY
    WITH sp_history AS (
        SELECT
            sh.stock_id,
            json_agg(json_build_object('date', sh.date, 'price', sh.price) ORDER BY sh.date) as share_price_history
        FROM
            stocks_history sh
        GROUP BY
            sh.stock_id
    ),
    min_prices AS (
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
        NULL::bigint as trade_count,
        sp.share_price_history
    FROM
        stocks s
        JOIN min_prices mp ON s.stock_id = mp.stock_id
        LEFT JOIN sp_history sp ON s.stock_id = sp.stock_id
    ORDER BY
        price_change_percentage DESC
    LIMIT 3;

    -- Second Query Block: Most Traded Stocks
    -- Handling trade count separately to avoid GROUP BY clause issue
    RETURN QUERY
    WITH trade_counts AS (
        SELECT
            t.stock_id,
            COUNT(t.id) as trade_count
        FROM
            trades t
        WHERE
            t.timestamp >= NOW() - INTERVAL '24 hours' AND
            t.type = 'buy'
        GROUP BY
            t.stock_id
    ),
    sp_history AS (
        SELECT
            sh.stock_id,
            json_agg(json_build_object('date', sh.date, 'price', sh.price) ORDER BY sh.date) as share_price_history
        FROM
            stocks_history sh
        GROUP BY
            sh.stock_id
    )
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
        tc.trade_count,
        sp.share_price_history
    FROM
        stocks s
        JOIN trade_counts tc ON s.stock_id = tc.stock_id
        LEFT JOIN sp_history sp ON s.stock_id = sp.stock_id
    ORDER BY
        tc.trade_count DESC
    LIMIT 2;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_10_stocks()
 RETURNS TABLE(stock_id bigint, share_price numeric, shares_owned numeric, share_rank bigint, share_price_change_percentage numeric, osu_name character varying, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, share_price_history json)
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
                json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json as share_price_history
            FROM
                stocks_history sh_hist
            GROUP BY
                sh_hist.stock_id
        ) sp_history ON us.stock_id = sp_history.stock_id
    ORDER BY
        share_price_change_percentage DESC, us.stock_id
    LIMIT 10;
END;
$function$;
