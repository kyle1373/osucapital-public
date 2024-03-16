import Link from "next/link";
import {
  FaTachometerAlt,
  FaSearch,
  FaTrophy,
  FaUser,
  FaSignOutAlt,
  FaDiscord,
  FaCog,
  FaSeedling,
  FaBook,
} from "react-icons/fa";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

import { useState, useEffect, useRef } from "react";
import { useCurrentUser } from "hooks/UserContext";
import { LINKS } from "@constants/constants";

const SidebarWrapper = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<any>();

  const { currentUser } = useCurrentUser();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuItems = (
    <>
      <LinkItem
        icon={<FaTachometerAlt color={"#FFFFFF"} />}
        text="Dashboard"
        href="/dashboard"
        newTab={undefined}
        disabled={undefined}
      />
      <LinkItem
        icon={<FaSearch color={"#FFFFFF"} />}
        text="Search"
        href="/search"
        newTab={undefined}
        disabled={undefined}
      />
      <LinkItem
        icon={<FaTrophy color={"#FFFFFF"} />}
        text="Leaderboard"
        href="/leaderboard"
        newTab={undefined}
        disabled={undefined}
      />
      <LinkItem
        icon={<FaUser color={"#FFFFFF"} />}
        text="Profile"
        href={"/user/" + currentUser?.user_id}
        disabled={!currentUser?.user_id}
        newTab={undefined}
      />
      <LinkItem
        icon={<FaDiscord color={"#FFFFFF"} />}
        text="Discord"
        href={LINKS.Discord}
        newTab={true}
        disabled={undefined}
      />
      <LinkItem
        icon={<FaBook color={"#FFFFFF"} />}
        text="Guidebook"
        href="/guidebook"
        newTab={undefined}
        disabled={undefined}
      />
      <LinkItem
        icon={<FaCog color={"#FFFFFF"} />}
        text="Settings"
        href="/settings"
        newTab={undefined}
        disabled={undefined}
      />
    </>
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  return (
    <div className="flex flex-row">
      <div className="hidden md:flex fixed top-0 left-0 w-48 h-full bg-customPink-light overflow-y-auto text-center flex flex-col justify-between z-30">
        <div className="overflow-y-auto max-h-screen">{menuItems}</div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 bg-customPink-light h-14 px-4 flex justify-between items-center z-30">
        <Link href="/dashboard">
          <h6 className="text-xl font-medium text-white">osu! capital</h6>
        </Link>
        {isMenuOpen ? (
          <IoIosArrowUp className="text-white" size={25} onClick={toggleMenu} />
        ) : (
          <IoIosArrowDown
            className="text-white"
            size={25}
            onClick={toggleMenu}
          />
        )}
      </div>

      {isMenuOpen && (
        <div
          ref={menuRef}
          className="md:hidden fixed top-6 left-0 right-0 bg-customPink-light p-4 transition-all duration-500 ease-in-out z-20 overflow-y-auto max-h-screen"
        >
          {menuItems}
          <div className="h-5" />
        </div>
      )}

      <div
        className={`md:hidden fixed inset-0 transition-opacity duration-500 ease-in-out ${
          isMenuOpen ? "bg-black opacity-50" : "opacity-0 pointer-events-none"
        } z-10`}
      ></div>

      <div className="md:ml-48 md:mt-0 mt-14 w-full relative overflow-x-auto">
        {children}
      </div>
    </div>
  );
};

const LinkItem = ({ icon, text, href, newTab, disabled }) => (
  <Link
    href={href}
    target={newTab ? "_blank" : undefined}
    rel={newTab ? "noopener noreferrer" : ""}
    className={`flex items-center justify-center mt-6 ${
      disabled ? "pointer-events-none" : ""
    }`}
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : undefined}
  >
    {icon}
    <h6 className="ml-2 text-xl font-medium text-white hover:underline">
      {text}
    </h6>
  </Link>
);

export default SidebarWrapper;
