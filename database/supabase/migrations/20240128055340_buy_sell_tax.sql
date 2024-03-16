drop trigger if exists "trigger_delete_zero_num_shares_users_stocks" on "public"."users_stocks";

alter table "public"."trades" add column "shares_left" numeric not null;

alter table "public"."trades" add constraint "trades_shares_left_check" CHECK ((shares_left >= (0)::numeric)) not valid;

alter table "public"."trades" validate constraint "trades_shares_left_check";

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
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left)
    VALUES (p_user_id, p_stock_id, 'buy', p_num_shares, v_coins_to_spend, p_num_shares);
END;
$function$
;

DROP FUNCTION public.sell_shares;

CREATE OR REPLACE FUNCTION public.sell_shares(p_user_id bigint, p_stock_id bigint, p_num_shares numeric, p_share_price numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_coins_held numeric;
    v_current_shares numeric;
    v_coins_earned numeric;
    v_new_coin_total numeric;
    v_total_cost_basis numeric := 0;
    v_profit numeric;
    v_shares_to_sell numeric := p_num_shares;
    v_share_price numeric;
    v_shares_used numeric;
    v_buy_trade RECORD;
    v_days_passed numeric;
    v_tax_rate numeric;
    v_profit_before_tax numeric;
    v_tax_amount numeric;
BEGIN
    -- Get the current coins held by the user
    SELECT coins_held INTO v_coins_held
    FROM users
    WHERE user_id = p_user_id;

    -- Get the current number of shares the user holds for the stock
    SELECT num_shares INTO v_current_shares
    FROM users_stocks
    WHERE user_id = p_user_id AND stock_id = p_stock_id;

    IF v_current_shares IS NULL OR v_current_shares < p_num_shares THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;

    -- Calculate the coins earned from selling the shares
    v_coins_earned := p_share_price * p_num_shares;
    v_profit := 0;  -- Initialize total profit

    -- Fetch relevant buy trades in FIFO order
    FOR v_buy_trade IN SELECT * FROM trades 
        WHERE user_id = p_user_id AND stock_id = p_stock_id AND type = 'buy' AND shares_left > 0 
        ORDER BY timestamp LOOP

        -- Calculate the number of shares to use from this buy trade
        v_shares_used := LEAST(v_shares_to_sell, v_buy_trade.shares_left);
        v_profit_before_tax := (p_share_price - (v_buy_trade.coins / v_buy_trade.num_shares)) * v_shares_used;

        -- Calculate days passed since the buy trade
        v_days_passed := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400;

        -- Calculate the tax rate
        v_tax_rate := GREATEST(0, 1 - LN(v_days_passed + 1) / LN(8));

        -- Calculate tax amount and subtract from profit
        v_tax_amount := v_profit_before_tax * v_tax_rate;
        v_profit := v_profit + (v_profit_before_tax - v_tax_amount);

        -- Decrement shares left in the buy trade and in the selling transaction
        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
        v_shares_to_sell := v_shares_to_sell - v_shares_used;

        -- Break loop if all shares are accounted for
        IF v_shares_to_sell <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- Update user's shares and coins
    v_new_coin_total := v_coins_held + v_coins_earned;
    UPDATE users
    SET coins_held = v_new_coin_total
    WHERE user_id = p_user_id;
    UPDATE users_stocks
    SET num_shares = v_current_shares - p_num_shares
    WHERE user_id = p_user_id AND stock_id = p_stock_id;

    -- Insert the sell trade with shares_left as 0
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned, 0);

    RETURN v_profit;
END;
$function$
;