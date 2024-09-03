import { TEXT } from "@constants/constants";
import Link from "next/link";
import React, { useState, useEffect } from "react";

type CountdownTimerProps = {
  targetDate: string;
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft: { [key: string]: number } = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<{ [key: string]: number }>(
    calculateTimeLeft()
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const formatTime = (time: number): string => {
    return time.toString().padStart(2, "0");
  };

  return (
    <div className="">
      {Object.keys(timeLeft).length ? (
        <div>
          {/* <h1 className="font-semibold text-2xl mb-2 text-white">{TEXT.CurrentSeason + " starts soon!"}</h1> */}
          <span className="text-4xl font-semibold text-white">
            {formatTime(timeLeft.days)}:{formatTime(timeLeft.hours)}:
            {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
          </span>
        </div>
      ) : (
        <Link href="/api/auth/osu" legacyBehavior>
          <a className="flex bg-customPink-light hover:bg-customPink-dark transition rounded-lg shadow-lg duration-300 w-72 py-4 justify-center">
            <span className="text-3xl text-center font-semibold text-white">
              Enter
            </span>
          </a>
        </Link>
      )}
    </div>
  );

  // return (
  //   <div className="mt-12">
  //     <h1 className="font-semibold text-2xl mb-2 text-white">
  //       {"The next season is currently in development"}
  //     </h1>
  //   </div>
  // );
};

export default CountdownTimer;
