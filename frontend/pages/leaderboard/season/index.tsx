import React, { useContext, useEffect, useRef, useState } from "react";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import "chart.js/auto";
import { GetServerSidePropsContext } from "next";
import {
  LeaderboardUser,
  Season,
  getAllSeasons,
  getLatestLeaderboardUsers,
} from "@lib/server/leaderboard";
import LeaderboardTable from "@components/LeaderboardTable";
import { ClipLoader } from "react-spinners";
import { showMessage } from "@lib/showMessage/showMessage";
import { TEXT } from "@constants/constants";
import Link from "next/link";

interface SeasonsProps {
  session: User;
  seasons: Season[];
}

export default function Leaderboard(props: SeasonsProps) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  return (
    <SidebarWrapper>
      <main className="h-full w-full overflow-y-auto px-4 py-8">
        <h3 className="text-2xl font-semibold leading-tight text-white text-center mb-4">
          Season Leaderboards
        </h3>

        <div className="flex flex-wrap gap-4 items-center justify-center">
          {props.seasons.map((season) => {
            return (
              <Link
                key={season.season_id}
                href={"/leaderboard/season/" + season.season_id}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")} // Reducing opacity on hover
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")} // Returning to full opacity when not hovered
                className="md:rounded-lg rounded font-semibold text-white text-center items-center justify-center text-lg duration-300 transition px-6 py-2"
                style={{ backgroundColor: season.color_code }}
              >
                {season.season_name}
              </Link>
            );
          })}
        </div>
      </main>
    </SidebarWrapper>
  );
}

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    // Handles redirect
    return pulledUser;
  }

  const pulledSeasons = await getAllSeasons();

  const pulledInfo: SeasonsProps = {
    session: pulledUser.props.session,
    seasons: pulledSeasons,
  };

  return {
    props: pulledInfo,
  };
};
