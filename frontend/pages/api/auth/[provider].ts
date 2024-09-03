import { NextApiResponse, NextApiRequest } from "next";
import { passport } from "@lib/osuPassport";
import { COOKIES } from "@constants/constants";

const handler = async (_req: NextApiRequest, _res: NextApiResponse) => {
  const provider = _req?.query?.provider as string;
  const returnUrl = (_req?.query?.return as string) ?? "/dashboard";
  if (provider !== "osu") {
    return _res.status(404).send("Provider not allowed");
  }

  if (_req.cookies[COOKIES.userSession]) {
    return _res.redirect(returnUrl);
  }

  passport.authenticate(provider, { state: returnUrl } as any)(_req, _res);
};

export default handler;
