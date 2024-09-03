set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_zero_num_shares_users_stocks()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.num_shares = 0 THEN
        DELETE FROM users_stocks WHERE user_id = NEW.user_id AND stock_id = NEW.stock_id;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE TRIGGER trigger_delete_zero_num_shares_users_stocks BEFORE INSERT OR UPDATE ON public.users_stocks FOR EACH ROW EXECUTE FUNCTION delete_zero_num_shares_users_stocks();


