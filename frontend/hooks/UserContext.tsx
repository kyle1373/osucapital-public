import SubscribeModal from "@components/SubscribeModal";
import styled from "@emotion/styled";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { ClipLoader } from "react-spinners";
import { AnimatePresence } from "framer-motion";
import JustSubscribedModal from "@components/JustSubscribedModal";
import { useRouter } from "next/router";

export interface User {
  user_id: number;
  osu_name: string;
  osu_picture: string;
}
// Define the shape of the context data
interface UserContextProps {
  currentUser: User;
  showLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  openSubscribeModal: () => void;
  openJustSubscribedModal: () => void;
  closeSubscribeModal: () => void;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

// Styled component for the overlay
const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

// Create a provider component
export const UserProvider = ({ children }: UserProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User>();
  const [loading, showLoading] = useState<boolean>(false);
  const [subscribeModal, showSubscribeModal] = useState<boolean>(false);
  const [justSubscribedModal, showJustSubscribedModal] =
    useState<boolean>(false);

  const openSubscribeModal = () => showSubscribeModal(true);
  const closeSubscribeModal = () => showSubscribeModal(false);

  const openJustSubscribedModal = () => showJustSubscribedModal(true);
  const closeJustSubscribedModal = () => showJustSubscribedModal(false);

  const { query } = useRouter();

  useEffect(() => {
    if (query.stripe_session_id) {
      openJustSubscribedModal();
    }
  }, [query.stripe_session_id]);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        showLoading,
        setCurrentUser,
        openSubscribeModal,
        openJustSubscribedModal,
        closeSubscribeModal,
      }}
    >
      {loading && (
        <LoadingOverlay>
          <ClipLoader color="#FFFFFF" size={100} />
        </LoadingOverlay>
      )}
      <AnimatePresence initial={false} mode="wait" onExitComplete={() => null}>
        {subscribeModal && <SubscribeModal handleClose={closeSubscribeModal} />}
      </AnimatePresence>
      <AnimatePresence initial={false} mode="wait" onExitComplete={() => null}>
        {justSubscribedModal && (
          <JustSubscribedModal handleClose={closeJustSubscribedModal} />
        )}
      </AnimatePresence>
      {children}
    </UserContext.Provider>
  );
};

// Create a custom hook to use the osu user context
export const useCurrentUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useOsuUser must be used within a OsuUserProvider");
  }
  return context;
};
