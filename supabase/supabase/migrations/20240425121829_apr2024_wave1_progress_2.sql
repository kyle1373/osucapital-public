set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
 RETURNS SETOF leaderboard_entry_type
 LANGUAGE plpgsql
AS $function$BEGIN
  RETURN QUERY
  WITH user_average_coins AS (
    SELECT
      h.user_id,
      AVG(h.total_coins) AS avg_total_coins
    FROM
      users_history h
    WHERE
      h.date >= now() - interval '1 day'
    GROUP BY
      h.user_id
  )
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) AS total_coins,
    COALESCE(
      CASE 
        WHEN COALESCE(ua.avg_total_coins, 0) <= 0 THEN 0
        ELSE (
          (
            (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) - 
            COALESCE(ua.avg_total_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))) / 
            COALESCE(ua.avg_total_coins, u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))
          ) * 100
        )
      END, 0
    )::NUMERIC(13,2) AS coin_differential,
    (u.stripe_subscription_status = 'active') AS is_supporter,
    u.color_flare,
    u.osu_country_code
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN user_average_coins ua ON u.user_id = ua.user_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner, ua.avg_total_coins
  ORDER BY coin_differential DESC
  LIMIT 10;
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

  -- NOTE: This is the profit tax calculation. Uncomment to make it work


  -- FOR v_user_stock IN SELECT us.stock_id, SUM(us.num_shares) AS total_shares
  --                     FROM users_stocks us
  --                     WHERE us.user_id = user_req
  --                     GROUP BY us.stock_id
  
  -- LOOP
  --   SELECT share_price INTO v_current_share_price FROM stocks WHERE stock_id = v_user_stock.stock_id;
  --   v_shares_to_sell := v_user_stock.total_shares;

  --   FOR v_buy_trade IN SELECT * FROM trades
  --                      WHERE user_id = user_req AND stock_id = v_user_stock.stock_id AND type = 'buy' AND shares_left > 0
  --                      ORDER BY timestamp
  --   LOOP
  --       v_days_held := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400.0;
  --       v_tax_amount := public.calculate_tax_on_profit((v_current_share_price - v_buy_trade.share_price) * LEAST(v_shares_to_sell, v_buy_trade.shares_left), v_days_held);
  --       v_liable_taxes := v_liable_taxes + v_tax_amount;

  --       v_shares_to_sell := v_shares_to_sell - LEAST(v_shares_to_sell, v_buy_trade.shares_left);
  --       IF v_shares_to_sell <= 0 THEN
  --           EXIT;
  --       END IF;
  --   END LOOP;
  -- END LOOP;

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
    v_badges AS badges,
    (u.stripe_subscription_status = 'active') AS is_supporter,
    u.color_flare,
    u.osu_country_code
  FROM 
    ranked_users ru
    INNER JOIN users u ON ru.user_id = u.user_id
    LEFT JOIN friend_ranking fr ON ru.user_id = fr.user_id
  WHERE 
    ru.user_id = user_req;
END;
$function$
;


