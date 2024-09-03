ALTER TYPE stock_details_type ADD ATTRIBUTE is_banned boolean;

alter table "public"."stocks" add column "is_banned" boolean not null default false;

CREATE INDEX stocks_is_banned_idx ON public.stocks USING hash (is_banned);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_stock_stats(p_stock_id bigint, p_user_id bigint)
 RETURNS SETOF stock_details_type
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        COALESCE(us.num_shares, 0.0)::numeric(100,2) AS shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint AS share_rank,
        (
            SELECT COALESCE(
                (s.share_price - AVG(sh_hist.price)) / NULLIF(AVG(sh_hist.price), 0) * 100, 
                0.0
            )::numeric(100,2)
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
        s.osu_pp::numeric(100,2),
        s.osu_rank_history,
        s.last_updated,
        COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history,
        s.osu_playcount_history,
        s.osu_join_date,
        s.is_buyable,
        s.prevent_trades,
        s.osu_country_code,
        s.is_sellable,
        s.is_banned
    FROM
        stocks s
        LEFT JOIN users_stocks us ON s.stock_id = us.stock_id AND us.user_id = p_user_id
        LEFT JOIN (
            SELECT sh_hist.stock_id, json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json as share_price_history
            FROM stocks_history sh_hist
            WHERE sh_hist.stock_id = p_stock_id
            GROUP BY sh_hist.stock_id
        ) sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        s.stock_id = p_stock_id;
END;
$function$
;

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
                )::numeric(100,2)
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
            COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history,
            s.osu_playcount_history,
            s.osu_join_date,
            s.is_buyable,
            s.prevent_trades,
            s.osu_country_code,
            s.is_sellable,
            s.is_banned
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
            s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL AND s.is_buyable IS NOT FALSE AND s.prevent_trades IS NOT TRUE
        ORDER BY
            s.stock_id
    ) AS distinct_stocks
    ORDER BY
        share_price_change_percentage DESC, stock_id
    LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_stocks(p_user_id bigint, p_page integer, p_page_size integer)
 RETURNS SETOF stock_details_type
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        us.num_shares AS shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint AS share_rank,
        (
            SELECT COALESCE(
                (s.share_price - AVG(sh_hist.price)) / NULLIF(AVG(sh_hist.price), 0) * 100, 
                0.0
            )::numeric(100,2)
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
        COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history,
        s.osu_playcount_history,
        s.osu_join_date,
        s.is_buyable,
        s.prevent_trades,
        s.osu_country_code,
        s.is_sellable,
        s.is_banned
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
        (us.num_shares * s.share_price) DESC, us.stock_id
    LIMIT p_page_size + 1
    OFFSET (p_page - 1) * p_page_size;
END;
$function$
;

