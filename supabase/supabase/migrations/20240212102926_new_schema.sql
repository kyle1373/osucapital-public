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
    -- Ensure the tax rate does not exceed 1 (100%)
    v_tax_rate := LEAST(1, GREATEST(0, 1 - LN(GREATEST(p_days_held + 1, 1)) / LN(8)));

    -- Calculate the tax amount based on the profit and the tax rate
    -- Ensure non-negative tax and that tax does not exceed the profit itself
    v_tax_amount := GREATEST(0, LEAST(p_profit, p_profit * v_tax_rate)); 

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
    v_tax_amount numeric;
    v_total_tax numeric := 0;
    v_final_coins_after_tax numeric; -- Final coins amount after accounting for the sale and taxes
BEGIN
    SELECT coins_held INTO v_coins_held FROM users WHERE user_id = p_user_id;
    SELECT num_shares INTO v_current_shares FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    
    IF v_current_shares IS NULL OR v_current_shares < p_num_shares THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;

    v_coins_earned := p_share_price * p_num_shares; -- Gross revenue from the sale
    
    FOR v_buy_trade IN SELECT * FROM trades 
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND type = 'buy' AND shares_left > 0 
    ORDER BY timestamp LOOP

        IF v_shares_to_sell <= 0 THEN
            EXIT;
        END IF;

        v_shares_used := LEAST(v_shares_to_sell, v_buy_trade.shares_left);
        v_days_passed := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400.0;
        v_tax_amount := public.calculate_tax_on_profit((p_share_price - (v_buy_trade.coins_with_taxes / v_buy_trade.num_shares)) * v_shares_used, v_days_passed);
        v_total_tax := v_total_tax + v_tax_amount;

        v_total_cost_basis := v_total_cost_basis + ((v_buy_trade.coins_with_taxes / v_buy_trade.num_shares) * v_shares_used);
        v_shares_to_sell := v_shares_to_sell - v_shares_used;

        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
    END LOOP;

    -- Correct calculation of the final net amount after tax
    v_final_coins_after_tax := v_coins_earned - v_total_tax;
    v_new_coin_total := v_coins_held + v_final_coins_after_tax;
    UPDATE users SET coins_held = v_new_coin_total WHERE user_id = p_user_id;

    IF v_current_shares - p_num_shares = 0 THEN
        DELETE FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    ELSE
        UPDATE users_stocks SET num_shares = v_current_shares - p_num_shares WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    -- Calculate the actual net profit considering the cost basis and total taxes paid
    v_net_profit := v_coins_earned - v_total_cost_basis - v_total_tax;

    -- Insert into trades the sell transaction
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, profit, coins_with_taxes)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned, 0, v_net_profit, v_final_coins_after_tax);

    RETURN v_net_profit;
END;
$function$
;


