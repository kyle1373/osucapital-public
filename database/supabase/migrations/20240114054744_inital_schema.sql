alter table "public"."users_history" add column "friend_rank" numeric;

alter table "public"."users_history" add column "global_rank" numeric;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_user_details()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_record RECORD;
    total_invested_coins DOUBLE PRECISION;
    stock_record RECORD;
    user_global_rank NUMERIC;
    user_friend_rank NUMERIC;
BEGIN
    -- Temporary table to store calculated ranks for all users
    CREATE TEMP TABLE temp_user_ranks AS
    SELECT 
      u.user_id,
      RANK() OVER (ORDER BY (u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC) AS global_rank
    FROM 
      users u
      LEFT JOIN users_stocks us ON u.user_id = us.user_id
      LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id;

    FOR user_record IN SELECT * FROM users LOOP
        total_invested_coins := 0;

        FOR stock_record IN SELECT us.stock_id, us.num_shares, s.share_price FROM users_stocks us
            JOIN stocks s ON us.stock_id = s.stock_id
            WHERE us.user_id = user_record.user_id LOOP
            
            total_invested_coins := total_invested_coins + (stock_record.num_shares * stock_record.share_price);
        END LOOP;

        -- Fetch global rank from the temporary table
        SELECT global_rank INTO user_global_rank
        FROM temp_user_ranks
        WHERE user_id = user_record.user_id;

        -- Calculate friend rank
        user_friend_rank := (
            SELECT COUNT(*) + 1
            FROM friends f
            JOIN temp_user_ranks tr ON f.friend_id = tr.user_id
            WHERE f.user_id = user_record.user_id AND tr.global_rank < user_global_rank
        );

        -- Insert into users_history with additional columns
        INSERT INTO users_history(user_id, date, total_coins, global_rank, friend_rank)
        VALUES (user_record.user_id, NOW(), user_record.coins_held + total_invested_coins, user_global_rank, user_friend_rank);
    END LOOP;

    -- Drop the temporary table
    DROP TABLE temp_user_ranks;
END;
$function$
;


