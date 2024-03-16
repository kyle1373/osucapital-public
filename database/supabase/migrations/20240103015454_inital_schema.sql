alter table "public"."users_stock" drop constraint "users_stock_stock_id_fkey";

alter table "public"."users_stock" drop constraint "users_stock_user_id_fkey";

alter table "public"."users_stock" drop constraint "users_stock_pkey";

drop index if exists "public"."users_stock_pkey";

drop table "public"."users_stock";

create table "public"."users_stocks" (
    "user_id" bigint not null,
    "stock_id" bigint not null,
    "last_updated" timestamp with time zone not null default now(),
    "num_shares" double precision not null
);


alter table "public"."users_stocks" enable row level security;

CREATE UNIQUE INDEX users_stocks_pkey ON public.users_stocks USING btree (user_id, stock_id);

alter table "public"."users_stocks" add constraint "users_stocks_pkey" PRIMARY KEY using index "users_stocks_pkey";

alter table "public"."stocks" add constraint "stocks_share_price_check" CHECK ((share_price > (0)::double precision)) not valid;

alter table "public"."stocks" validate constraint "stocks_share_price_check";

alter table "public"."trades" add constraint "trades_coins_check" CHECK ((coins >= (0)::double precision)) not valid;

alter table "public"."trades" validate constraint "trades_coins_check";

alter table "public"."trades" add constraint "trades_shares_check" CHECK ((shares > (0)::double precision)) not valid;

alter table "public"."trades" validate constraint "trades_shares_check";

alter table "public"."users" add constraint "users_coins_held_check" CHECK ((coins_held >= (0)::double precision)) not valid;

alter table "public"."users" validate constraint "users_coins_held_check";

alter table "public"."users_stocks" add constraint "users_stocks_stock_id_fkey" FOREIGN KEY (stock_id) REFERENCES stocks(stock_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_stocks" validate constraint "users_stocks_stock_id_fkey";

alter table "public"."users_stocks" add constraint "users_stocks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_stocks" validate constraint "users_stocks_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_stock_stats(p_stock_id bigint, p_user_id bigint)
 RETURNS TABLE(stock_id bigint, share_price double precision, shares_owned double precision, share_rank bigint, share_price_change_percentage double precision, osu_id bigint, osu_name character varying, osu_picture text, osu_rank integer, osu_pp double precision, last_updated timestamp with time zone, share_price_history json)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        s.stock_id,
        s.share_price,
        COALESCE(SUM(us.num_shares), 0.0) as shares_owned,
        rank() OVER (ORDER BY s.share_price DESC)::bigint as share_rank,  -- Cast to bigint
        (s.share_price - lag(s.share_price) OVER (ORDER BY s.last_updated)) / lag(s.share_price) OVER (ORDER BY s.last_updated) * 100 as share_price_change_percentage,
        s.stock_id as osu_id,
        s.osu_name,
        s.osu_picture,
        s.osu_rank,
        s.osu_pp,
        s.last_updated,
        COALESCE(sp_history.share_price_history::json, '[]'::json) as share_price_history
    FROM
        stocks s
        LEFT JOIN users_stocks us ON s.stock_id = us.stock_id AND us.user_id = COALESCE(p_user_id, us.user_id)
        LEFT JOIN (
            SELECT
                sh.stock_id,
                json_agg(json_build_object('date', sh.date, 'price', sh.price))::text as share_price_history
            FROM
                stocks_history sh
            GROUP BY
                sh.stock_id
        ) sp_history ON s.stock_id = sp_history.stock_id
    WHERE
        s.stock_id = p_stock_id
    GROUP BY
        s.stock_id, sp_history.share_price_history;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_details(user_req bigint)
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, coins_held double precision, coins_invested double precision, coin_history json, global_rank bigint, friend_rank bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY 
  WITH ranked_users AS (
    SELECT 
      u.user_id,
      u.coins_held,
      COALESCE(SUM(s.share_price * us.num_shares), 0) AS coins_invested,
      RANK() OVER (ORDER BY (u.coins_held + COALESCE(SUM(s.share_price * us.num_shares), 0)) DESC)::bigint AS global_rank
    FROM 
      users u
      LEFT JOIN users_stocks us ON u.user_id = us.user_id
      LEFT JOIN stocks s ON us.stock_id = s.stock_id
    GROUP BY u.user_id
  ),
  friend_ranking AS (
    SELECT 
      f.user_id,
      MIN(ru.global_rank) AS min_friend_rank
    FROM 
      friends f
      INNER JOIN ranked_users ru ON f.friend_id = ru.user_id
    WHERE 
      f.user_id = user_req
    GROUP BY f.user_id
  )
  SELECT 
    ru.user_id,
    u.osu_name,
    u.osu_picture,
    ru.coins_held,
    ru.coins_invested,
    COALESCE((SELECT json_agg(json_build_object('date', uh.date, 'coins', uh.total_coins))
              FROM users_history uh WHERE uh.user_id = ru.user_id), '[]'::json) AS coin_history,
    COALESCE(ru.global_rank, 1) AS global_rank,
    COALESCE(fr.min_friend_rank, 1) AS friend_rank
  FROM 
    ranked_users ru
    INNER JOIN users u ON ru.user_id = u.user_id
    LEFT JOIN friend_ranking fr ON ru.user_id = fr.user_id
  WHERE 
    ru.user_id = user_req;
END; $function$
;


