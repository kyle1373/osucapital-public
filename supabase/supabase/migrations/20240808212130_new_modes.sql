CREATE INDEX idx_trending_stocks_share_price_change_percentage ON public.trending_stocks USING btree (share_price_change_percentage DESC, stock_id);


