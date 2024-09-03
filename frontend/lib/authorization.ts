import { GetServerSidePropsContext } from "next";
import { COOKIES } from "@constants/constants";
import { User } from "@hooks/UserContext";
import { getUserBySession } from "./server/user";

export interface sessionProps {
  session: User;
}

export async function getUserByContext(
  context: GetServerSidePropsContext
): Promise<User> {
  const pulledUser = await getUserBySession(
    context.req.cookies[COOKIES.userSession]
  );
  return pulledUser;
}

export async function mustBeLoggedInServer(
  context: GetServerSidePropsContext
): Promise<{ props: sessionProps } | { redirect }> {
  const pulledUser = await getUserByContext(context);

  if (!pulledUser) {
    console.log("pulledUser is undefined");
    context.res.setHeader(
      "Set-Cookie",
      "userSession=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    const returnUrl = encodeURIComponent(context.resolvedUrl);
    return {
      redirect: {
        destination: `/api/auth/osu?return=${returnUrl}`,
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
