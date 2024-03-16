import { formatDistanceToNow } from "date-fns";
import { UserTradeInfo } from "@lib/server/user";
import Link from "next/link";
import { StockTradeInfo } from "@lib/server/stock";
import { useEffect, useState } from "react";

interface ActivityTableProps {
  trades: UserTradeInfo[] | StockTradeInfo[];
  type: "UserTradeInfo" | "StockTradeInfo";
}

const DateComponent = ({ timestamp }) => {
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    const updateFormattedDate = () => {
      setFormattedDate(
        formatDistanceToNow(new Date(timestamp), { addSuffix: true })
      );
    };

    updateFormattedDate(); // Initial update
    const interval = setInterval(updateFormattedDate, 1000); // Update every second

    return () => clearInterval(interval);
  }, [timestamp]);

  return <span>{formattedDate}</span>;
};
export default function ActivityTable(props: ActivityTableProps) {
  const getPrimaryColor = () => {
    if (props.type === "StockTradeInfo") {
      return "bg-blue-900 bg-opacity-40";
    }
    return "bg-orange-900 bg-opacity-40";
  };

  const getSecondaryColor = () => {
    if (props.type === "StockTradeInfo") {
      return "bg-blue-950 bg-opacity-40";
    }
    return "bg-orange-950 bg-opacity-40";
  };

  const getDivideLine = () => {
    if (props.type === "StockTradeInfo") {
      return "divide-blue-400 divide-opacity-40";
    }
    return "divide-orange-400 divide-opacity-40";
  };
  return (
    <div className="overflow-x-auto">
      <div className="align-middle inline-block min-w-full">
        <div className="shadow overflow-hidden rounded-lg">
          <table className={`min-w-full divide-y ${getDivideLine()}`}>
            <thead className={`${getPrimaryColor()}`}>
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                >
                  {props.type === "UserTradeInfo"
                    ? "Stock Name"
                    : "Trader Name"}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                >
                  Shares
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                >
                  Coins
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-200  tracking-wider"
                >
                  Profit
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-200 tracking-wider"
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody
              className={`${getSecondaryColor()} divide-y  ${getDivideLine()}`}
            >
              {props.trades.map((trade, index) => {
                const getTypeColor = (trade) => {
                  return trade.type === "buy"
                    ? "text-blue-300"
                    : "text-orange-300";
                };

                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap sm:text-sm text-xs font-medium text-gray-50">
                      {props.type === "UserTradeInfo" ? (
                        <Link
                          href={"/stock/" + trade.stock_id}
                          className="hover:underline"
                        >
                          {trade.stock_name}
                        </Link>
                      ) : (
                        <Link
                          href={"/user/" + trade.user_id}
                          className="hover:underline"
                        >
                          {trade.osu_name}
                        </Link>
                      )}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap sm:text-sm text-xs ${
                        trade.type === "buy"
                          ? "text-blue-300"
                          : "text-orange-300"
                      }`}
                    >
                      {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap sm:text-sm text-xs text-gray-300">
                      {trade.num_shares}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap sm:text-sm text-xs text-gray-300">
                      {trade.coins_with_taxes}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap sm:text-sm text-xs ${
                        !trade.profit || trade.profit === 0
                          ? "text-gray-300"
                          : trade.profit > 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {trade.profit ?? "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap sm:text-sm text-xs text-gray-300">
                      <DateComponent timestamp={trade.timestamp} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
