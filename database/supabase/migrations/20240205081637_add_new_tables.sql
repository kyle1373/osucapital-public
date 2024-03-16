create table "public"."badges" (
    "badge_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "description" text
);


alter table "public"."badges" enable row level security;

create table "public"."roles" (
    "role_id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "name" text not null
);


alter table "public"."roles" enable row level security;

create table "public"."users_badges" (
    "created_at" timestamp with time zone not null default now(),
    "user_id" bigint not null,
    "badge_id" bigint not null
);


alter table "public"."users_badges" enable row level security;

create table "public"."users_roles" (
    "created_at" timestamp with time zone not null default now(),
    "user_id" bigint not null,
    "role_id" bigint not null
);


alter table "public"."users_roles" enable row level security;

CREATE UNIQUE INDEX badges_pkey ON public.badges USING btree (badge_id);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (role_id);

CREATE UNIQUE INDEX users_badges_pkey ON public.users_badges USING btree (user_id, badge_id);

CREATE UNIQUE INDEX users_roles_pkey ON public.users_roles USING btree (user_id, role_id);

alter table "public"."badges" add constraint "badges_pkey" PRIMARY KEY using index "badges_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."users_badges" add constraint "users_badges_pkey" PRIMARY KEY using index "users_badges_pkey";

alter table "public"."users_roles" add constraint "users_roles_pkey" PRIMARY KEY using index "users_roles_pkey";

alter table "public"."users_badges" add constraint "users_badges_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_badges" validate constraint "users_badges_badge_id_fkey";

alter table "public"."users_badges" add constraint "users_badges_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_badges" validate constraint "users_badges_user_id_fkey";

alter table "public"."users_roles" add constraint "users_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(role_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_roles" validate constraint "users_roles_role_id_fkey";

alter table "public"."users_roles" add constraint "users_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_roles" validate constraint "users_roles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sell_shares(p_user_id bigint, p_stock_id bigint, p_num_shares numeric, p_share_price numeric)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_coins_held numeric;
    v_current_shares numeric;
    v_coins_earned numeric;
    v_new_coin_total numeric;
    v_total_cost_basis numeric := 0;
    v_net_profit numeric;
    v_shares_to_sell numeric := p_num_shares;
    v_shares_used numeric;
    v_buy_trade RECORD;
    v_days_passed numeric;
    v_tax_rate numeric;
    v_profit_before_tax numeric;
    v_tax_amount numeric;
    v_total_tax numeric := 0;
BEGIN
    -- Get the current coins held by the user
    SELECT coins_held INTO v_coins_held
    FROM users
    WHERE user_id = p_user_id;

    -- Get the current number of shares the user holds for the stock
    SELECT num_shares INTO v_current_shares
    FROM users_stocks
    WHERE user_id = p_user_id AND stock_id = p_stock_id;

    IF v_current_shares IS NULL OR v_current_shares < p_num_shares THEN
        RAISE EXCEPTION 'You do not have enough shares.';
    END IF;

    -- Calculate the coins earned from selling the shares
    v_coins_earned := p_share_price * p_num_shares;
    v_net_profit := 0;  -- Initialize net profit

    -- Fetch relevant buy trades in FIFO order
    FOR v_buy_trade IN SELECT * FROM trades 
        WHERE user_id = p_user_id AND stock_id = p_stock_id AND type = 'buy' AND shares_left > 0 
        ORDER BY timestamp LOOP

        -- Calculate the number of shares to use from this buy trade
        v_shares_used := LEAST(v_shares_to_sell, v_buy_trade.shares_left);
        v_profit_before_tax := (p_share_price - (v_buy_trade.coins / v_buy_trade.num_shares)) * v_shares_used;

        -- Calculate days passed since the buy trade
        v_days_passed := EXTRACT(EPOCH FROM (NOW() - v_buy_trade.timestamp)) / 86400;

        -- Calculate the tax rate
        v_tax_rate := GREATEST(0, 1 - LN(v_days_passed + 1) / LN(8));

        -- Calculate tax amount and accumulate tax
        v_tax_amount := GREATEST(0, v_profit_before_tax * v_tax_rate); -- Ensure non-negative tax
        v_total_tax := v_total_tax + v_tax_amount;

        -- Update cost basis and net profit
        v_total_cost_basis := v_total_cost_basis + (v_buy_trade.coins / v_buy_trade.num_shares) * v_shares_used;
        v_net_profit := v_net_profit + (v_profit_before_tax - v_tax_amount);

        -- Decrement shares left in the buy trade and in the selling transaction
        UPDATE trades SET shares_left = shares_left - v_shares_used WHERE id = v_buy_trade.id;
        v_shares_to_sell := v_shares_to_sell - v_shares_used;

        -- Break loop if all shares are accounted for
        IF v_shares_to_sell <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- Update user's shares and coins
    v_new_coin_total := v_coins_held + v_coins_earned - v_total_tax;
    UPDATE users
    SET coins_held = v_new_coin_total
    WHERE user_id = p_user_id;

    -- Update or delete the user's stock record
    IF v_current_shares - p_num_shares = 0 THEN
        DELETE FROM users_stocks
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    ELSE
        UPDATE users_stocks
        SET num_shares = v_current_shares - p_num_shares
        WHERE user_id = p_user_id AND stock_id = p_stock_id;
    END IF;

    -- Insert the sell trade with shares_left as 0
    INSERT INTO trades (user_id, stock_id, type, num_shares, coins, shares_left)
    VALUES (p_user_id, p_stock_id, 'sell', p_num_shares, v_coins_earned, 0);

    -- Calculate final profit or loss
    v_net_profit := v_coins_earned - v_total_cost_basis - v_total_tax;
    RETURN v_net_profit;
END;
$function$
;

grant delete on table "public"."badges" to "anon";

grant insert on table "public"."badges" to "anon";

grant references on table "public"."badges" to "anon";

grant select on table "public"."badges" to "anon";

grant trigger on table "public"."badges" to "anon";

grant truncate on table "public"."badges" to "anon";

grant update on table "public"."badges" to "anon";

grant delete on table "public"."badges" to "authenticated";

grant insert on table "public"."badges" to "authenticated";

grant references on table "public"."badges" to "authenticated";

grant select on table "public"."badges" to "authenticated";

grant trigger on table "public"."badges" to "authenticated";

grant truncate on table "public"."badges" to "authenticated";

grant update on table "public"."badges" to "authenticated";

grant delete on table "public"."badges" to "service_role";

grant insert on table "public"."badges" to "service_role";

grant references on table "public"."badges" to "service_role";

grant select on table "public"."badges" to "service_role";

grant trigger on table "public"."badges" to "service_role";

grant truncate on table "public"."badges" to "service_role";

grant update on table "public"."badges" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."users_badges" to "anon";

grant insert on table "public"."users_badges" to "anon";

grant references on table "public"."users_badges" to "anon";

grant select on table "public"."users_badges" to "anon";

grant trigger on table "public"."users_badges" to "anon";

grant truncate on table "public"."users_badges" to "anon";

grant update on table "public"."users_badges" to "anon";

grant delete on table "public"."users_badges" to "authenticated";

grant insert on table "public"."users_badges" to "authenticated";

grant references on table "public"."users_badges" to "authenticated";

grant select on table "public"."users_badges" to "authenticated";

grant trigger on table "public"."users_badges" to "authenticated";

grant truncate on table "public"."users_badges" to "authenticated";

grant update on table "public"."users_badges" to "authenticated";

grant delete on table "public"."users_badges" to "service_role";

grant insert on table "public"."users_badges" to "service_role";

grant references on table "public"."users_badges" to "service_role";

grant select on table "public"."users_badges" to "service_role";

grant trigger on table "public"."users_badges" to "service_role";

grant truncate on table "public"."users_badges" to "service_role";

grant update on table "public"."users_badges" to "service_role";

grant delete on table "public"."users_roles" to "anon";

grant insert on table "public"."users_roles" to "anon";

grant references on table "public"."users_roles" to "anon";

grant select on table "public"."users_roles" to "anon";

grant trigger on table "public"."users_roles" to "anon";

grant truncate on table "public"."users_roles" to "anon";

grant update on table "public"."users_roles" to "anon";

grant delete on table "public"."users_roles" to "authenticated";

grant insert on table "public"."users_roles" to "authenticated";

grant references on table "public"."users_roles" to "authenticated";

grant select on table "public"."users_roles" to "authenticated";

grant trigger on table "public"."users_roles" to "authenticated";

grant truncate on table "public"."users_roles" to "authenticated";

grant update on table "public"."users_roles" to "authenticated";

grant delete on table "public"."users_roles" to "service_role";

grant insert on table "public"."users_roles" to "service_role";

grant references on table "public"."users_roles" to "service_role";

grant select on table "public"."users_roles" to "service_role";

grant trigger on table "public"."users_roles" to "service_role";

grant truncate on table "public"."users_roles" to "service_role";

grant update on table "public"."users_roles" to "service_role";


