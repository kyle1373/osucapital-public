revoke delete on table "public"."v_badges" from "anon";

revoke insert on table "public"."v_badges" from "anon";

revoke references on table "public"."v_badges" from "anon";

revoke select on table "public"."v_badges" from "anon";

revoke trigger on table "public"."v_badges" from "anon";

revoke truncate on table "public"."v_badges" from "anon";

revoke update on table "public"."v_badges" from "anon";

revoke delete on table "public"."v_badges" from "authenticated";

revoke insert on table "public"."v_badges" from "authenticated";

revoke references on table "public"."v_badges" from "authenticated";

revoke select on table "public"."v_badges" from "authenticated";

revoke trigger on table "public"."v_badges" from "authenticated";

revoke truncate on table "public"."v_badges" from "authenticated";

revoke update on table "public"."v_badges" from "authenticated";

revoke delete on table "public"."v_badges" from "service_role";

revoke insert on table "public"."v_badges" from "service_role";

revoke references on table "public"."v_badges" from "service_role";

revoke select on table "public"."v_badges" from "service_role";

revoke trigger on table "public"."v_badges" from "service_role";

revoke truncate on table "public"."v_badges" from "service_role";

revoke update on table "public"."v_badges" from "service_role";

drop table "public"."v_badges";

alter table "public"."seasons" add column "color_code" text;

alter table "public"."seasons" add column "description" text;

CREATE INDEX idx_season_leaderboards_season_id ON public.season_leaderboards USING btree (season_id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_top_players_by_season(p_season_id integer)
 RETURNS TABLE(rank bigint, user_id bigint, osu_name character varying, osu_picture text, total_coins numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY sl.total_coins DESC) AS rank,
        sl.user_id,
        u.osu_name,
        u.osu_picture,
        sl.total_coins
    FROM
        season_leaderboards sl
    JOIN
        users u ON u.user_id = sl.user_id
    WHERE
        sl.season_id = p_season_id
    ORDER BY
        sl.total_coins DESC
    LIMIT 100;
END;
$function$
;


