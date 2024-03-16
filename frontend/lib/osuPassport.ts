import passport from "passport";
import OsuStrategy from "passport-osu";
export { default as passport } from "passport";

passport.use(
  new OsuStrategy(
    {
      clientID: process.env.OSU_CLIENT_ID,
      clientSecret: process.env.OSU_CLIENT_SECRET,
      callbackURL: process.env.HOSTING_URL + "/api/auth/callback/osu",
    },
    function (accessToken, refreshToken, profile, done) {
      done(null, profile);
    }
  )
);