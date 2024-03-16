import React from "react";
import { StockStats } from "lib/server/stock";
import { FaCoins } from "react-icons/fa";
import CustomGraph from "./CustomGraph";
import Link from "next/link";

interface StockCardProps {
  stockStats: StockStats;
}

const StockCard = (props: StockCardProps) => {
  const { stockStats } = props;

  const getColorForPercentage = (percentage) => {
    if (percentage < 0)
      return `rgb(255, ${100 + (155 * percentage) / 100}, 100)`; // More negative, more red
    return `rgb(${100 - (155 * percentage) / 100}, 255, 100)`; // More positive, more green
  };

  return (
    <Link href={"/stock/" + stockStats.stock_id}>
      <div className="bg-slate-600 hover:bg-slate-700 p-5 md:w-96 w-full rounded transition duration-300">
        <div className="flex flex-row">
          <img
            src={stockStats.osu_picture}
            className="rounded mr-5 h-14 w-14" // Adjust margin-right to ensure space between the image and text
          />
          <div className="truncate w-11/12">
            <h1 className="text-xl text-white font-bold truncate text-center">
              {stockStats.osu_name}
            </h1>
            <div className="truncate flex flex-row justify-center items-center text-base text-neutral-300">
              #{stockStats.osu_rank} &emsp; {stockStats.share_price}
              <FaCoins size={15} className="ml-2" />
            </div>
            <div className="truncate text-center text-white">
              <h2 className="text-lg font-medium truncate text-center">
                {stockStats.shares_owned + " Shares"}
                <span
                  style={{
                    color: getColorForPercentage(
                      stockStats.share_price_change_percentage
                    ),
                  }}
                >
                  &emsp; {stockStats.share_price_change_percentage + "%"}
                </span>
              </h2>
            </div>
          </div>
        </div>
        <div className="w-full h-12 mt-3">
          <CustomGraph
            title={"Stock price"}
            xAxisData={props.stockStats.share_price_history.map(
              (item) => item.date
            )}
            yAxisData={props.stockStats.share_price_history.map(
              (item) => item.price
            )}
            lineColor={"#0ab6ef"}
          />
        </div>
      </div>
    </Link>
  );
};

export default StockCard;
