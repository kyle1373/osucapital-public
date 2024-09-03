set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.refresh_stock(p_stock_id bigint, p_osu_user_data jsonb, p_do_dilute_shares boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  original_share_price NUMERIC;
  new_share_price NUMERIC;
BEGIN
  -- Get the new share price from p_osu_user_data
  new_share_price := (p_osu_user_data->>'share_price')::NUMERIC;

  -- If p_do_dilute_shares is true, perform share dilution process
  IF p_do_dilute_shares AND new_share_price IS NOT NULL THEN
    -- Retrieve the original share price
    SELECT share_price INTO original_share_price
    FROM stocks
    WHERE stock_id = p_stock_id;

    -- If the original share price is undefined or the row does not exist, exit the process
    IF original_share_price IS NULL THEN
      -- Skip the dilution process but continue with the update
      RAISE NOTICE 'Original share price is null. Skipping dilution process.';
    ELSE
      -- Set shares_left to 0 in trades table where p_stock_id matches
      UPDATE trades
      SET shares_left = 0
      WHERE stock_id = p_stock_id AND shares_left > 0;

      -- Update num_shares in users_stocks table
      UPDATE users_stocks
      SET num_shares = (num_shares * original_share_price) / new_share_price
      WHERE stock_id = p_stock_id;
    END IF;
  END IF;

  -- Update stocks table with p_osu_user_data or insert if it does not exist
  INSERT INTO stocks (
    stock_id, last_updated, share_price, osu_name, osu_picture, osu_banner,
    osu_rank, osu_pp, osu_rank_history, osu_playcount_history, osu_join_date,
    is_buyable, is_sellable, osu_country_code, is_banned, osu_best_plays
  ) VALUES (
    p_stock_id,
    (p_osu_user_data->>'last_updated')::TIMESTAMPTZ,
    (p_osu_user_data->>'share_price')::NUMERIC,
    (p_osu_user_data->>'osu_name')::TEXT,
    (p_osu_user_data->>'osu_picture')::TEXT,
    (p_osu_user_data->>'osu_banner')::TEXT,
    (p_osu_user_data->>'osu_rank')::INTEGER,
    (p_osu_user_data->>'osu_pp')::NUMERIC,
    (SELECT ARRAY(SELECT jsonb_array_elements_text(p_osu_user_data->'osu_rank_history')::INTEGER)),
    (SELECT ARRAY(SELECT jsonb_array_elements(p_osu_user_data->'osu_playcount_history')::JSONB)),
    (p_osu_user_data->>'osu_join_date')::TIMESTAMPTZ,
    (p_osu_user_data->>'is_buyable')::BOOLEAN,
    (p_osu_user_data->>'is_sellable')::BOOLEAN,
    (p_osu_user_data->>'osu_country_code')::TEXT,
    (p_osu_user_data->>'is_banned')::BOOLEAN,
    (SELECT ARRAY(SELECT jsonb_array_elements(p_osu_user_data->'osu_best_plays')::JSONB))
  )
  ON CONFLICT (stock_id) DO UPDATE SET
    last_updated = CASE WHEN p_osu_user_data ? 'last_updated' THEN EXCLUDED.last_updated ELSE stocks.last_updated END,
    share_price = CASE WHEN p_osu_user_data ? 'share_price' THEN EXCLUDED.share_price ELSE stocks.share_price END,
    osu_name = CASE WHEN p_osu_user_data ? 'osu_name' THEN EXCLUDED.osu_name ELSE stocks.osu_name END,
    osu_picture = CASE WHEN p_osu_user_data ? 'osu_picture' THEN EXCLUDED.osu_picture ELSE stocks.osu_picture END,
    osu_banner = CASE WHEN p_osu_user_data ? 'osu_banner' THEN EXCLUDED.osu_banner ELSE stocks.osu_banner END,
    osu_rank = CASE WHEN p_osu_user_data ? 'osu_rank' THEN EXCLUDED.osu_rank ELSE stocks.osu_rank END,
    osu_pp = CASE WHEN p_osu_user_data ? 'osu_pp' THEN EXCLUDED.osu_pp ELSE stocks.osu_pp END,
    osu_rank_history = CASE WHEN p_osu_user_data ? 'osu_rank_history' THEN EXCLUDED.osu_rank_history ELSE stocks.osu_rank_history END,
    osu_playcount_history = CASE WHEN p_osu_user_data ? 'osu_playcount_history' THEN EXCLUDED.osu_playcount_history ELSE stocks.osu_playcount_history END,
    osu_join_date = CASE WHEN p_osu_user_data ? 'osu_join_date' THEN EXCLUDED.osu_join_date ELSE stocks.osu_join_date END,
    is_buyable = CASE WHEN p_osu_user_data ? 'is_buyable' THEN EXCLUDED.is_buyable ELSE stocks.is_buyable END,
    is_sellable = CASE WHEN p_osu_user_data ? 'is_sellable' THEN EXCLUDED.is_sellable ELSE stocks.is_sellable END,
    osu_country_code = CASE WHEN p_osu_user_data ? 'osu_country_code' THEN EXCLUDED.osu_country_code ELSE stocks.osu_country_code END,
    is_banned = CASE WHEN p_osu_user_data ? 'is_banned' THEN EXCLUDED.is_banned ELSE stocks.is_banned END,
    osu_best_plays = CASE WHEN p_osu_user_data ? 'osu_best_plays' THEN EXCLUDED.osu_best_plays ELSE stocks.osu_best_plays END;

END;
$function$
;


