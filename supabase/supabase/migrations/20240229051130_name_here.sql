set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_user_details()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    RAISE LOG 'Creating temporary user ranks.';
    CREATE TEMP TABLE temp_user_ranks AS
    SELECT 
        u.user_id,
        u.coins_held,
        COALESCE(SUM(s.share_price * us.num_shares), 0) AS coins_invested,
        (u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) AS total_coins,
        RANK() OVER (ORDER BY (u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC) AS global_rank
    FROM 
        users u
        LEFT JOIN users_stocks us ON u.user_id = us.user_id
        LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id;
    ANALYZE temp_user_ranks;

    RAISE LOG 'Finished getting ranks. Doing tax calculations now.';

    CREATE TEMP TABLE user_taxes AS
    SELECT 
        t.user_id,
        SUM(public.calculate_tax_on_profit(
          (s.share_price - t.share_price) * LEAST(t.num_shares, t.shares_left),
          EXTRACT(EPOCH FROM (NOW() - t.timestamp)) / 86400.0
        )) AS total_tax
    FROM 
        trades t
        JOIN stocks s ON t.stock_id = s.stock_id
    WHERE 
        t.type = 'buy'
    GROUP BY 
        t.user_id;
    ANALYZE user_taxes;

    RAISE LOG 'Finished tax calculations and rank calculation. Inserting into users_history.';

    -- Insert into users_history
    INSERT INTO users_history(user_id, date, total_coins, global_rank, friend_rank, net_worth)
    SELECT 
        tur.user_id,
        NOW(),
        tur.total_coins,
        tur.global_rank,
        COALESCE(fr.friend_rank, 1) AS friend_rank,
        (tur.total_coins - COALESCE(ut.total_tax, 0)) AS net_worth
    FROM 
        temp_user_ranks tur
    LEFT JOIN 
        user_taxes ut ON tur.user_id = ut.user_id
    LEFT JOIN 
        (SELECT 
            f.user_id, 
            COUNT(*) + 1 AS friend_rank
         FROM 
            friends f
         JOIN 
            temp_user_ranks tr ON f.friend_id = tr.user_id
         GROUP BY 
            f.user_id) fr ON tur.user_id = fr.user_id;

    RAISE LOG 'Cleaning up...';
    DROP TABLE temp_user_ranks;
    DROP TABLE user_taxes;
END;
$function$
;


