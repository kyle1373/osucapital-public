set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_stock_rank_history(stock_ids bigint[])
 RETURNS TABLE(stock_id bigint, osu_rank_history integer[])
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY 
  SELECT s.stock_id, s.osu_rank_history
  FROM stocks s
  WHERE s.stock_id = ANY(stock_ids);
END;
$function$
;


