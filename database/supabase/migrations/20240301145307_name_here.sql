set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_tax_on_profit(p_profit numeric, p_days_held numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tax_rate numeric;
    v_tax_amount numeric;
BEGIN
    -- Calculate the tax rate based on days the shares were held, allowing for decimal values
    -- Ensure the tax rate does not exceed 1 (100%)
    v_tax_rate := 0.5 * LEAST(1, GREATEST(0, 1 - LN(GREATEST(p_days_held + 1, 1)) / LN(8)));

    -- Calculate the tax amount based on the profit and the tax rate
    -- Ensure non-negative tax and that tax does not exceed the profit itself
    v_tax_amount := GREATEST(0, LEAST(p_profit, p_profit * v_tax_rate)); 

    RETURN v_tax_amount;
END;
$function$
;


