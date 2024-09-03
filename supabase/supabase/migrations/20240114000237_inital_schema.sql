set check_function_bodies = off;

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
                json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json as share_price_history
            FROM
                stocks_history sh_hist
            WHERE sh_hist.stock_id IN (SELECT us_inner.stock_id FROM users_stocks us_inner WHERE us_inner.user_id = p_user_id)
            GROUP BY
                sh_hist.stock_id
        ) sp_history ON us.stock_id = sp_history.stock_id
    WHERE
        us.user_id = p_user_id AND s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL
    ORDER BY
        share_price_change_percentage DESC, us.stock_id
    LIMIT p_page_size + 1
    OFFSET (p_page - 1) * p_page_size;
END;
$function$
;


