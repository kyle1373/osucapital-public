import { NextApiResponse, NextApiRequest } from "next";
import { passport } from "@lib/osuPassport";
import { randomBytes } from "crypto";
import { COINS, COOKIES, LIMIT } from "@constants/constants";
import { kvReadWrite } from "@lib/kv";
import cookie from "cookie";
import supabaseAdmin from "@lib/supabase/supabase";

const handler = (_req: NextApiRequest, _res: NextApiResponse) => {
  const { provider } = _req.query;
  if (provider !== "osu") {
    return _res.status(404).send("Provider not allowed");
  }

  const cancelUrl = "/";
  const returnUrl = (_req?.query?.state as string) ?? "/dashboard";

  passport.authenticate(
    provider,
    {
      failureRedirect: cancelUrl,
      successRedirect: returnUrl,
    },
    async (...args: any[]) => {
      try {
        // Extract the second item from the array which contains the data
        const userData = args[1];

        if (!userData) {
          return _res.redirect(cancelUrl);
        }

        // Extracting the required fields
        const user_id = userData._json.id;
        const osu_name = userData._json.username;
        const osu_picture = userData._json.avatar_url;
        const osu_banner =
          userData._json.cover_url ||
          userData._json.cover?.custom_url ||
          userData._json.cover?.url;
        const osu_country_code = userData._json.country_code;

        // // fast whitelist implementation
        // const resp = await supabaseAdmin
        //   .from("whitelist")
        //   .select()
        //   .eq("id", user_id)
        //   .single();

        // if (resp.error) {
        //   return _res.redirect("/");
        // }

        // if (
        //   user_id !== 11461481 &&
        //   new Date().getTime() <= new Date(LIMIT.SeasonOpenDate).getTime()
        // ) {
        //   return _res.redirect("/");
        // }

        const osuCapitalUser = await supabaseAdmin
          .from("users")
          .select("osu_name, osu_picture, osu_banner, osu_country_code")
          .eq("user_id", user_id);

        if (osuCapitalUser.error) {
          throw new Error(osuCapitalUser.error.message);
        }

        if (osuCapitalUser.data.length === 0) {
          // We have a new user!
          const resp1 = await supabaseAdmin.from("users").insert([
            {
              user_id: user_id,
              osu_name: osu_name,
              osu_picture: osu_picture,
              osu_banner: osu_banner,
              coins_held: COINS.StartingCoins,
              osu_country_code: osu_country_code,
            },
          ]);

          if (resp1.error) {
            throw new Error(
              "Fatal error inserting user:" + resp1.error.message
            );
          }

          const resp2 = await supabaseAdmin.from("users_history").insert({
            user_id: user_id,
            total_coins: COINS.StartingCoins,
            net_worth: COINS.StartingCoins,
          });

          if (resp2.error) {
            console.log(
              "UNCAUGHT ERROR (still continuing):" + resp2.error.message
            );
          }
        } else {
          const { data, error } = await supabaseAdmin
            .from("users_history")
            .select()
            .eq("user_id", user_id);

          if (error) {
            throw new Error(error.message);
          }

          if (data.length === 0) {
            await supabaseAdmin.from("users_history").insert({
              user_id: user_id,
              total_coins: COINS.StartingCoins,
              net_worth: COINS.StartingCoins,
            });
          }

          if (
            osuCapitalUser.data[0].osu_name !== osu_name ||
            osuCapitalUser.data[0].osu_picture !== osu_picture ||
            osuCapitalUser.data[0].osu_banner !== osu_banner ||
            osuCapitalUser.data[0].osu_country_code !== osu_country_code
          ) {
            await supabaseAdmin
              .from("users")
              .update({
                osu_name: osu_name,
                osu_picture: osu_picture,
                osu_banner: osu_banner,
                osu_country_code: osu_country_code,
              })
              .eq("user_id", user_id);
          }
        }
        const sessionToken = await generateSecureSessionString();

        const oldUserSession = _req.cookies[COOKIES.userSession];

        if (oldUserSession) {
          await kvReadWrite.del(oldUserSession);
        }

        await kvReadWrite.set(sessionToken, {
          user_id: user_id,
          osu_name: osu_name,
          osu_picture: osu_picture,
        });

        _res.setHeader(
          "Set-Cookie",
          cookie.serialize(COOKIES.userSession, sessionToken, {
            httpOnly: process.env.NODE_ENV !== "development",
            secure: process.env.NODE_ENV !== "development",
            maxAge: 60 * 60 * 24 * 365,
            path: "/",
          })
        );

        return _res.redirect(
          (returnUrl as string) ? (returnUrl as string) : "/dashboard"
        );
      } catch (e) {
        _res.setHeader(
          "Set-Cookie",
          "userSession=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        );
        if (e instanceof Error) {
          // Send the error message
          _res.status(500).send(`Error: ${e.message}`);
        } else {
          // If it's not an Error instance, send the raw error
          _res.status(500).send("An unknown error occurred");
        }
      }
    }
  )(_req, _res, (..._args) => {
    return true;
  });
};

export default handler;

/**
 * Generates a secure random string for use as a session identifier.
 * @param length The length of the string to generate.
 * @returns A promise that resolves to a secure random string.
 */
function generateSecureSessionString(length: number = 64): Promise<string> {
  return new Promise((resolve, reject) => {
    randomBytes(length, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        // Convert the bytes to a hexadecimal string
        resolve(buffer.toString("hex"));
      }
    });
  });
}
