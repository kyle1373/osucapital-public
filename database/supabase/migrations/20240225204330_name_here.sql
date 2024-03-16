alter table "public"."badges" drop constraint "badges_pkey" cascade;

alter table "public"."users_badges" drop constraint "users_badges_pkey" cascade;

drop index if exists "public"."badges_pkey" cascade;

drop index if exists "public"."users_badges_pkey" cascade;

alter table "public"."badges" alter column "badge_id" drop identity;

alter table "public"."badges" alter column "badge_id" set data type text using "badge_id"::text;

alter table "public"."badges" alter column "name" drop not null;

alter table "public"."users_badges" alter column "badge_id" set data type text using "badge_id"::text;

CREATE UNIQUE INDEX badges_test_pkey ON public.badges USING btree (badge_id);

CREATE UNIQUE INDEX users_badges_test_pkey ON public.users_badges USING btree (badge_id, user_id);

alter table "public"."badges" add constraint "badges_test_pkey" PRIMARY KEY using index "badges_test_pkey";

alter table "public"."users_badges" add constraint "users_badges_test_pkey" PRIMARY KEY using index "users_badges_test_pkey";


