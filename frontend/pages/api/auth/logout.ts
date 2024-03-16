import { NextApiRequest, NextApiResponse } from "next";
import { kvReadWrite } from "@lib/kv";
import { COOKIES } from "@constants/constants";

const handler = async (_req: NextApiRequest, _res: NextApiResponse) => {

  const userSession = _req.cookies[COOKIES.userSession]

  if(userSession){
    await kvReadWrite.del(userSession)
  }
  _res.setHeader(
    "Set-Cookie",
    "userSession=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );
  return _res.redirect("/");
};

export default handler;
