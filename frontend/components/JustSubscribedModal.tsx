import { shootFireworks } from "@lib/utils";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect } from "react";

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

export default function JustSubscribedModal({ handleClose }) {
  const router = useRouter();

  useEffect(() => {
    // Constructs a URL without the 'show_checkout_success' parameter
    const { stripe_session_id, ...otherQuery } = router.query;
    const newQuery = new URLSearchParams(otherQuery as any).toString();
    const newPath = `${router.pathname}${newQuery ? `?${newQuery}` : ""}`;

    // Replace the current entry in the history stack
    router.replace(newPath, undefined, { shallow: true });
    shootFireworks();
  }, []);

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
          Thank you for supporting 🤗
        </p>
        <p className="font-medium text-sm md:text-md pb-8">
          Enjoy all the cool new features you have access to!
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="w-full rounded-sm text-white flex justify-center items-center py-2 bg-customPink-light"
          onClick={handleClose}
        >
          <div className="text-2xl font-bold">Let's go!</div>
        </motion.button>
      </motion.div>
    </Backdrop>
  );
}
