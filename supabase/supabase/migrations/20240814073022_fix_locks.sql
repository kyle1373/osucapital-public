set check_function_bodies = off;

CREATE UNIQUE INDEX top_traders_unique_idx ON public.top_traders USING btree (user_id);

CREATE UNIQUE INDEX trending_stocks_unique_idx ON public.trending_stocks USING btree (stock_id, mode);

CREATE OR REPLACE FUNCTION public.refresh_top_views()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET statement_timeout TO '60s'
AS $function$
BEGIN
    -- Refresh the top_traders materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY top_traders;

    -- Refresh the trending_stocks materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_stocks;
END;
$function$
;


