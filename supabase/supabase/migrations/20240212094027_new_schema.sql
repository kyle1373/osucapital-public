alter table "public"."trades" drop column "coins_untaxed";

alter table "public"."trades" add column "coins_with_taxes" numeric(12,2);

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
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, coins_with_taxes)
    VALUES (p_user_id, p_stock_id, 'buy', p_num_shares, v_coins_to_spend, p_num_shares, v_coins_untaxed +  p_trading_bonus - p_trading_fee);
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
    v_coins_after_tax numeric; -- Net coins from the sale after taxes
BEGIN
    SELECT coins_held INTO v_coins_held FROM users WHERE user_id = p_user_id;
    SELECT num_shares INTO v_current_shares FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    
    IF v_current_shares IS NULL OR v_current_shares < v_shares_to_sell THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;

    v_coins_earned := p_share_price * v_shares_to_sell; -- Gross revenue from the sale
    
    -- Adjust this loop to use coins_with_taxes for calculating the cost basis
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

        v_total_cost_basis := v_total_cost_basis + (v_buy_trade.coins_with_taxes / v_buy_trade.num_shares) * v_shares_used;
        v_shares_to_sell := v_shares_to_sell - v_shares_used;

        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
    END LOOP;

    v_coins_after_tax := v_coins_earned - v_total_tax; -- Calculate net coins after tax deduction
    v_new_coin_total := v_coins_held + v_coins_after_tax;
    UPDATE users SET coins_held = v_new_coin_total WHERE user_id = p_user_id;

    IF v_current_shares - p_num_shares = 0 THEN
        DELETE FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    ELSE
        UPDATE users_stocks SET num_shares = v_current_shares - p_num_shares WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    -- Insert updated trade record with corrected profit and coins_with_taxes
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, profit, coins_with_taxes)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned, 0, v_coins_earned - v_total_cost_basis - v_total_tax, v_coins_after_tax);

    v_net_profit := v_coins_earned - v_total_cost_basis - v_total_tax;
    RETURN v_net_profit;
END;
$function$
;


