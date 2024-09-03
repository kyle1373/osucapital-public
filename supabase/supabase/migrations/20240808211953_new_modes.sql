alter table "public"."stocks_history" drop constraint "stocks_history_stock_id_fkey";

alter table "public"."trades" drop constraint "trades_stock_id_fkey";

alter table "public"."users_stocks" drop constraint "users_stocks_stock_id_fkey";

alter table "public"."stocks" drop constraint "stocks_pkey";

alter table "public"."users_stocks" drop constraint "users_stocks_pkey";

drop index if exists "public"."stocks_pkey";

drop index if exists "public"."users_stocks_pkey";

alter table "public"."stocks" add column "mode" text not null default 'osu'::text;

alter table "public"."stocks_history" add column "stock_mode" text not null default 'osu'::text;

alter table "public"."trades" add column "stock_mode" text not null default 'osu'::text;

alter table "public"."users_stocks" add column "stock_mode" text not null default 'osu'::text;

CREATE INDEX idx_stock_history_stock_id_date ON public.stocks_history USING btree (stock_id, date);

CREATE UNIQUE INDEX stocks_pkey ON public.stocks USING btree (stock_id, mode);

CREATE UNIQUE INDEX users_stocks_pkey ON public.users_stocks USING btree (user_id, stock_id, stock_mode);

alter table "public"."stocks" add constraint "stocks_pkey" PRIMARY KEY using index "stocks_pkey";

alter table "public"."users_stocks" add constraint "users_stocks_pkey" PRIMARY KEY using index "users_stocks_pkey";

alter table "public"."stocks_history" add constraint "users_stocks_stock_id_mode" FOREIGN KEY (stock_id, stock_mode) REFERENCES stocks(stock_id, mode) not valid;

alter table "public"."stocks_history" validate constraint "users_stocks_stock_id_mode";

alter table "public"."trades" add constraint "users_stocks_stock_id_mode" FOREIGN KEY (stock_id, stock_mode) REFERENCES stocks(stock_id, mode) not valid;

alter table "public"."trades" validate constraint "users_stocks_stock_id_mode";

alter table "public"."users_stocks" add constraint "users_stocks_stock_id_mode" FOREIGN KEY (stock_id, stock_mode) REFERENCES stocks(stock_id, mode) not valid;

alter table "public"."users_stocks" validate constraint "users_stocks_stock_id_mode";

create materialized view "public"."trending_stocks" as  SELECT s.stock_id,
    s.share_price,
    rank() OVER (ORDER BY s.share_price DESC) AS share_rank,
    (COALESCE((((s.share_price - avg_price.avg_price) / NULLIF(avg_price.avg_price, (0)::numeric)) * (100)::numeric), 0.0))::numeric(100,2) AS share_price_change_percentage,
    COALESCE(sp_history.share_price_history, '[]'::json) AS share_price_history,
    s.osu_name,
    s.osu_picture,
    s.osu_banner,
    s.osu_rank,
    s.osu_pp,
    s.osu_rank_history,
    s.last_updated,
    s.osu_playcount_history,
    s.osu_join_date,
    s.is_buyable,
    s.prevent_trades,
    s.osu_country_code,
    s.is_sellable,
    s.is_banned,
    s.mode
   FROM ((stocks s
     LEFT JOIN ( SELECT sh_hist.stock_id,
            json_agg(json_build_object('date', sh_hist.date, 'price', sh_hist.price) ORDER BY sh_hist.date) AS share_price_history
           FROM stocks_history sh_hist
          GROUP BY sh_hist.stock_id) sp_history ON ((s.stock_id = sp_history.stock_id)))
     LEFT JOIN ( SELECT stocks_history.stock_id,
            avg(stocks_history.price) AS avg_price
           FROM stocks_history
          GROUP BY stocks_history.stock_id) avg_price ON ((s.stock_id = avg_price.stock_id)))
  WHERE ((s.share_price IS NOT NULL) AND (s.osu_rank IS NOT NULL) AND (s.is_buyable IS NOT FALSE) AND (s.prevent_trades IS NOT TRUE));



