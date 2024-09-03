alter table "public"."trades" add column "coins_untaxed" numeric(12,2);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.buy_shares(p_user_id bigint, p_stock_id bigint, p_num_shares numeric, p_share_price numeric, p_trading_fee numeric, p_trading_bonus numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$DECLARE
    v_coins_held numeric;
    v_current_shares numeric;
    v_coins_to_spend numeric;
    v_new_coin_total numeric;
    v_coins_untaxed numeric;
BEGIN
    -- Get the current coins held by the user
    SELECT coins_held INTO v_coins_held FROM users WHERE user_id = p_user_id;
    IF v_coins_held IS NULL THEN
        RAISE EXCEPTION 'Error code BUY1: Cannot get user coins';
    END IF;

    -- Calculate the coins needed to spend (untaxed amount)
    v_coins_to_spend := p_num_shares * p_share_price;
    v_coins_untaxed := v_coins_to_spend; -- This is the untaxed spend

   -- Check if the user has enough coins (consider trading fees and bonuses)
    IF v_coins_held < v_coins_to_spend + p_trading_fee - p_trading_bonus THEN
        RAISE EXCEPTION 'You do not have enough coins';
    END IF;

    -- Get the current number of shares the user holds for the stock
    SELECT num_shares INTO v_current_shares
    FROM users_stocks
    WHERE user_id = p_user_id AND stock_id = p_stock_id;

    -- Update or insert user's stock record
    IF v_current_shares IS NULL THEN
        INSERT INTO users_stocks (user_id, stock_id, num_shares, last_updated)
        VALUES (p_user_id, p_stock_id, p_num_shares, NOW());
    ELSE
        UPDATE users_stocks
        SET num_shares = v_current_shares + p_num_shares, last_updated = NOW()
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    -- Update the total coins held by the user
    v_new_coin_total := v_coins_held - v_coins_to_spend - p_trading_fee + p_trading_bonus;
    UPDATE users
    SET coins_held = v_new_coin_total
    WHERE user_id = p_user_id;

    -- Insert the buy trade record with default profit set to 0
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, coins_untaxed)
    VALUES (p_user_id, p_stock_id, 'buy', p_num_shares, v_coins_to_spend, p_num_shares, v_coins_untaxed);
END;
$function$
;


