alter table "public"."stocks" alter column "osu_pp" set data type double precision using "osu_pp"::double precision;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_stock_stats(p_stock_id bigint, p_user_id bigint)
 RETURNS TABLE(stock_id bigint, share_price double precision, shares_owned double precision, share_rank bigint, share_price_change_percentage double precision, osu_id bigint, osu_name character varying, osu_picture text, osu_rank integer, osu_pp double precision, last_updated timestamp with time zone, share_price_history json)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        COALESCE(SUM(us.num_shares), 0.0) as shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint as share_rank,  -- Cast to bigint
        (s.share_price - lag(s.share_price) OVER (ORDER BY s.last_updated)) / lag(s.share_price) OVER (ORDER BY s.last_updated) * 100 as share_price_change_percentage,
        s.stock_id as osu_id,
        s.osu_name,
        s.osu_picture,
        s.osu_rank,
        s.osu_pp,
        s.last_updated,
        COALESCE(sp_history.share_price_history::json, '[]'::json) as share_price_history
    FROM
        stocks s
        LEFT JOIN users_stock us ON s.stock_id = us.stock_id AND us.user_id = COALESCE(p_user_id, us.user_id)
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


