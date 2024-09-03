create type "public"."trade_type" as enum ('buy', 'sell');

create table "public"."friend" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone not null default now(),
    "user_id" bigint not null,
    "stock_id" bigint not null
);


alter table "public"."friend" enable row level security;

create table "public"."stocks" (
    "stock_id" bigint not null,
    "last_updated" timestamp with time zone not null default now(),
    "share_price" double precision not null,
    "osu_name" character varying not null,
    "osu_picture" text not null,
    "osu_rank" integer not null,
    "osu_pp" integer not null,
    "osu_rank_history" integer[] not null
);


alter table "public"."stocks" enable row level security;

create table "public"."stocks_history" (
    "id" bigint generated by default as identity not null,
    "date" timestamp with time zone not null default now(),
    "stock_id" bigint not null,
    "price" double precision not null
);


alter table "public"."stocks_history" enable row level security;

create table "public"."trades" (
    "id" bigint generated by default as identity not null,
    "timestamp" timestamp with time zone not null default now(),
    "user_id" bigint not null,
    "stock_id" bigint not null,
    "type" trade_type not null,
    "shares" double precision not null,
    "coins" double precision not null
);


alter table "public"."trades" enable row level security;

create table "public"."users" (
    "user_id" bigint not null,
    "joined" timestamp with time zone not null default now(),
    "osu_name" character varying not null,
    "osu_picture" text not null,
    "coins_held" double precision not null
);


alter table "public"."users" enable row level security;

create table "public"."users_history" (
    "id" bigint generated by default as identity not null,
    "date" timestamp with time zone not null default now(),
    "user_id" bigint not null,
    "total_coins" double precision not null
);


alter table "public"."users_history" enable row level security;

create table "public"."users_stock" (
    "id" bigint generated by default as identity not null,
    "last_updated" timestamp with time zone not null default now(),
    "user_id" bigint not null,
    "stock_id" bigint not null,
    "num_shares" double precision not null
);


alter table "public"."users_stock" enable row level security;

CREATE UNIQUE INDEX friend_pkey ON public.friend USING btree (id);

CREATE UNIQUE INDEX stocks_history_pkey ON public.stocks_history USING btree (id);

CREATE UNIQUE INDEX stocks_pkey ON public.stocks USING btree (stock_id);

CREATE UNIQUE INDEX stocks_stock_id_key ON public.stocks USING btree (stock_id);

CREATE UNIQUE INDEX trades_id_key ON public.trades USING btree (id);

CREATE UNIQUE INDEX trades_pkey ON public.trades USING btree (id);

CREATE UNIQUE INDEX users_history_pkey ON public.users_history USING btree (id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (user_id);

CREATE UNIQUE INDEX users_stock_pkey ON public.users_stock USING btree (id);

CREATE UNIQUE INDEX users_user_id_key ON public.users USING btree (user_id);

alter table "public"."friend" add constraint "friend_pkey" PRIMARY KEY using index "friend_pkey";

alter table "public"."stocks" add constraint "stocks_pkey" PRIMARY KEY using index "stocks_pkey";

alter table "public"."stocks_history" add constraint "stocks_history_pkey" PRIMARY KEY using index "stocks_history_pkey";

alter table "public"."trades" add constraint "trades_pkey" PRIMARY KEY using index "trades_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."users_history" add constraint "users_history_pkey" PRIMARY KEY using index "users_history_pkey";

alter table "public"."users_stock" add constraint "users_stock_pkey" PRIMARY KEY using index "users_stock_pkey";

alter table "public"."friend" add constraint "friend_stock_id_fkey" FOREIGN KEY (stock_id) REFERENCES stocks(stock_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."friend" validate constraint "friend_stock_id_fkey";

alter table "public"."friend" add constraint "friend_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."friend" validate constraint "friend_user_id_fkey";

alter table "public"."stocks" add constraint "stocks_stock_id_key" UNIQUE using index "stocks_stock_id_key";

alter table "public"."stocks_history" add constraint "stocks_history_stock_id_fkey" FOREIGN KEY (stock_id) REFERENCES stocks(stock_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."stocks_history" validate constraint "stocks_history_stock_id_fkey";

alter table "public"."trades" add constraint "trades_id_key" UNIQUE using index "trades_id_key";

alter table "public"."trades" add constraint "trades_stock_id_fkey" FOREIGN KEY (stock_id) REFERENCES stocks(stock_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."trades" validate constraint "trades_stock_id_fkey";

alter table "public"."trades" add constraint "trades_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."trades" validate constraint "trades_user_id_fkey";

alter table "public"."users" add constraint "users_user_id_key" UNIQUE using index "users_user_id_key";

alter table "public"."users_history" add constraint "users_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_history" validate constraint "users_history_user_id_fkey";

alter table "public"."users_stock" add constraint "users_stock_stock_id_fkey" FOREIGN KEY (stock_id) REFERENCES stocks(stock_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_stock" validate constraint "users_stock_stock_id_fkey";

alter table "public"."users_stock" add constraint "users_stock_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."users_stock" validate constraint "users_stock_user_id_fkey";

