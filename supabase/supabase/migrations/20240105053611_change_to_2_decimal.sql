alter table "public"."stocks" alter column "share_price" set data type NUMERIC(10,2) using "share_price"::NUMERIC(10,2);

alter table "public"."stocks_history" alter column "price" set data type NUMERIC(10,2) using "price"::NUMERIC(10,2);

alter table "public"."trades" alter column "coins" set data type NUMERIC(10,2) using "coins"::NUMERIC(10,2);

alter table "public"."trades" alter column "num_shares" set data type NUMERIC(10,2) using "num_shares"::NUMERIC(10,2);

alter table "public"."users" alter column "coins_held" set data type NUMERIC(10,2) using "coins_held"::NUMERIC(10,2);

alter table "public"."users_history" alter column "total_coins" set data type NUMERIC(10,2) using "total_coins"::NUMERIC(10,2);

alter table "public"."users_stocks" alter column "num_shares" set data type NUMERIC(10,2) using "num_shares"::NUMERIC(10,2);