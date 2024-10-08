create type "public"."stripe_subscription_status" as enum ('active', 'inactive');

create table "public"."realtime_logs" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "osu_id" bigint not null,
    "pp_changed" boolean not null default false,
    "profile_changed" boolean not null default false,
    "playcount_changed" boolean not null default false,
    "osu_picture_old" text not null,
    "osu_picture_new" text not null,
    "osu_username_old" text not null,
    "osu_username_new" text not null,
    "osu_pp_old" numeric not null,
    "osu_pp_new" numeric not null,
    "osu_rank_old" bigint not null,
    "osu_rank_new" bigint not null,
    "osu_playcount_old" bigint not null,
    "osu_playcount_new" bigint not null
);


alter table "public"."realtime_logs" enable row level security;

alter table "public"."users" add column "stripe_subscription_status" stripe_subscription_status;

CREATE INDEX idx_realtime_logs_created_at ON public.realtime_logs USING btree (created_at);

CREATE INDEX idx_realtime_logs_osu_id ON public.realtime_logs USING btree (osu_id);

CREATE INDEX idx_realtime_logs_playcount_changed ON public.realtime_logs USING btree (playcount_changed);

CREATE INDEX idx_realtime_logs_pp_changed ON public.realtime_logs USING btree (pp_changed);

CREATE INDEX idx_realtime_logs_profile_changed ON public.realtime_logs USING btree (profile_changed);

CREATE UNIQUE INDEX realtime_logs_pkey ON public.realtime_logs USING btree (id);

alter table "public"."realtime_logs" add constraint "realtime_logs_pkey" PRIMARY KEY using index "realtime_logs_pkey";

grant delete on table "public"."realtime_logs" to "anon";

grant insert on table "public"."realtime_logs" to "anon";

grant references on table "public"."realtime_logs" to "anon";

grant select on table "public"."realtime_logs" to "anon";

grant trigger on table "public"."realtime_logs" to "anon";

grant truncate on table "public"."realtime_logs" to "anon";

grant update on table "public"."realtime_logs" to "anon";

grant delete on table "public"."realtime_logs" to "authenticated";

grant insert on table "public"."realtime_logs" to "authenticated";

grant references on table "public"."realtime_logs" to "authenticated";

grant select on table "public"."realtime_logs" to "authenticated";

grant trigger on table "public"."realtime_logs" to "authenticated";

grant truncate on table "public"."realtime_logs" to "authenticated";

grant update on table "public"."realtime_logs" to "authenticated";

grant delete on table "public"."realtime_logs" to "service_role";

grant insert on table "public"."realtime_logs" to "service_role";

grant references on table "public"."realtime_logs" to "service_role";

grant select on table "public"."realtime_logs" to "service_role";

grant trigger on table "public"."realtime_logs" to "service_role";

grant truncate on table "public"."realtime_logs" to "service_role";

grant update on table "public"."realtime_logs" to "service_role";


