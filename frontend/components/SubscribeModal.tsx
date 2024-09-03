import { shootFireworks } from "@lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/router";

const dropIn = {
  hidden: {
    y: "-100vh",
    opacity: 0,
  },
  visible: {
    y: "0",
    opacity: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 500,
    },
  },
  exit: {
    y: "100vh",
    opacity: 0,
  },
};

function Backdrop({ children, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}

export default function SubscribeModal({ handleClose }) {
  const router = useRouter();

  const onSubscribe = async () => {
    router.push("/api/stripe/subscribe");
  };
  const onRefresh = async () => {
    router.reload();
  };

  return (
    <Backdrop onClick={handleClose}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-700 rounded-md w-[600px] m-4 border border-neutral-600 px-4 py-3 relative text-white max-h-screen overflow-y-auto"
        variants={dropIn}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-0 right-2 text-white text-xl font-bold"
        >
          ×
        </button>
        <p className="font-bold text-xl md:pb-2 md:text-3xl">
          Support osu! capital 🙏
        </p>
        <p className="font-medium text-sm md:text-md pb-2 mt-2">
          If you choose to support osu! capital, you not only support the site's
          development, but you also get access to some extra features,
          including...
        </p>
        <ul className="pl-5 font-normal text-xs text-neutral-200 space-y-1 mb-4 md:mb-10">
          <li>- Realtime improvement updates for osu!'s top 100,000 players</li>
          <li>- See up to 100 recent trades for stocks and traders</li>
          <li>- Search for stocks that are online</li>
          <li>- View your country's leaderboards (coming soon!)</li>
          <li>- Choose your color flare shown throughout the website</li>
          <li>- Priority in suggesting new website improvements</li>
          <li>- Beta access to upcoming features</li>
          <li>- More to come!</li>
        </ul>
        <p className="font-medium text-xs md:text-md mt-3 text-center mb-2">
          We hope to continue making osu! capital the best it could be for everyone 😊
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="w-full bg-white rounded-sm text-black flex justify-center items-center py-2"
          onClick={onSubscribe}
        >
          <div className="text-2xl font-bold">$5</div>
          <div className="text-sm font-normal">/month</div>
        </motion.button>
        <div className="flex justify-center">
          <motion.div
            className="text-white font-normal text-xs cursor-pointer text-center py-2"
            whileHover={{ textDecoration: "underline", scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
          >
            Already a supporter? Reload the website
          </motion.div>
        </div>
      </motion.div>
    </Backdrop>
  );
}
