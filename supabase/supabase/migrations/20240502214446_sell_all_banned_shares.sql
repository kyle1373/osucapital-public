set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sell_all_banned_shares(p_user_id integer, p_stock_id integer)
 RETURNS double precision
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_coins_held numeric;
    v_current_shares numeric;
    v_coins_earned numeric := 0;
    v_coin_total_temp numeric;
    v_new_coin_total numeric;
    v_coin_total_temp_with_penalty numeric;
    v_net_profit numeric := 0;
    v_total_shares_sold numeric := 0;
    v_buy_trade RECORD;

BEGIN
    SELECT coins_held INTO v_coins_held FROM users WHERE user_id = p_user_id;
    SELECT num_shares INTO v_current_shares FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    
    IF v_current_shares IS NULL OR v_current_shares = 0 THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;
    
    FOR v_buy_trade IN SELECT * FROM trades 
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND type = 'buy' AND shares_left > 0 
    ORDER BY timestamp LOOP

        v_coin_total_temp := v_buy_trade.shares_left * v_buy_trade.share_price;
        v_coin_total_temp_with_penalty := 0.7 * v_coin_total_temp;
        v_net_profit := v_net_profit + v_coin_total_temp_with_penalty - v_coin_total_temp;
        v_coins_earned := v_coins_earned + v_coin_total_temp_with_penalty;

        v_total_shares_sold := v_total_shares_sold + v_buy_trade.shares_left;

        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
    END LOOP;

    v_new_coin_total := public.ensure_max_coins(v_coins_earned + v_coins_held);

    UPDATE users SET coins_held = v_new_coin_total WHERE user_id = p_user_id;

    DELETE FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;

    -- Adjusted to record the sell transaction with the current share price
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, profit, coins_with_taxes, share_price)
    VALUES (p_user_id, p_stock_id, 'sell', v_total_shares_sold, v_coins_earned, 0, v_net_profit, v_coins_earned, 1);

    RETURN v_total_shares_sold;
END;
$function$
;


