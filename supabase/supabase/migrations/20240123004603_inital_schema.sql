set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_stocks()
 RETURNS SETOF stock_details_type
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT DISTINCT ON (s.stock_id)
            s.stock_id,
            s.share_price,
            0.0 AS shares_owned,
            rank() OVER (ORDER BY s.share_price DESC) AS share_rank,
            (
                SELECT COALESCE(
                    (s.share_price - AVG(sh_hist.price)) / NULLIF(AVG(sh_hist.price), 0) * 100, 
                    0.0
                )::numeric(10,2)
                FROM (
                    SELECT price 
                    FROM stocks_history sh_hist
                    WHERE sh_hist.stock_id = s.stock_id 
                    ORDER BY sh_hist.date DESC 
                    LIMIT 2
                ) sh_hist
            ) AS share_price_change_percentage,
            s.osu_name,
            s.osu_picture,
            s.osu_banner,
            s.osu_rank,
            s.osu_pp,
            s.osu_rank_history,
            s.last_updated,
            COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history
        FROM
            stocks s
            LEFT JOIN users_stocks us ON s.stock_id = us.stock_id
            LEFT JOIN (
                SELECT
                    sh_hist.stock_id,
                    json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json AS share_price_history
                FROM
                    stocks_history sh_hist
                GROUP BY
                    sh_hist.stock_id
            ) sp_history ON s.stock_id = sp_history.stock_id
        WHERE
            s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL
        ORDER BY
            s.stock_id
    ) AS distinct_stocks
    ORDER BY
        share_price_change_percentage DESC, stock_id
    LIMIT 10;
END;
$function$
;


