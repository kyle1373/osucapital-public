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
  type: "buy" | "sell";
  sharePrice: number;
  coinsHeld: number;
  numSharesBefore: number;
  numShares: number;
  numSharesRef: MutableRefObject<number>;
  setNumShares: Dispatch<SetStateAction<number>>;
  buyHistory: tradesParam[];
  onClose: () => void;
  onSubmit: () => void;
  doTradingBonus: boolean;
}

export default function ModalPopup(props: ModalPopupProps) {
  const [textField, setTextField] = useState<string>("" + props.numShares);
  const getNumShares = () => {
    return props.numShares ? props.numShares : 0;
  };

  const calculateProfitAndTax = () => {
    const val = calculateSellProfitAndTax(
      props.buyHistory,
      getNumShares(),
      props.sharePrice
    );

    val.profit = truncateToTwoDecimals(val.profit);
    val.tax = truncateToTwoDecimals(val.tax);

    return val;
  };

  const getTaxPercent = () => {
    const val = calculateProfitAndTax();
    if (val.profit === 0) {
      return 0;
    }
    return truncateToTwoDecimals((val.tax / (val.profit + val.tax)) * 100);
  };

  const potentialTradingBonus = props.doTradingBonus ? COINS.TradingBonus : 0;

  const handleOverlayClick = (e) => {
    if (e.target.id === "modal-overlay") {
      props.onClose();
    }
  };

  const isBuySellButtonDisabled = () => {
    if (props.type === "buy") {
      return (
        !props.numShares ||
        props.numShares * props.sharePrice +
          calculateBuyTax(props.numShares * props.sharePrice) -
          potentialTradingBonus >
          props.coinsHeld ||
        props.numShares === 0
      );
    } else {
      return (
        !props.numShares ||
        props.numShares > props.numSharesBefore ||
        props.numShares === 0
      );
    }
  };

  const isMaxBuySellButtonDisabled = () => {
    if (props.type === "buy") {
      return (
        truncateToTwoDecimals(
          (props.coinsHeld -
            calculateBuyTax(props.numShares * props.sharePrice) +
            potentialTradingBonus) /
            props.sharePrice
        ) <= 0
      );
    } else {
      return props.numSharesBefore === 0;
    }
  };

  const handleShareChange = (event) => {
    event.preventDefault();
    let value = event.target.value;

    // Updated regular expression to disallow 'e' or scientific notation
    // and allow only numbers with up to two decimal places
    const regex = /^\d*\.?\d{0,2}$/;

    // Check if the value matches the regular expression
    if (regex.test(value) && !value.includes("e")) {
      // If valid, parse the number and update state
      const numericValue = value ? parseFloat(value) : 0;
      const newShares = Math.max(0, truncateToTwoDecimals(numericValue));
      props.setNumShares(newShares);
      props.numSharesRef.current = newShares;
      setTextField(value);
    } else {
      // If not valid, reset to the last valid value
      setTextField("" + props.numShares);
    }
  };

  const doAllShares = () => {
    if (isMaxBuySellButtonDisabled()) {
      return;
    }

    let newShares = 0;
    if (props.type === "buy") {
      // Total funds available for purchasing, including trading bonus
      const totalAvailable = props.coinsHeld + potentialTradingBonus;

      // Adjust for the buy tax rate to find the actual spendable amount
      // Since tax = rate * cost, cost = totalAvailable / (1 + rate)
      const adjustedForTax = totalAvailable / (1 + COINS.BuyTax); // Assuming 2.5% tax rate

      // Calculate the number of shares that can be bought with the adjusted amount
      newShares = truncateToTwoDecimals(adjustedForTax / props.sharePrice);
    } else {
      newShares = props.numSharesBefore;
    }

    setTextField("" + newShares);
    props.setNumShares(newShares);
    props.numSharesRef.current = newShares;
  };

  return (
    <div
      id="modal-overlay"
      onClick={(e) => handleOverlayClick(e)}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40"
    >
      <div className="relative bg-white rounded-lg w-full max-w-xs mx-4 p-6">
        <button
          onClick={props.onClose}
          className="absolute top-0 right-0 mt-4 mr-4"
        >
          <IoIosClose size={30} />
        </button>
        <h3 className="text-lg font-medium leading-6 mr-8 text-gray-900 break-words mb-4">
          How many {props.stockName} shares do you want to{" "}
          {props.type === "buy" ? "buy?" : "sell?"}
        </h3>
        <div className="mt-2">
          <div className="mt-1 flex flex-row">
            <input
              type="number"
              id="share-amount"
              value={textField}
              onChange={handleShareChange}
              className="block w-full pl-3 pr-4 py-2 text-base leading-6 border-gray-300 bg-gray-100 rounded-md border-2"
              placeholder="0.00"
              min="0.00"
              step="0.01"
              aria-describedby="share-price"
            />
            <button
              onClick={doAllShares}
              type="button"
              className="bg-gray-600 hover:bg-gray-700 rounded py-2 px-3 ml-2 text-white transition duration-300 ease-in-out"
            >
              Max
            </button>
          </div>

          <p id="share-price" className="mt-1 text-sm text-gray-500">
            Shares (currently valued at{" "}
            {(getNumShares() * props.sharePrice).toFixed(2)} coins)
          </p>
        </div>
        <div className="mt-4">
          {props.type === "buy"
            ? props.coinsHeld -
                getNumShares() * props.sharePrice -
                calculateBuyTax(props.numShares * props.sharePrice) +
                potentialTradingBonus >=
                0 && (
                <p className="text-sm text-gray-900">
                  You will have{" "}
                  <span className="font-semibold">
                    {(
                      props.coinsHeld -
                      getNumShares() * props.sharePrice -
                      calculateBuyTax(props.numShares * props.sharePrice) +
                      potentialTradingBonus
                    ).toFixed(2)}{" "}
                    coins
                  </span>{" "}
                  left
                </p>
              )
            : props.numSharesBefore - getNumShares() >= 0 && (
                <p className="text-sm text-gray-900">
                  You will have{" "}
                  <span className="font-semibold">
                    {(props.numSharesBefore - getNumShares()).toFixed(2)} shares
                  </span>{" "}
                  with a total of{" "}
                  <span className="font-semibold">
                    {(
                      maxLimitCoins(props.coinsHeld +
                      getNumShares() * props.sharePrice -
                      calculateProfitAndTax().tax)
                    ).toFixed(2)}{" "}
                    coins
                  </span>{" "}
                  (profit of {calculateProfitAndTax().profit.toFixed(2)} after a{" "}
                  {getTaxPercent().toFixed(2)}% tax)
                </p>
              )}

          {props.type === "buy" && (
            <p className="text-sm text-gray-400">
              <span className="font-semibold">{COINS.BuyTax * 100}% tax</span>{" "}
              included
            </p>
          )}
          {props.type === "buy" && props.doTradingBonus && (
            <p className="text-sm text-green-600">
              <span className="font-semibold">+{COINS.TradingBonus} coin</span>{" "}
              trading bonus
            </p>
          )}
        </div>
        <div className="mt-2">
          <button
            onClick={props.onSubmit}
            type="button"
            className={`inline-flex justify-center w-full rounded-md border border-transparent px-4 py-2 text-base leading-6 font-medium text-white shadow-sm transition duration-300 ease-in-out ${
              props.type === "buy"
                ? "bg-green-500 hover:bg-green-600 focus:border-green-600"
                : "bg-red-500 hover:bg-red-600 focus:border-red-600"
            } ${
              isBuySellButtonDisabled() ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isBuySellButtonDisabled()}
          >
            {props.type === "buy" ? "Buy" : "Sell"}
          </button>
        </div>
      </div>
    </div>
  );
}
