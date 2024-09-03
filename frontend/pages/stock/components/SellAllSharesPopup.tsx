import { COINS, LIMIT } from "@constants/constants";
import { showMessage } from "@lib/showMessage/showMessage";
import {
  truncateToTwoDecimals,
  calculateBuyTax,
  tradesParam,
  calculateSellProfitAndTax,
  maxLimitCoins,
} from "@lib/utils";
import { Dispatch, MutableRefObject, SetStateAction, useState } from "react";
import { IoIosClose } from "react-icons/io";

export interface ModalPopupProps {
  stockName: string;
  isBanned: boolean;
  numShares: number;
  buyHistory: tradesParam[];
  onSubmit: () => void;
  onClose: () => void;
}

export default function SellAllSharesModalPopup(props: ModalPopupProps) {
  const handleOverlayClick = (e) => {
    if (e.target.id === "modal-overlay") {
      props.onClose();
    }
  };
  return (
    <div
      id="modal-overlay"
      onClick={(e) => handleOverlayClick(e)}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-10"
    >
      <div className="relative bg-white rounded-lg w-full max-w-xs mx-4 p-6">
        <button
          onClick={props.onClose}
          className="absolute top-0 right-0 mt-4 mr-4"
        >
          <IoIosClose size={30} />
        </button>
        <h1 className="text-lg font-medium leading-6 mr-8 text-gray-900 break-words mb-1">
          Sell all {props.stockName} shares
        </h1>
        <h3 className="text-xs font-normal mr-8 text-gray-800 break-words mb-6">
          {props.isBanned
            ? `Since this player is banned, your shares are currently worth 0 coins.
          You can sell your shares to get all of your coins back with a
          ${COINS.BannedSellPenalty * 100}% penalty. Do you want to sell all of
          your shares?`
            : `Since this player is inactive, your shares are currently worth 0 coins. Sell all your shares so you get all of your coins back?`}
        </h3>
        <div className="mt-4">
          <button
            onClick={props.onSubmit}
            type="button"
            className={`inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 text-base leading-6 font-medium text-white shadow-sm transition duration-300 ease-in-out ${"bg-red-500 hover:bg-red-600 focus:border-red-600"}`}
            disabled={props.numShares === 0}
          >
            {"Sell all shares"}
          </button>
        </div>
      </div>
    </div>
  );
}
