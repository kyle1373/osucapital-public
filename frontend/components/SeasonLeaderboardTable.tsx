import Link from "next/link";
import { LeaderboardUser } from "@lib/server/leaderboard";
import { useCurrentUser } from "@hooks/UserContext";
import { numberWithCommas } from "@lib/utils";

interface ActivityTableProps {
  users: LeaderboardUser[];
}

export default function SeasonLeaderboardTable(props: ActivityTableProps) {
  const { currentUser } = useCurrentUser();
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="align-middle inline-block min-w-full mt-4">
          <div className="shadow overflow-hidden rounded-lg">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="sm:px-6 py-3 px-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                  >
                    Trader Name
                  </th>
                  <th
                    scope="col"
                    className="sm:px-6 py-3 px-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                  >
                    Total Coins
                  </th>
                </tr>
              </thead>
              <tbody className=" bg-gray-800 divide-y divide-gray-600">
                {props.users.map((user, index) => {
                  const getColor = () => {
                    switch (index) {
                      case 0:
                        return "bg-yellow-800";
                      case 1:
                        return "bg-gray-600";
                      case 2:
                        return "bg-amber-900";
                      default:
                        return "bg-gray-800";
                    }
                  };
                  return (
                    <tr className={`${getColor()}`} key={index}>
                      <td
                        className={`sm:px-6 py-3 px-3 whitespace-nowrap sm:text-lg truncate text-xs font-semibold text-white ${
                          currentUser?.user_id === user.user_id
                            ? "text-yellow-300"
                            : "text-gray-50"
                        }`}
                      >
                        <Link
                          href={"/user/" + user.user_id}
                          className="hover:underline flex flex-row items-center truncate"
                        >
                          #{index + 1}
                          <img
                            src={user.osu_picture}
                            className="h-8 rounded mx-4"
                          />
                          <span
                            style={
                              {
                                "--glow-from-color": user.is_supporter
                                  ? user.color_flare
                                  : undefined,
                                "--glow-to-color": user.is_supporter
                                  ? user.color_flare
                                  : undefined,
                              } as any
                            }
                            className={user.is_supporter ? "glow" : ""}
                          >
                            {user.osu_name}
                          </span>
                        </Link>
                      </td>
                      <td className="sm:px-6 py-3 px-3 whitespace-nowrap sm:text-lg text-xs font-semibold text-gray-300">
                        {numberWithCommas(user.total_coins)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
