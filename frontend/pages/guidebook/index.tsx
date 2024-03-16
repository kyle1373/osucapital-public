import React from "react";
import { mustBeLoggedInServer } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import { COINS, LINKS } from "@constants/constants";
import Link from "next/link";

interface SearchProps {
  session: User;
}

export default function SettingsPage(props: SearchProps) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  const Title = (props) => {
    return (
      <h1 className="text-white font-bold text-4xl mb-10">{props.children}</h1>
    );
  };

  const Subtitle = (props) => {
    return (
      <h2 className="text-gray-100 font-semibold text-xl mb-3 mt-10">
        {props.children}
      </h2>
    );
  };

  const Description = (props) => {
    return (
      <h3 className=" text-gray-300 font-medium text-base mb-4">
        {props.children}
      </h3>
    );
  };

  return (
    <SidebarWrapper>
      <main className="h-full w-full py-6 px-4">
        <Title>Welcome, {props.session.osu_name}!</Title>
        <Subtitle>What is osu! capital?</Subtitle>
        <Description>
          osu! capital is a stock market where you invest fake currency into
          osu! players. Rank up by making good bets on who you think is
          underrated. When their osu! performance goes up, so does their stock
          price and your coin total. Everyone starts off with{" "}
          {COINS.StartingCoins} coins, and traders can increase their coin total
          by making good investments in players.
        </Description>
        <Subtitle>What is the stock price algorithm?</Subtitle>
        <Description>
          Stock Price = PP Score + Rank Improvement Score
        </Description>
        <Description>
          PP Score is a base value which is calculated based on the player's
          global PP. PP Score is scaled exponentially, meaning that this value
          increases at a greater rate the higher it is. For example, an increase
          in PP from 10,000 {"->"} 11,000 results in a higher increase in share
          price than 1,000 {"->"} 2,000. PP follows{" "}
          <Link
            className="text-blue-400 underline hover:text-blue-500 duration-300 transition"
            href="https://en.wikipedia.org/wiki/Benford%27s_law"
          >
            Benford's Law
          </Link>
          .
        </Description>
        <Description>
          Rank Improvement Score takes in the player's rank improvement over the
          last 30 days, with more recent days being weighted heavier than older
          days. The reason why we have this component is to make it so player
          stock prices increase more. We noticed that if we only incorporated PP
          Score, player stock prices would not increase as much. This Rank
          Improvement Score is used to make stocks more volatile.
        </Description>
        <Subtitle>
          How do you prevent traders investing into cheaters / multi accounts?
        </Subtitle>
        <Description>
          We have filters in place where players must meet certain criteria in
          order to be tradable. This includes players having a certain amount of
          recent playcount, an old enough account, and more. In cases where this
          somehow does not get detected, we reserve the right to revert a
          player's coin totals if they abuse investing into cheaters or multi
          accounts. As a side note: if you invest into a cheater / multi account
          and they get banned, your shares are automatically worth 0 coins.
          Don't invest into cheaters {":)"}
        </Description>
        <Subtitle>How are you preventing insider trading?</Subtitle>
        <Description>
          It's almost impossible to fully prevent insider trading, but we have
          developed tools to mitigate it and allow for fair competition. The
          osu! capital team has created a Discord bot which tracks the top 20k
          players PP updates in real time. Most traders who use osu! capital use
          these Discord bot channel in our server to get realtime updates on
          player improvements. You can{" "}
          <Link
            className="text-blue-400 underline hover:text-blue-500 duration-300 transition"
            href={LINKS.Discord}
          >
            join the Discord server here
          </Link>
          !
        </Description>
        <Subtitle>What are seasons?</Subtitle>
        <Description>
          osu! capital imposes a seasonal system. Since replicating capitalism
          in osu! {"isn't"} necessarily a perfect system, the algorithm will
          change based on feedback from players and traders. With each season,
          new features will also be added to the site. Leaderboards will be
          saved, and badges for the top-ranked traders will be on their profile.
        </Description>
        <Subtitle>How long will seasons / preseasons last?</Subtitle>
        <Description>
          Preseasons are used to iron out some issues, test new features out,
          and meant to last a few weeks. Real seasons are planned to last for
          months at a time.
        </Description>
        <Subtitle>
          What is the difference between net worth and total coins?
        </Subtitle>
        <Description>Total Coins = Coins Held + Coins Invested</Description>
        <Description>
          Net Worth = Coins Held + Coins Invested - Potential Profit Taxes
        </Description>
        <Description>
          Traders are ranked by their total coins, NOT their net worth. Net
          worth is only useful for the user to know how much purchasing power
          they have after selling all of their current stocks.
        </Description>
        <Subtitle>I still have some questions!</Subtitle>
        <Description>
          Feel free to{" "}
          <Link
            className="text-blue-400 underline hover:text-blue-500 duration-300 transition"
            href={LINKS.Discord}
          >
            join the Discord server and send a message
          </Link>
          ! The team checks the chat often and is used as our primary source of
          contact.
        </Description>
      </main>
    </SidebarWrapper>
  );
}

export const getServerSideProps = async (context) => {
  const pulledUser = (await mustBeLoggedInServer(context)) as any;

  if (pulledUser.redirect) {
    // Handles redirect
    return pulledUser;
  }

  return {
    props: {
      session: pulledUser.props.session,
    },
  };
};
