alter table "public"."users_stocks" add constraint "users_stocks_num_shares_check" CHECK ((num_shares >= (0)::double precision)) not valid;

alter table "public"."users_stocks" validate constraint "users_stocks_num_shares_check";


