import React, { useContext, useEffect, useRef, useState } from "react";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import "chart.js/auto";
import { GetServerSidePropsContext } from "next";
import {
  LeaderboardUser,
  getLatestLeaderboardUsers,
} from "@lib/server/leaderboard";
import LeaderboardTable from "@components/LeaderboardTable";
import { ClipLoader } from "react-spinners";
import { showMessage } from "@lib/showMessage/showMessage";
import { TEXT } from "@constants/constants";
import Link from "next/link";

interface LeaderboardProps {
  session: User;
  leaderboardUsers: LeaderboardUser[];
}

export default function Leaderboard(props: LeaderboardProps) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);
  const [loading, setLoading] = useState(false);

  const [showFriendRankings, setShowFriendRankings] = useState(false);

  const friendLeaderboardRef = useRef<LeaderboardUser[]>();
  const [leaderboardUsers, setLeaderboardUsers] = useState<LeaderboardUser[]>(
    props.leaderboardUsers
  );

  // Set state for friend ranking
  useEffect(() => {
    const showFriends = localStorage.getItem("showFriendRankings") === "true";
    if (showFriends) {
      localStorage.removeItem("showFriendRankings");
      setShowFriendRankings(true);
      if (!friendLeaderboardRef.current) {
        toggleFriendRankings();
      }
    }
  }, []);

  const toggleFriendRankings = async () => {
    if (!showFriendRankings && friendLeaderboardRef.current) {
      setShowFriendRankings(true);
      setLeaderboardUsers(friendLeaderboardRef.current);
      return;
    } else if (showFriendRankings) {
      setShowFriendRankings(false);
      setLeaderboardUsers(props.leaderboardUsers);
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/friend_leaderboard`);
      const responseJSON = await response.json();
      if (responseJSON.error) {
        throw new Error(responseJSON.error);
      }
      friendLeaderboardRef.current = responseJSON;
      setLeaderboardUsers(responseJSON);
      setShowFriendRankings(true);
    } catch (e) {
      showMessage(e?.message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarWrapper>
      <main className="h-full w-full overflow-y-auto px-4 py-8">
        <h3 className="text-2xl font-semibold leading-tight text-white text-center">
          Current Leaderboards
        </h3>
        <p className="text-md text-gray-300 font-semibold text-center">
          {TEXT.CurrentSeason}
        </p>

        <div className="md:text-base flex justify-between text-xs mt-4 sm:mx-4 items-center text-center">
          <Link
            href="/leaderboard/season"
            className="md:rounded-lg rounded font-semibold text-white bg-blue-800 duration-300 transition hover:bg-blue-900 px-5 py-2"
          >
            Previous seasons
          </Link>
          <label className="text-gray-300">
            <input
              type="checkbox"
              checked={showFriendRankings}
              onChange={toggleFriendRankings}
              className="mr-2"
            />
            Show Friends
          </label>
        </div>
        <div className="flex w-full justify-center">
          {loading && <ClipLoader color="#FFFFFF" size={30} className="mt-6" />}
        </div>

        {!loading && <LeaderboardTable users={leaderboardUsers} />}
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

  const pulledLeaderboardUsers = await getLatestLeaderboardUsers();

  const pulledUserWithStats: LeaderboardProps = {
    session: pulledUser.props.session,
    leaderboardUsers: pulledLeaderboardUsers,
  };

  return {
    props: pulledUserWithStats,
  };
};
