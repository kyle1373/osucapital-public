CREATE INDEX idx_season_leaderboards_user_season ON public.season_leaderboards USING btree (user_id, season_id);


