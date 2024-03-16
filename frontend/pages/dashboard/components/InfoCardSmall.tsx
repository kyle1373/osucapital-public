import React from "react";
import { AiFillInfoCircle } from "react-icons/ai";
import { Tooltip as ReactTooltip } from "react-tooltip";


interface InfoCardProps {
  label: string;
  info: string | number;
  changeInfo?: number;
  hoverInfo?: string;
}

export default function InfoCardSmall({
  label,
  info,
  changeInfo,
  hoverInfo,
}: InfoCardProps) {
  const getColor = () => {
    return changeInfo >= 0 ? "text-green-400" : "text-red-400";
  };

  return (
    <div className="relative flex flex-col justify-center items-center rounded-lg w-full bg-violet-900 p-2 h-full">
      {hoverInfo && (
        <div
          data-tooltip-id={label}
          className="absolute top-0 right-0 p-2"
        >
          <AiFillInfoCircle color={"#FFFFFF"} size={20} />
        </div>
      )}
      <h1 className="font-medium text-md text-white text-center">{label}</h1>
      <h1 className="font-semibold text-xl text-white text-center">
        {info}
        {changeInfo && changeInfo !== 0 ? (
          <span className={`${getColor()}`}>
            {` (${changeInfo >= 0 ? "+" : ""}${changeInfo})`}
          </span>
        ) : ""}
      </h1>
      <ReactTooltip
        id={label}
        className=" max-w-xs z-50 whitespace-pre-wrap break-words"
        place="top"
        content={hoverInfo}
      />
    </div>
  );
}
