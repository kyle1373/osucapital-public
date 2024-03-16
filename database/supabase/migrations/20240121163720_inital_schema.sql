set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.log_stocks_history()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    stock_record RECORD;
BEGIN
    FOR stock_record IN SELECT stock_id, share_price FROM stocks WHERE share_price IS NOT NULL LOOP
        INSERT INTO stocks_history (date, stock_id, price)
        VALUES (NOW(), stock_record.stock_id, stock_record.share_price);
    END LOOP;
END;
$function$
;


