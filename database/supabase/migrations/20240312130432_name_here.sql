ALTER TYPE stock_details_type ADD ATTRIBUTE osu_playcount_history jsonb[];
ALTER TYPE stock_details_type ADD ATTRIBUTE osu_join_date timestamp with time zone;
ALTER TYPE stock_details_type ADD ATTRIBUTE is_buyable boolean;
ALTER TYPE stock_details_type ADD ATTRIBUTE prevent_trades boolean;
ALTER TYPE stock_details_type ADD ATTRIBUTE osu_country_code text;
ALTER TYPE stock_details_type ADD ATTRIBUTE is_sellable boolean;
