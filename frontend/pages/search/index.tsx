import React, { useContext, useEffect, useRef, useState } from "react";
import { mustBeLoggedInServer, sessionProps } from "@lib/authorization";
import { User, useCurrentUser } from "@hooks/UserContext";
import SidebarWrapper from "@components/SidebarWrapper";
import { ClipLoader } from "react-spinners";
import "chart.js/auto";
import { showMessage } from "@lib/showMessage/showMessage";
import { SearchResult } from "@lib/server/search";
import SearchCard from "@components/SearchCard";
import SEO from "@components/SEO";

interface SearchProps {
  session: User;
}

export default function Search(props: SearchProps) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  setCurrentUser(props.session);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStocksChecked, setIsStocksChecked] = useState(true);
  const [isTradersChecked, setIsTradersChecked] = useState(true);
  const [searchedData, setSearchedData] = useState<SearchResult[]>(undefined);

  useEffect(() => {
    // Restore search results if they exist in local storage
    const savedResults = localStorage.getItem("searchResults");
    if (savedResults) {
      setSearchedData(JSON.parse(savedResults));
      localStorage.removeItem("searchResults");
    }

    const savedQuery = localStorage.getItem("savedQuery");
    if (savedQuery) {
      setSearchTerm(JSON.parse(savedQuery));
      localStorage.removeItem("savedQuery");
    }
  }, []);

  // Save search results and scroll position before navigating away
  const handleNavigation = () => {
    localStorage.setItem("searchResults", JSON.stringify(searchedData));
    localStorage.setItem("savedQuery", JSON.stringify(searchTerm));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleStocksChange = () => {
    setIsStocksChecked(!isStocksChecked);
  };

  const handleTradersChange = () => {
    setIsTradersChecked(!isTradersChecked);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();

    if (!searchTerm || loading) return;
    setLoading(true);
    try {
      const searchResponse = await fetch(`/api/search?query=${searchTerm}`);
      const pulledSearchedData = await searchResponse.json();
      if (pulledSearchedData.error) {
        throw new Error(pulledSearchedData.error);
      }
      setSearchedData(pulledSearchedData);
    } catch (e) {
      showMessage("Error pulling stocks: " + e?.message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title={`Search`} />
      <SidebarWrapper>
        <main className="h-full w-full py-6 px-4">
          <div className="flex justify-center items-center">
            <form onSubmit={handleSearchSubmit} className="text-center">
              <div className="flex flex-wrap justify-center gap-4 items-end">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search..."
                  className="flex-auto rounded px-4 py-2 bg-neutral-500 placeholder:text-neutral-300 placeholder:font-medium text-white font-medium"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded bg-customPink-light hover:bg-customPink-dark font-medium transition duration-300"
                >
                  Submit
                </button>
              </div>
              <div className="mt-4">
                <label className="text-white">
                  <input
                    type="checkbox"
                    checked={isStocksChecked}
                    onChange={handleStocksChange}
                    className="mr-2"
                  />
                  Stocks
                </label>
                <label className="ml-8 text-white">
                  <input
                    type="checkbox"
                    checked={isTradersChecked}
                    onChange={handleTradersChange}
                    className="mr-2"
                  />
                  Traders
                </label>
              </div>
            </form>
          </div>
          <div className="flex justify-center items-center">
            {loading && (
              <ClipLoader color="#FFFFFF" size={30} className="mt-6" />
            )}
            <div className="flex justify-center mt-8">
              {searchedData?.length === 0 && !loading && (
                <h2 className="text-lg text-neutral-300">No results.</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 justify-center">
                {!loading &&
                  searchedData?.map((searched) => {
                    if (
                      (!isStocksChecked && searched.type === "Stock") ||
                      (!isTradersChecked && searched.type === "Trader")
                    ) {
                      return;
                    }
                    return (
                      <div key={searched.osu_id + searched.type}>
                        <SearchCard
                          searchInfo={searched}
                          onNavigate={handleNavigation}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </main>
      </SidebarWrapper>
    </>
  );
}

export const getServerSideProps = async (context) => {
  return mustBeLoggedInServer(context);
};
