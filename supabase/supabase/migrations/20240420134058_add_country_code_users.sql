alter table "public"."users" add column "osu_country_code" text;

CREATE INDEX idx_users_osu_country_code ON public.users USING btree (osu_country_code);


