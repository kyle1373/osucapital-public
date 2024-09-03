alter table "public"."trades" drop constraint "trades_shares_check";

alter table "public"."trades" drop column "shares";

alter table "public"."trades" add column "num_shares" double precision not null;

alter table "public"."trades" add constraint "trades_shares_check" CHECK ((num_shares > (0)::double precision)) not valid;

alter table "public"."trades" validate constraint "trades_shares_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_latest_leaderboard()
 RETURNS TABLE(user_id bigint, osu_name character varying, osu_picture text, total_coins double precision, coin_differential_24h double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.osu_name,
    u.osu_picture,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) as total_coins,
    u.coins_held + COALESCE(sum(us.num_shares * s.share_price), 0) - uh.total_coins as coin_differential_24h
  FROM
    users u
    LEFT JOIN users_stocks us ON u.user_id = us.user_id
    LEFT JOIN stocks s ON us.stock_id = s.stock_id
    LEFT JOIN LATERAL (
      SELECT h.total_coins
      FROM users_history h
      WHERE h.user_id = u.user_id
      ORDER BY h.date DESC
      LIMIT 1
    ) uh ON true
  GROUP BY u.user_id, u.osu_name, u.osu_picture, uh.total_coins
  ORDER BY total_coins DESC
  LIMIT 100;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_user_coins()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    user_record RECORD;
    total_invested_coins DOUBLE PRECISION;
    stock_record RECORD;
BEGIN
    FOR user_record IN SELECT * FROM users LOOP
        total_invested_coins := 0;

        FOR stock_record IN SELECT us.stock_id, us.num_shares, s.share_price FROM users_stocks us
            JOIN stocks s ON us.stock_id = s.stock_id
            WHERE us.user_id = user_record.user_id LOOP
            
            total_invested_coins := total_invested_coins + (stock_record.num_shares * stock_record.share_price);
        END LOOP;

        INSERT INTO users_history(user_id, date, total_coins)
        VALUES (user_record.user_id, NOW(), user_record.coins_held + total_invested_coins);
    END LOOP;
END;
$function$
;


