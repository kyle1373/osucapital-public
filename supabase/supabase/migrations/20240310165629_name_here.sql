alter table "public"."users" drop constraint "users_coins_held_check";

alter table "public"."users" add constraint "users_coins_held_check" CHECK (((coins_held >= (0)::numeric) AND (coins_held <= (999999999)::numeric))) not valid;

alter table "public"."users" validate constraint "users_coins_held_check";


