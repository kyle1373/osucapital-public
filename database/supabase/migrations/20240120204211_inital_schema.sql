set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.buy_shares(p_user_id bigint, p_stock_id bigint, p_num_shares numeric, p_share_price numeric, p_trading_fee numeric, p_trading_bonus numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_coins_held numeric;
    v_current_shares numeric;  -- Also changed to numeric to match p_num_shares
    v_coins_to_spend numeric;
    v_new_coin_total numeric;
BEGIN
    -- Get the current coins held by the user
    SELECT coins_held INTO v_coins_held
    FROM users
    WHERE user_id = p_user_id;

    IF v_coins_held IS NULL THEN
        RAISE EXCEPTION 'Error code BUY1: Cannot get user coins';
    END IF;

    -- Calculate the coins needed to spend
    v_coins_to_spend := p_num_shares * p_share_price;

    -- Check if the user has enough coins
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

    -- Insert the trade history
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins)
    VALUES (p_user_id, p_stock_id, 'buy', p_num_shares, v_coins_to_spend);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sell_shares(p_user_id bigint, p_stock_id bigint, p_num_shares numeric, p_share_price numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_coins_held numeric;
    v_current_shares numeric;  -- Also changed to numeric to match p_num_shares
    v_coins_earned numeric;
    v_new_coin_total numeric;
BEGIN
    -- Get the current coins held by the user
    SELECT coins_held INTO v_coins_held
    FROM users
    WHERE user_id = p_user_id;

    -- Get the current number of shares the user holds for the stock
    SELECT num_shares INTO v_current_shares
    FROM users_stocks
    WHERE user_id = p_user_id AND stock_id = p_stock_id;

    -- Check if the user has enough shares
    IF v_current_shares IS NULL OR v_current_shares < p_num_shares THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;

    -- Calculate the coins earned from selling the shares
    v_coins_earned := p_share_price * p_num_shares;

    -- Update the total coins held by the user
    UPDATE users
    SET coins_held = v_coins_held + v_coins_earned
    WHERE user_id = p_user_id;

    -- Insert the trade history
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned);

    -- Update or delete the user's stock record
    IF v_current_shares - p_num_shares > 0 THEN
        -- Update the record with the new share count
        UPDATE users_stocks
        SET num_shares = v_current_shares - p_num_shares, last_updated = NOW()
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    ELSE
        -- Delete the record as the user will have 0 shares left
        DELETE FROM users_stocks
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;
END;
$function$
;


