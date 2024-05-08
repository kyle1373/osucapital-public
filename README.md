# NOTE: THIS IS A PUBLIC, UNUPDATED VERSION OF OSU! CAPITAL'S REPO
The purpose of open-sourcing this stale version of osu! capital is so recruiters and hiring managers can view my work. In any case if you're reading this, welcome!

osu! capital currently has 10,000 users who trade on the platform actively. 

Some social media URLs:
https://www.reddit.com/r/osugame/comments/19bhc8h/osu_capital_is_now_live/  
https://www.reddit.com/r/osugame/comments/18ubbqt/wip_currently_creating_an_osu_stock_market/  
https://www.reddit.com/r/osugame/comments/1971bep/the_osu_stock_market_will_open_in_3_days/  

I'm currently developing the site as you're reading this, but the progress is not being reflected on this repo. Regardless, feel free to poke around the repo in case you're interested! I'm leaving the original repo documentation down below:




# osu-capital

![image](https://github.com/kyle1373/osu-capital/assets/59634395/c4467abc-66f9-4f4d-9a1f-cc247b6d990c)

NOTE: This repo is changing frequently. Some documentation may be outdated. Contact `superfx64` (aka Kyle) on Discord if you see any.

The codebase for osu! capital: a stock market for osu! players. Invest into osu! players with unconvertible currency where their share price is calculated through player performance statistics.

## osu! capital architecture

osu! capital consists of 3 things:

[client] <---> [api] <---> [database]

The client and api consists of a Next.js web app, which is found in `frontend/`. The client pages are in `frontend/pages/`, and the api is in `frontend/pages/api/`. osu! capital uses PostgreSQL as its database, with Supabase as the interfacing client. In production, osu! capital connects to a separate production database. Everything is managed and deployed through kubernenetes and docker containers.

## Running osu! capital locally

`cd ./database`

Run the backend by following the instructions in `database/`. Make sure it's running properly before proceeding.

`cd ../database`

Then, run the frontend through following the instructions in `frontend/`. 
