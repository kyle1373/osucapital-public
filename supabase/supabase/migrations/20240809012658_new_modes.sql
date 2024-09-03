set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.refresh_top_views()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
    -- Refresh the top_traders materialized view
    REFRESH MATERIALIZED VIEW top_traders;

    -- Refresh the trending_stocks materialized view
    REFRESH MATERIALIZED VIEW trending_stocks;
$function$
;


