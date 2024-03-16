CREATE INDEX idx_stocks_history_stock_id_date_desc ON public.stocks_history USING btree (stock_id, date DESC);

CREATE INDEX idx_trades_user_id_stock_id ON public.trades USING btree (user_id, stock_id);

CREATE INDEX idx_users_history_user_id ON public.users_history USING btree (user_id);

CREATE INDEX idx_users_stocks_user_id_stock_id ON public.users_stocks USING btree (user_id, stock_id);


