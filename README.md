# osu-capital (public version)

This repo is a public, stale version of the actual codebase, which is made available so recruiters and hiring managers can see my work.  

![image](https://github.com/user-attachments/assets/3ecf7a6c-56c2-4001-91f1-dc014d4f7c0e)

![image](https://github.com/user-attachments/assets/80525b20-20b6-4098-a713-b9a7d0037934)


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
