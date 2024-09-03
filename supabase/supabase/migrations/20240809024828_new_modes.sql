set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_stocks_history()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '60s'
AS $function$
BEGIN
    INSERT INTO stocks_history (date, stock_id, price)
    SELECT NOW(), stock_id, share_price
    FROM stocks
    WHERE share_price IS NOT NULL;
END
$function$
;

CREATE OR REPLACE FUNCTION public.log_user_details()
 RETURNS void
 LANGUAGE plpgsql
 SET statement_timeout TO '60s'
AS $function$
 BEGIN
    CREATE TEMP TABLE temp_user_ranks AS
    SELECT 
        u.user_id,
        public.ensure_max_coins(u.coins_held) AS coins_held,
        public.ensure_max_coins(COALESCE(SUM(s.share_price * us.num_shares), 0)) AS coins_invested,
        public.ensure_max_coins(u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) AS total_coins,
        RANK() OVER (ORDER BY public.ensure_max_coins(u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC) AS global_rank
    FROM 
        users u
        LEFT JOIN users_stocks us ON u.user_id = us.user_id
        LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id;
    ANALYZE temp_user_ranks;

    CREATE TEMP TABLE user_taxes AS
    SELECT 
        t.user_id,
        public.ensure_max_coins(SUM(public.calculate_tax_on_profit(
          (s.share_price - t.share_price) * LEAST(t.num_shares, t.shares_left),
          EXTRACT(EPOCH FROM (NOW() - t.timestamp)) / 86400.0
        ))) AS total_tax
    FROM 
        trades t
        JOIN stocks s ON t.stock_id = s.stock_id
    WHERE 
        t.type = 'buy'
    GROUP BY 
        t.user_id;
    ANALYZE user_taxes;

    CREATE TEMP TABLE friend_ranks AS
    SELECT
        f.user_id,
        COUNT(DISTINCT f.friend_id) + 1 AS friend_rank
    FROM
        friends f
    JOIN
        temp_user_ranks tur ON f.friend_id = tur.user_id
    WHERE
        tur.total_coins > (
            SELECT tur2.total_coins
            FROM temp_user_ranks tur2
            WHERE tur2.user_id = f.user_id
        )
    GROUP BY
        f.user_id;

    -- Insert into users_history
    INSERT INTO users_history(user_id, date, total_coins, global_rank, friend_rank, net_worth)
    SELECT 
        tur.user_id,
        NOW(),
        tur.total_coins,
        tur.global_rank,
        COALESCE(fr.friend_rank, 1),
        public.ensure_max_coins(tur.total_coins - COALESCE(ut.total_tax, 0)) AS net_worth
    FROM 
        temp_user_ranks tur
    LEFT JOIN 
        user_taxes ut ON tur.user_id = ut.user_id
    LEFT JOIN 
        friend_ranks fr ON tur.user_id = fr.user_id;

    DROP TABLE temp_user_ranks;
    DROP TABLE user_taxes;
    DROP TABLE friend_ranks;
END
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_top_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
BEGIN
    -- Refresh the top_traders materialized view
    REFRESH MATERIALIZED VIEW top_traders;

    -- Refresh the trending_stocks materialized view
    REFRESH MATERIALIZED VIEW trending_stocks;
END;
$function$
;


