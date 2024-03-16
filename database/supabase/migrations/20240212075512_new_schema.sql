set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_tax_on_profit(p_profit numeric, p_days_held numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tax_rate numeric;
    v_tax_amount numeric;
BEGIN
    -- Calculate the tax rate based on days the shares were held, allowing for decimal values
    v_tax_rate := GREATEST(0, 1 - LN(p_days_held + 1) / LN(8));

    -- Calculate the tax amount based on the profit and the tax rate
    v_tax_amount := GREATEST(0, p_profit * v_tax_rate); -- Ensure non-negative tax

    RETURN v_tax_amount;
END;
$function$
;

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
    v_net_profit numeric;
    v_shares_to_sell numeric := p_num_shares;
    v_shares_used numeric;
    v_buy_trade RECORD;
    v_days_passed numeric;
    v_tax_rate numeric;
    v_profit_before_tax numeric;
    v_tax_amount numeric;
    v_total_tax numeric := 0;
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
    v_net_profit := 0;  -- Initialize net profit

    -- Fetch relevant buy trades in FIFO order
    FOR v_buy_trade IN SELECT * FROM trades 
        WHERE user_id = p_user_id AND stock_id = p_stock_id AND type = 'buy' AND shares_left > 0 
        ORDER BY timestamp LOOP

        -- Calculate the number of shares to use from this buy trade
        v_shares_used := LEAST(v_shares_to_sell, v_buy_trade.shares_left);
        v_profit_before_tax := (p_share_price - (v_buy_trade.coins / v_buy_trade.num_shares)) * v_shares_used;

        -- Calculate days passed since the buy trade
        v_days_passed := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400.0;

        -- Calculate tax amount and accumulate tax
        v_tax_amount := public.calculate_tax_on_profit(v_profit_before_tax, v_days_passed);
        v_total_tax := v_total_tax + v_tax_amount;

        -- Update cost basis and net profit
        v_total_cost_basis := v_total_cost_basis + (v_buy_trade.coins / v_buy_trade.num_shares) * v_shares_used;
        v_net_profit := v_net_profit + (v_profit_before_tax - v_tax_amount);

        -- Decrement shares left in the buy trade and in the selling transaction
        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
        v_shares_to_sell := v_shares_to_sell - v_shares_used;

        -- Break loop if all shares are accounted for
        IF v_shares_to_sell <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- Update user's shares and coins
    v_new_coin_total := v_coins_held + v_coins_earned - v_total_tax;
    UPDATE users
    SET coins_held = v_new_coin_total
    WHERE user_id = p_user_id;

    -- Update or delete the user's stock record
    IF v_current_shares - p_num_shares = 0 THEN
        DELETE FROM users_stocks
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    ELSE
        UPDATE users_stocks
        SET num_shares = v_current_shares - p_num_shares
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    -- Insert the sell trade with shares_left as 0 and include the profit
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, profit)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned, 0, v_net_profit);


    -- Calculate final profit or loss
    v_net_profit := v_coins_earned - v_total_cost_basis - v_total_tax;
    
    RETURN v_net_profit;
END;
$function$
;


