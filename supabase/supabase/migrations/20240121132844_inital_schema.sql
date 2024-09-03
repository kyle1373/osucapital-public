set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.revert_trades_for_stock(p_stock_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    trade_record RECORD;
BEGIN
    -- Iterate over each trade for the given stock
    FOR trade_record IN SELECT * FROM trades WHERE stock_id = p_stock_id LOOP

        -- Revert a buy trade
        IF trade_record.type = 'buy' THEN
            -- Increase the user's coins held (reverting the spent amount)
            UPDATE users
            SET coins_held = coins_held + trade_record.coins
            WHERE user_id = trade_record.user_id;

        -- Revert a sell trade
        ELSIF trade_record.type = 'sell' THEN
            -- Decrease the user's coins held (reverting the earned amount)
            UPDATE users
            SET coins_held = coins_held - trade_record.coins
            WHERE user_id = trade_record.user_id;
        END IF;
    END LOOP;

    -- Delete all users_stocks entries for the given stock
    DELETE FROM users_stocks WHERE stock_id = p_stock_id;

    -- Optionally, delete the trade records
    DELETE FROM trades WHERE stock_id = p_stock_id;
END;
$function$
;


