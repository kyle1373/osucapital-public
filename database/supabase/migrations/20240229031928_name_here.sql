set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_user_details()
 RETURNS void
 LANGUAGE plpgsql
AS $function$DECLARE
    user_record RECORD;
    total_invested_coins DOUBLE PRECISION;
    v_tax_liability NUMERIC := 0;
    v_current_share_price NUMERIC;
    net_worth NUMERIC; -- Declare net_worth variable
    v_user_global_rank NUMERIC;
    v_user_friend_rank NUMERIC;
BEGIN
    RAISE NOTICE 'Creating temporary user ranks.';
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

    FOR user_record IN SELECT * FROM temp_user_ranks LOOP
        RAISE NOTICE 'Processing user %', user_record.user_id;
        
        -- Calculate tax liability for each user
        SELECT COALESCE(SUM(public.calculate_tax_on_profit(
            (SELECT COALESCE(share_price, 0) FROM stocks WHERE stock_id = t.stock_id) - t.share_price,
            EXTRACT(EPOCH FROM (NOW() - t.timestamp)) / 86400.0) 
            * LEAST(t.num_shares, t.shares_left)), 0)
        INTO v_tax_liability
        FROM trades t
        WHERE t.user_id = user_record.user_id AND t.type = 'buy';

        -- Calculate net worth considering tax liability
        net_worth := user_record.total_coins - v_tax_liability;

        -- Calculate friend rank based on the updated total coins
        SELECT COUNT(*) + 1 INTO v_user_friend_rank
        FROM friends f
        INNER JOIN temp_user_ranks tr ON f.friend_id = tr.user_id
        WHERE f.user_id = user_record.user_id AND tr.total_coins > user_record.total_coins;

        -- Insert into users_history with updated values
        INSERT INTO users_history(user_id, date, total_coins, global_rank, friend_rank, net_worth)
        VALUES (user_record.user_id, NOW(), user_record.total_coins, user_record.global_rank, v_user_friend_rank, net_worth);
    END LOOP;

    RAISE NOTICE 'Dropping temporary table.';
    DROP TABLE temp_user_ranks;
END;$function$
;


