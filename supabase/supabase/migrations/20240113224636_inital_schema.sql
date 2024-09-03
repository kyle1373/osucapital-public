set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_stocks()
 RETURNS TABLE(stock_id bigint, share_price numeric, shares_owned numeric, share_rank bigint, share_price_change_percentage numeric, osu_name character varying, osu_picture text, osu_rank integer, osu_pp numeric, last_updated timestamp with time zone, share_price_history json)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (s.stock_id)
        s.stock_id,
        s.share_price,
        COALESCE(us.num_shares, 0.0) as shares_owned,
        rank() OVER (ORDER BY s.share_price DESC) as share_rank,
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
        stocks s
        LEFT JOIN users_stocks us ON s.stock_id = us.stock_id
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
        ) latest_price ON s.stock_id = latest_price.stock_id
        LEFT JOIN (
            SELECT
                sh_hist.stock_id,
                json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json as share_price_history
            FROM
                stocks_history sh_hist
            GROUP BY
                sh_hist.stock_id
        ) sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL
    ORDER BY
        share_price_change_percentage DESC, s.stock_id
    LIMIT 5;
END;
$function$
;


