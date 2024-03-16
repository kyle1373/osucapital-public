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
