import { truncateToTwoDecimals } from "@lib/utils";
import { AiFillInfoCircle } from "react-icons/ai";
import { Tooltip as ReactTooltip } from "react-tooltip";

interface InfoCardProps {
  label: string;
  info: string | number;
  changeInfo?: number;
  hoverInfo?: string;
}

export default function InfoCardBig(props: InfoCardProps) {
  const getColor = () => {
    return props.changeInfo >= 0 ? "text-green-400" : "text-red-400";
  };

  return (
    <div className="relative flex flex-col justify-center items-center rounded-lg w-full bg-violet-900 p-4 h-full">
      {props.hoverInfo && (
        <div
          data-tooltip-id={props.label}
          className="absolute top-0 right-0 p-2"
        >
          <AiFillInfoCircle color={"#FFFFFF"} size={20} />
        </div>
      )}
      <h1 className="font-semibold text-normal text-white text-center">
        {props.label}
      </h1>
      {!props.changeInfo || props.changeInfo === 0 ? (
        <h1 className="font-semibold text-2xl text-white text-center">
          {props.info}
        </h1>
      ) : (
        <h1 className="font-semibold text-2xl text-white text-center">
          {props.info}{" "}
          <span className={`${getColor()}`}>
            {"(" +
              (props.changeInfo >= 0 ? "+" : "") +
              truncateToTwoDecimals(props.changeInfo) +
              ")"}
          </span>
        </h1>
      )}
      <ReactTooltip
        id={props.label}
        className=" max-w-xs z-10 whitespace-pre-wrap break-words"
        place="top"
        content={props.hoverInfo}
      />
    </div>
  );
}
