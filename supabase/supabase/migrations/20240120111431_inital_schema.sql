alter table "public"."season_leaderboards" alter column "season_id" set not null;

alter table "public"."season_leaderboards" add constraint "season_leaderboards_season_id_fkey" FOREIGN KEY (season_id) REFERENCES seasons(season_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."season_leaderboards" validate constraint "season_leaderboards_season_id_fkey";


