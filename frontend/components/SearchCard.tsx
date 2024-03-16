import React from "react";
import { SearchResult } from "@lib/server/search";
import Link from "next/link";

interface SearchCardProps {
  searchInfo: SearchResult;
  onNavigate?: () => void;
}

const SearchCard = (props: SearchCardProps) => {
  const { searchInfo, onNavigate } = props; // Add onNavigate here

  const bgColor =
    searchInfo.type === "Stock"
      ? "bg-slate-600 hover:bg-slate-700"
      : "bg-orange-800 hover:bg-orange-900";
  const link =
    searchInfo.type === "Stock"
      ? "/stock/" + searchInfo.osu_id
      : "/user/" + searchInfo.osu_id;

  return (
    <Link href={link}>
      <div
        className={`${bgColor} p-5 md:w-96 w-full rounded-lg transition duration-300`}
        onClick={() => {
          if (onNavigate) {
            onNavigate();
          }
        }}
      >
        <div className="flex flex-row">
          <img
            src={searchInfo.osu_picture}
            alt={searchInfo.osu_name}
            className="rounded mr-5 h-14 w-14"
          />
          <div className="truncate w-full">
            <h1 className="text-xl text-white font-bold truncate text-center">
              {searchInfo.osu_name}
            </h1>
            <div className="w-full text-5xl sm:text-6xl mt-4 text-opacity-40 text-white font-black truncate text-center">
              {searchInfo.type}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default SearchCard;
