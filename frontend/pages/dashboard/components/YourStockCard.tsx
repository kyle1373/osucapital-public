import React from "react";
import { StockStats } from "lib/server/stock";
import { FaCoins } from "react-icons/fa";
import { RiHandCoinFill } from "react-icons/ri";
import Link from "next/link";
import CustomGraph from "@components/CustomGraph";

interface StockCardProps {
  stockStats: StockStats;
}

const YourStockCard = (props: StockCardProps) => {
  const { stockStats } = props;

  const getColorForPercentage = (percentage) => {
    if (percentage < 0)
      return `rgb(255, ${100 + (155 * percentage) / 100}, 100)`; // More negative, more red
    return `rgb(${100 - (155 * percentage) / 100}, 255, 100)`; // More positive, more green
  };

  const totalCoinsInvested = stockStats?.shares_owned * stockStats?.share_price;

  return (
    <Link href={"/stock/" + stockStats?.stock_id}>
      <div className="bg-violet-900 hover:bg-violet-950 p-5 w-full rounded-lg transition duration-300 overflow-clip">
        <div className="flex flex-row items-start"> {/* Adjusted for alignment */}
          <img
            src={stockStats?.osu_picture}
            className="rounded-full mr-5 h-16 w-16"
          />
          <div className="flex flex-col justify-start"> {/* Adjusted for vertical alignment */}
            <h1 className="text-xl text-white font-semibold truncate">
              {stockStats?.osu_name}
              <span className="font-normal text-lg"> &thinsp; (#{stockStats?.osu_rank})</span>
            </h1>
            <div className="flex flex-row justify-start items-center text-base text-white">
              {stockStats?.share_price}<FaCoins size={12} className="ml-2"/>
              <span
                style={{
                  color: getColorForPercentage(
                    stockStats?.share_price_change_percentage
                  ),
                }}
              >
                &emsp; {stockStats?.share_price_change_percentage + "%"}
              </span>
            </div>
            <div className="flex flex-row justify-start items-center text-sm font-medium text-white">
            {stockStats?.shares_owned} {stockStats?.shares_owned === 1 ? "Share" : "Shares"} = {totalCoinsInvested.toFixed(2)} <RiHandCoinFill size={12} className="ml-2"/>
            </div>
          </div>
        </div>

        <div className="w-full h-20 mt-1">
          <CustomGraph
            title={"Stock price"}
            xAxisData={props.stockStats?.share_price_history?.map(
              (item) => item.date
            )}
            yAxisData={props.stockStats?.share_price_history?.map(
              (item) => item.price
            )}
            lineColor={"#9d5bf4"}
          />
        </div>
      </div>
    </Link>
  );
};

export default YourStockCard;
