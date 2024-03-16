import { GetServerSidePropsContext } from "next";
import { COOKIES } from "@constants/constants";
import { User } from "@hooks/UserContext";
import { getUserBySession } from "./server/user";

export interface sessionProps {
    session: User;
}

export async function mustBeLoggedInServer(context: GetServerSidePropsContext): Promise<{ props: sessionProps } | {redirect}> {
  const userSession = context.req.cookies[COOKIES.userSession];
  const pulledUser = await getUserBySession(userSession)

  if (!pulledUser) {
    console.log("pulledUser is undefined");
    context.res.setHeader(
      "Set-Cookie",
      "userSession=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  // const pulledUser = {
  //   user_id: 54321,
  //   osu_name: "SuperFX",
  //   osu_picture: "https://a.ppy.sh/11461481?1702165558.jpeg",
  // };
  return {
    props: {
      session: pulledUser,
    },
  };
}
