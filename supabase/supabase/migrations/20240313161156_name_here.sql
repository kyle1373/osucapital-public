CREATE INDEX idx_stocks_prevent_trades ON public.stocks USING btree (prevent_trades);

CREATE INDEX idx_stocks_is_buyable ON public.stocks USING btree (is_buyable);

CREATE INDEX idx_stocks_is_sellable ON public.stocks USING btree (is_sellable);


