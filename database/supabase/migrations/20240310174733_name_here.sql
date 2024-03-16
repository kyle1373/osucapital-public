set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_max_coins(value numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return the lesser of the input value and 999999999
    RETURN LEAST(value, 999999999);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_max_coins_held()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Apply max coin constraint using the ensure_max_coins function
    NEW.coins_held := public.ensure_max_coins(NEW.coins_held);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.buy_shares(p_user_id bigint, p_stock_id bigint, p_num_shares numeric, p_share_price numeric, p_trading_fee numeric, p_trading_bonus numeric)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_coins_held numeric;
    v_current_shares numeric;
    v_coins_to_spend numeric;
    v_new_coin_total numeric;
    v_total_cost_with_fees numeric; -- Adjusted for clarity and accuracy
BEGIN
    SELECT coins_held INTO v_coins_held FROM users WHERE user_id = p_user_id;
    IF v_coins_held IS NULL THEN
        RAISE EXCEPTION 'Error code BUY1: Cannot get user coins';
    END IF;

    -- Calculate the total cost including fees and subtracting any bonuses
    v_coins_to_spend := (p_num_shares * p_share_price) + p_trading_fee - p_trading_bonus;
    v_total_cost_with_fees := v_coins_to_spend - p_trading_fee + p_trading_bonus; -- This includes everything

    IF v_coins_held < v_coins_to_spend THEN
        RAISE EXCEPTION 'You do not have enough coins';
    END IF;

    SELECT num_shares INTO v_current_shares FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;

    IF v_current_shares IS NULL THEN
        INSERT INTO users_stocks (user_id, stock_id, num_shares, last_updated)
        VALUES (p_user_id, p_stock_id, p_num_shares, NOW());
    ELSE
        UPDATE users_stocks SET num_shares = v_current_shares + p_num_shares, last_updated = NOW()
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    -- Update user's coins after purchase
    v_new_coin_total := public.ensure_max_coins(v_coins_held - v_coins_to_spend);
    UPDATE users SET coins_held = v_new_coin_total WHERE user_id = p_user_id;

    -- Insert buy trade with accurate cost basis
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, coins_with_taxes, share_price)
    VALUES (p_user_id, p_stock_id, 'buy', p_num_shares, v_coins_to_spend, p_num_shares, v_total_cost_with_fees, p_share_price);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id bigint)
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    public.ensure_max_coins((u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(100,2)) AS total_coins,
    (
        (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(100,2) -
        COALESCE(
            (SELECT AVG(hist.total_coins) 
             FROM (
                 SELECT h.total_coins 
                 FROM users_history h
                 WHERE h.user_id = u.user_id
                 ORDER BY h.date DESC 
                 LIMIT 2
             ) hist
            ),
            (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(100,2)
        )
    )::numeric(100,2) AS coin_differential
  FROM
    users u
    LEFT JOIN friends f ON u.user_id = f.friend_id AND f.user_id = p_user_id
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  WHERE f.friend_id IS NOT NULL OR u.user_id = p_user_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_leaderboard()
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    public.ensure_max_coins(u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(100,2)) AS total_coins,
    (
        u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(100,2) - 
        COALESCE(
            (SELECT AVG(hist.total_coins) 
             FROM (
                 SELECT h.total_coins 
                 FROM users_history h
                 WHERE h.user_id = u.user_id
                 ORDER BY h.date DESC 
                 LIMIT 2
             ) hist
            ), 
            u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(100,2)
        )
    )::numeric(100,2) AS coin_differential
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_details(user_req bigint)
 RETURNS SETOF user_details_type
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_buy_trade RECORD;
    v_user_stock RECORD;
    v_tax_amount numeric;
    v_liable_taxes numeric := 0;
    v_current_share_price numeric;
    v_shares_to_sell numeric;
    v_days_held numeric;
    v_badges json;

BEGIN
  FOR v_user_stock IN SELECT us.stock_id, SUM(us.num_shares) AS total_shares
                      FROM users_stocks us
                      WHERE us.user_id = user_req
                      GROUP BY us.stock_id
  LOOP
    SELECT share_price INTO v_current_share_price FROM stocks WHERE stock_id = v_user_stock.stock_id;
    v_shares_to_sell := v_user_stock.total_shares;

    FOR v_buy_trade IN SELECT * FROM trades
                       WHERE user_id = user_req AND stock_id = v_user_stock.stock_id AND type = 'buy' AND shares_left > 0
                       ORDER BY timestamp
    LOOP
        v_days_held := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400.0;
        v_tax_amount := public.calculate_tax_on_profit((v_current_share_price - v_buy_trade.share_price) * LEAST(v_shares_to_sell, v_buy_trade.shares_left), v_days_held);
        v_liable_taxes := v_liable_taxes + v_tax_amount;

        v_shares_to_sell := v_shares_to_sell - LEAST(v_shares_to_sell, v_buy_trade.shares_left);
        IF v_shares_to_sell <= 0 THEN
            EXIT;
        END IF;
    END LOOP;
  END LOOP;

  SELECT json_agg(json_build_object(
      'badge_id', b.badge_id,
      'name', b.name,
      'description', b.description,
      'created_at', ub.created_at
  )) INTO v_badges
  FROM users_badges ub
  JOIN badges b ON ub.badge_id = b.badge_id
  WHERE ub.user_id = user_req;

  RETURN QUERY 
  WITH ranked_users AS (
    SELECT 
      u.user_id,
      u.coins_held,
      public.ensure_max_coins((COALESCE(SUM(s.share_price * us.num_shares), 0))::numeric(100,2)) AS coins_invested,
      RANK() OVER (ORDER BY (u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC) AS global_rank
    FROM 
      users u
      LEFT JOIN users_stocks us ON u.user_id = us.user_id
      LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id
  ),
  friends_global_ranks AS (
    SELECT 
      f.user_id AS friend_user_id,
      ru.global_rank AS friend_global_rank
    FROM 
      friends f
      INNER JOIN ranked_users ru ON f.friend_id = ru.user_id
    WHERE 
      f.user_id = user_req
  ),
  user_global_rank AS (
    SELECT
      ru.global_rank AS user_global_rank
    FROM
      ranked_users ru
    WHERE
      ru.user_id = user_req
  ),
  friend_ranking AS (
    SELECT 
      user_req AS user_id,
      COUNT(*) + 1 AS friend_rank
    FROM 
      friends_global_ranks
    WHERE
      friend_global_rank < (SELECT user_global_rank FROM user_global_rank)
    GROUP BY
      user_id
  )
  SELECT 
    ru.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    ru.coins_held,
    ru.coins_invested,
    COALESCE((
      SELECT json_agg(json_build_object('date', uh.date, 'coins', uh.total_coins, 'net_worth', uh.net_worth, 'global_rank', uh.global_rank, 'friend_rank', uh.friend_rank) ORDER BY uh.date)
      FROM users_history uh WHERE uh.user_id = ru.user_id
    ), '[]'::json) AS user_history,
    COALESCE(ru.global_rank, 1) AS global_rank,
    COALESCE(fr.friend_rank, 1) AS friend_rank,
    u.show_trades,
    v_liable_taxes AS liable_taxes,
    v_badges AS badges

  FROM 
    ranked_users ru
    INNER JOIN users u ON ru.user_id = u.user_id
    LEFT JOIN friend_ranking fr ON ru.user_id = fr.user_id
  WHERE 
    ru.user_id = user_req;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_user_details()
 RETURNS void
 LANGUAGE plpgsql
AS $function$BEGIN
    RAISE LOG 'Creating temporary user ranks.';
    CREATE TEMP TABLE temp_user_ranks AS
    SELECT 
        u.user_id,
        public.ensure_max_coins(u.coins_held) AS coins_held,
        public.ensure_max_coins(COALESCE(SUM(s.share_price * us.num_shares), 0)) AS coins_invested,
        public.ensure_max_coins(u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) AS total_coins,
        RANK() OVER (ORDER BY public.ensure_max_coins(u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC) AS global_rank
    FROM 
        users u
        LEFT JOIN users_stocks us ON u.user_id = us.user_id
        LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id;
    ANALYZE temp_user_ranks;

    RAISE LOG 'Finished getting ranks. Doing tax calculations now.';

    CREATE TEMP TABLE user_taxes AS
    SELECT 
        t.user_id,
        public.ensure_max_coins(SUM(public.calculate_tax_on_profit(
          (s.share_price - t.share_price) * LEAST(t.num_shares, t.shares_left),
          EXTRACT(EPOCH FROM (NOW() - t.timestamp)) / 86400.0
        ))) AS total_tax
    FROM 
        trades t
        JOIN stocks s ON t.stock_id = s.stock_id
    WHERE 
        t.type = 'buy'
    GROUP BY 
        t.user_id;
    ANALYZE user_taxes;

    RAISE LOG 'Finished tax calculations and rank calculation. Inserting into users_history.';

    -- Insert into users_history
    INSERT INTO users_history(user_id, date, total_coins, global_rank, friend_rank, net_worth)
    SELECT 
        tur.user_id,
        NOW(),
        tur.total_coins,
        tur.global_rank,
        COALESCE(fr.friend_rank, 1) AS friend_rank,
        public.ensure_max_coins(tur.total_coins - COALESCE(ut.total_tax, 0)) AS net_worth
    FROM 
        temp_user_ranks tur
    LEFT JOIN 
        user_taxes ut ON tur.user_id = ut.user_id
    LEFT JOIN 
        (SELECT 
            f.user_id, 
            COUNT(*) + 1 AS friend_rank
         FROM 
            friends f
         JOIN 
            temp_user_ranks tr ON f.friend_id = tr.user_id
         GROUP BY 
            f.user_id) fr ON tur.user_id = fr.user_id;

    RAISE LOG 'Cleaning up...';
    DROP TABLE temp_user_ranks;
    DROP TABLE user_taxes;
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
    v_final_coins_after_tax numeric;
BEGIN
    SELECT coins_held INTO v_coins_held FROM users WHERE user_id = p_user_id;
    SELECT num_shares INTO v_current_shares FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    
    IF v_current_shares IS NULL OR v_current_shares < p_num_shares THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;

    v_coins_earned := p_share_price * p_num_shares;
    
    FOR v_buy_trade IN SELECT * FROM trades 
    WHERE user_id = p_user_id AND stock_id = p_stock_id AND type = 'buy' AND shares_left > 0 
    ORDER BY timestamp LOOP

        IF v_shares_to_sell <= 0 THEN
            EXIT;
        END IF;

        v_shares_used := LEAST(v_shares_to_sell, v_buy_trade.shares_left);
        v_days_passed := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400.0;

        -- Adjusted to use share_price from trades for calculating cost basis and profits
        v_tax_amount := public.calculate_tax_on_profit((p_share_price - v_buy_trade.share_price) * v_shares_used, v_days_passed);
        v_total_tax := v_total_tax + v_tax_amount;

        v_total_cost_basis := v_total_cost_basis + (v_buy_trade.share_price * v_shares_used);
        v_shares_to_sell := v_shares_to_sell - v_shares_used;

        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
    END LOOP;

    v_final_coins_after_tax := v_coins_earned - v_total_tax;
    v_new_coin_total := public.ensure_max_coins(v_coins_held + v_final_coins_after_tax);
    UPDATE users SET coins_held = v_new_coin_total WHERE user_id = p_user_id;

    IF v_current_shares - p_num_shares = 0 THEN
        DELETE FROM users_stocks WHERE user_id = p_user_id AND stock_id = p_stock_id;
    ELSE
        UPDATE users_stocks SET num_shares = v_current_shares - p_num_shares WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    v_net_profit := v_coins_earned - v_total_cost_basis - v_total_tax;

    -- Adjusted to record the sell transaction with the current share price
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left, profit, coins_with_taxes, share_price)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned, 0, v_net_profit, v_final_coins_after_tax, p_share_price);

    RETURN v_net_profit;
END;
$function$
;

CREATE TRIGGER check_coins_held_before_insert_or_update BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION ensure_max_coins_held();

CREATE TRIGGER trg_ensure_max_coins_held BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION ensure_max_coins_held();


