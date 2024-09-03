set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.refresh_top_views()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Refresh the top_traders materialized view
    REFRESH MATERIALIZED VIEW top_traders;

    -- Refresh the trending_stocks materialized view
    REFRESH MATERIALIZED VIEW trending_stocks;

    -- Optionally, you can log the refresh time or perform other actions here
    RAISE NOTICE 'Materialized views refreshed at %', now();
END;
$function$
;

create materialized view "public"."top_traders" as  WITH user_latest_coins AS (
         SELECT DISTINCT ON (h.user_id) h.user_id,
            h.total_coins AS total_latest_coins
           FROM users_history h
          ORDER BY h.user_id, h.date DESC
        ), banned_trades AS (
         SELECT DISTINCT t.user_id
           FROM trades t
          WHERE ((t."timestamp" >= (now() - '1 day'::interval)) AND (t.sold_while_banned = true))
        )
 SELECT u.user_id,
    u.osu_name,
    u.osu_picture,
    u.osu_banner,
    (u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)) AS total_coins,
    (COALESCE(
        CASE
            WHEN (COALESCE(ua.total_latest_coins, (0)::numeric) <= (0)::numeric) THEN (0)::numeric
            ELSE ((((u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)) - COALESCE(ua.total_latest_coins, (u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)))) / COALESCE(ua.total_latest_coins, (u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)))) * (100)::numeric)
        END, (0)::numeric))::numeric(13,2) AS coin_differential,
    (u.stripe_subscription_status = 'active'::stripe_subscription_status) AS is_supporter,
    u.color_flare,
    u.osu_country_code
   FROM ((((users u
     LEFT JOIN users_stocks us ON ((u.user_id = us.user_id)))
     LEFT JOIN stocks s ON ((us.stock_id = s.stock_id)))
     LEFT JOIN user_latest_coins ua ON ((u.user_id = ua.user_id)))
     LEFT JOIN banned_trades bt ON ((u.user_id = bt.user_id)))
  WHERE (bt.user_id IS NULL)
  GROUP BY u.user_id, u.osu_name, u.osu_picture, u.osu_banner, ua.total_latest_coins
  ORDER BY ((COALESCE(
        CASE
            WHEN (COALESCE(ua.total_latest_coins, (0)::numeric) <= (0)::numeric) THEN (0)::numeric
            ELSE ((((u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)) - COALESCE(ua.total_latest_coins, (u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)))) / COALESCE(ua.total_latest_coins, (u.coins_held + COALESCE(sum((us.num_shares * s.share_price)), (0)::numeric)))) * (100)::numeric)
        END, (0)::numeric))::numeric(13,2)) DESC;


CREATE INDEX idx_user_trending_coins_coin_differential ON public.top_traders USING btree (coin_differential DESC);

CREATE INDEX idx_user_trending_coins_total_coins ON public.top_traders USING btree (total_coins);

CREATE INDEX idx_user_trending_coins_user_id ON public.top_traders USING btree (user_id);


