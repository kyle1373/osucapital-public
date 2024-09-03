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
  getSeason,
  getSeasonLeaderboards,
} from "@lib/server/leaderboard";
import LeaderboardTable from "@components/LeaderboardTable";
import { ClipLoader } from "react-spinners";
import { showMessage } from "@lib/showMessage/showMessage";
import { TEXT } from "@constants/constants";
import Link from "next/link";
import { strictParseInt } from "@lib/utils";
import SeasonLeaderboardTable from "@components/SeasonLeaderboardTable";
import SEO from "@components/SEO";

interface SeasonsProps {
  session: User;
  season: Season;
  seasonUsers: LeaderboardUser[];
}

export default function Leaderboard(props: SeasonsProps) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  function formatDateRange(startDateStr, endDateStr) {
    // Helper function to get the ordinal suffix of a day
    function getOrdinalSuffix(day) {
      if (day > 3 && day < 21) return "th"; // covers 4th to 20th
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    }

    // Parse the input datetime strings
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Array of month names
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Extract parts of the start date
    const startMonth = months[startDate.getMonth()];
    const startDay = startDate.getDate();
    const startYear = startDate.getFullYear();

    // Extract parts of the end date
    const endMonth = months[endDate.getMonth()];
    const endDay = endDate.getDate();
    const endYear = endDate.getFullYear();

    // Format the dates with the ordinal suffixes
    const formattedStartDate = `${startMonth} ${startDay}${getOrdinalSuffix(
      startDay
    )}, ${startYear}`;
    const formattedEndDate = `${endMonth} ${endDay}${getOrdinalSuffix(
      endDay
    )}, ${endYear}`;

    // Return the formatted date range
    return `${formattedStartDate} - ${formattedEndDate}`;
  }

  if (!props.season || !props.seasonUsers) {
    return (
      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-8">
          <h3 className="text-2xl font-semibold leading-tight text-white text-center">
            Sorry! This season leaderboard does not exist.
          </h3>
        </main>
      </SidebarWrapper>
    );
  }

  return (
    <>
      <SEO title={`${props.season.season_name} - Leaderboards`} />
      <SidebarWrapper>
        <main className="h-full w-full overflow-y-auto px-4 py-8">
          <h3 className="text-2xl font-semibold leading-tight text-white text-center">
            {props.season.season_name + " Leaderboards"}
          </h3>
          <p className="text-md text-gray-300 font-semibold text-center mb-4">
            {formatDateRange(props.season.start_date, props.season.end_date)}
          </p>

          <SeasonLeaderboardTable users={props.seasonUsers} />
        </main>
      </SidebarWrapper>
    </>
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

  const { params } = context;

  const seasonId = strictParseInt(params.season_id as string);

  if (isNaN(seasonId)) {
    return {
      props: {
        session: pulledUser.props.session,
        season: null,
        seasonUsers: null,
      },
    };
  }

  try {
    const season = await getSeason(seasonId);

    const seasonUsers = await getSeasonLeaderboards(seasonId);

    const pulledInfo: SeasonsProps = {
      session: pulledUser.props.session,
      season: season,
      seasonUsers: seasonUsers,
    };

    return {
      props: pulledInfo,
    };
  } catch (e) {
    console.warn(e?.message);
    return {
      props: {
        session: pulledUser.props.session,
        season: null,
        seasonUsers: null,
      },
    };
  }
};
