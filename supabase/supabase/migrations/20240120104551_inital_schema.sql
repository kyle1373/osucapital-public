drop function if exists "public"."get_friends_leaderboard"(p_user_id bigint);

drop function if exists "public"."get_latest_leaderboard"();

drop function if exists "public"."get_stock_stats"(p_stock_id bigint, p_user_id bigint);

drop function if exists "public"."get_top_stocks"();

drop function if exists "public"."get_top_traders_today"();

drop function if exists "public"."get_user_details"(user_req bigint);

drop function if exists "public"."get_user_stocks"(p_user_id bigint, p_page integer, p_page_size integer);

set check_function_bodies = off;

create type "public"."leaderboardentrytype" as ("user_id" bigint, "osu_name" character varying, "osu_picture" text, "osu_banner" text, "total_coins" numeric, "coin_differential" numeric);

create type "public"."stockdetailstype" as ("stock_id" bigint, "share_price" numeric, "shares_owned" numeric, "share_rank" bigint, "share_price_change_percentage" numeric, "osu_name" character varying, "osu_picture" text, "osu_banner" text, "osu_rank" integer, "osu_pp" numeric, "osu_rank_history" integer[], "last_updated" timestamp with time zone, "share_price_history" json);

create type "public"."userdetailstype" as ("user_id" bigint, "osu_name" character varying, "osu_picture" text, "osu_banner" text, "coins_held" numeric, "coins_invested" numeric, "user_history" json, "global_rank" bigint, "friend_rank" bigint);

CREATE OR REPLACE FUNCTION public.get_friends_leaderboard(p_user_id bigint)
 RETURNS SETOF leaderboardentrytype
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(10,2) AS total_coins,
    (
        (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(10,2) -
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
            (u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0))::numeric(13,2)
        )
    )::numeric(13,2) AS coin_differential
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
 RETURNS SETOF leaderboardentrytype
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(10,2) AS total_coins,
    (
        u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(10,2) - 
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
            u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)::numeric(13,2)
        )
    )::numeric(13,2) AS coin_differential
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

CREATE OR REPLACE FUNCTION public.get_stock_stats(p_stock_id bigint, p_user_id bigint)
 RETURNS SETOF stockdetailstype
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        COALESCE(us.num_shares, 0.0)::numeric(10,2) AS shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint AS share_rank,
        (
            SELECT COALESCE(
                (s.share_price - AVG(sh_hist.price)) / NULLIF(AVG(sh_hist.price), 0) * 100, 
                0.0
            )::numeric(10,2)
            FROM (
                SELECT price 
                FROM stocks_history sh_hist
                WHERE sh_hist.stock_id = s.stock_id 
                ORDER BY sh_hist.date DESC 
                LIMIT 2
            ) sh_hist
        ) AS share_price_change_percentage,
        s.osu_name,
        s.osu_picture,
        s.osu_banner,
        s.osu_rank,
        s.osu_pp::numeric(10,2),
        s.osu_rank_history,
        s.last_updated,
        COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history
    FROM
        stocks s
        LEFT JOIN users_stocks us ON s.stock_id = us.stock_id AND us.user_id = p_user_id
        LEFT JOIN (
            SELECT sh_hist.stock_id, json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json as share_price_history
            FROM stocks_history sh_hist
            WHERE sh_hist.stock_id = p_stock_id
            GROUP BY sh_hist.stock_id
        ) sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        s.stock_id = p_stock_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_stocks()
 RETURNS SETOF stockdetailstype
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT DISTINCT ON (s.stock_id)
            s.stock_id,
            s.share_price,
            COALESCE(us.num_shares, 0.0) AS shares_owned,
            rank() OVER (ORDER BY s.share_price DESC) AS share_rank,
            (
                SELECT COALESCE(
                    (s.share_price - AVG(sh_hist.price)) / NULLIF(AVG(sh_hist.price), 0) * 100, 
                    0.0
                )::numeric(10,2)
                FROM (
                    SELECT price 
                    FROM stocks_history sh_hist
                    WHERE sh_hist.stock_id = s.stock_id 
                    ORDER BY sh_hist.date DESC 
                    LIMIT 2
                ) sh_hist
            ) AS share_price_change_percentage,
            s.osu_name,
            s.osu_picture,
            s.osu_banner,
            s.osu_rank,
            s.osu_pp,
            s.osu_rank_history,
            s.last_updated,
            COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history
        FROM
            stocks s
            LEFT JOIN users_stocks us ON s.stock_id = us.stock_id
            LEFT JOIN (
                SELECT
                    sh_hist.stock_id,
                    json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json AS share_price_history
                FROM
                    stocks_history sh_hist
                GROUP BY
                    sh_hist.stock_id
            ) sp_history ON s.stock_id = sp_history.stock_id
        WHERE
            s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL
        ORDER BY
            s.stock_id
    ) AS distinct_stocks
    ORDER BY
        share_price_change_percentage DESC, stock_id
    LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_traders_today()
 RETURNS SETOF leaderboardentrytype
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,  -- Included osu_banner
    u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) AS total_coins,
    (
        u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0) - 
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
            u.coins_held + COALESCE(SUM(us.num_shares * s.share_price), 0)
        )
    )::NUMERIC(13,2) AS coin_differential
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner
  ORDER BY coin_differential DESC
  LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_details(user_req bigint)
 RETURNS SETOF userdetailstype
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY 
  WITH ranked_users AS (
    SELECT 
      u.user_id,
      u.coins_held,
      (COALESCE(SUM(s.share_price * us.num_shares), 0))::numeric(10,2) AS coins_invested,
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
      SELECT json_agg(json_build_object('date', uh.date, 'coins', uh.total_coins, 'global_rank', uh.global_rank, 'friend_rank', uh.friend_rank) ORDER BY uh.date)
      FROM users_history uh WHERE uh.user_id = ru.user_id
    ), '[]'::json) AS user_history,
    COALESCE(ru.global_rank, 1) AS global_rank,
    COALESCE(fr.friend_rank, 1) AS friend_rank
  FROM 
    ranked_users ru
    INNER JOIN users u ON ru.user_id = u.user_id
    LEFT JOIN friend_ranking fr ON ru.user_id = fr.user_id
  WHERE 
    ru.user_id = user_req;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_stocks(p_user_id bigint, p_page integer, p_page_size integer)
 RETURNS SETOF stockdetailstype
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        us.num_shares AS shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint AS share_rank,
        (
            SELECT COALESCE(
                (s.share_price - AVG(sh_hist.price)) / NULLIF(AVG(sh_hist.price), 0) * 100, 
                0.0
            )::numeric(10,2)
            FROM (
                SELECT price 
                FROM stocks_history sh_hist
                WHERE sh_hist.stock_id = s.stock_id 
                ORDER BY sh_hist.date DESC 
                LIMIT 2
            ) sh_hist
        ) AS share_price_change_percentage,
        s.osu_name,
        s.osu_picture,
        s.osu_banner,
        s.osu_rank,
        s.osu_pp,
        s.osu_rank_history,
        s.last_updated,
        COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history
    FROM
        users_stocks us
        INNER JOIN stocks s ON us.stock_id = s.stock_id
        LEFT JOIN (
            SELECT 
                sh.stock_id, 
                sh.price 
            FROM 
                stocks_history sh
                INNER JOIN (
                    SELECT 
                        sh_max.stock_id, 
                        MAX(sh_max.date) as max_date 
                    FROM 
                        stocks_history sh_max
                    GROUP BY 
                        sh_max.stock_id
                ) sh_latest ON sh.stock_id = sh_latest.stock_id AND sh.date = sh_latest.max_date
        ) latest_price ON us.stock_id = latest_price.stock_id
        LEFT JOIN (
            SELECT
                sh_hist.stock_id,
                json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date)::json as share_price_history
            FROM
                stocks_history sh_hist
            WHERE sh_hist.stock_id IN (SELECT us_inner.stock_id FROM users_stocks us_inner WHERE us_inner.user_id = p_user_id)
            GROUP BY
                sh_hist.stock_id
        ) sp_history ON us.stock_id = sp_history.stock_id
    WHERE
        us.user_id = p_user_id AND s.share_price IS NOT NULL AND s.osu_rank IS NOT NULL
    ORDER BY
        share_price_change_percentage DESC, us.stock_id
    LIMIT p_page_size + 1
    OFFSET (p_page - 1) * p_page_size;
END;
$function$
;


