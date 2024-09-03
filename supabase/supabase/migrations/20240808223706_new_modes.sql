set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.refresh_top_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Refresh the top_traders materialized view
    REFRESH MATERIALIZED VIEW top_traders;

    -- Refresh the trending_stocks materialized view
    REFRESH MATERIALIZED VIEW trending_stocks;

    -- Optionally, you can log the refresh time or perform other actions here
    RAISE NOTICE 'Materialized views refreshed at %', now();
END;
$function$
;


