import { useSelector, useDispatch } from "react-redux";
import {
  cachePage,
  clearCache,
  clickBrowserButtons,
  notClickBrowserButtons,
  deleteEntireCache,
} from "@/redux/store"; // Import deleteEntireCache action
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

export function usePageCache() {
  const browser = useSelector((state) => (state as any).browser);
  const cache = useSelector((state) => (state as any).cache);
  const dispatch = useDispatch();

  const usedButtons = browser.clickedButtons;

  function pageCache(path: string, key: string) {
    if (typeof window === "undefined") {
      return null; // Always return null on server-side
    }

    // Check popState navigation
    if (usedButtons && cache[path] && cache[path][key] !== undefined) {
      // Reset popState navigation
      const data = cache[path][key];
      return data;
    }

    return null;
  }

  function cachePageData(path: string, key: string, data: any) {
    if (typeof window === "undefined") {
      return; // Don't cache on server-side
    }
    dispatch(cachePage({ path, key, data }));
  }

  function deleteEntireCacheData() {
    dispatch(deleteEntireCache());
  }

  return { pageCache, cachePageData, deleteEntireCacheData };
}

export function activatePageCache() {
  const router = useRouter();
  const dispatch = useDispatch();
  const isPopState = useRef(false);
  useEffect(() => {
    const handlePopState = () => {
      // This handles the back and forward buttons
      isPopState.current = true;
      dispatch(clickBrowserButtons({}));
    };

    router.beforePopState(() => {
      handlePopState();
      return true;
    });

    router.events.on("routeChangeComplete", () => {
      // This handles all route changes
      if (!isPopState.current) {
        dispatch(notClickBrowserButtons({}));
      }
      isPopState.current = false;
    });

    return () => {
      router.events.off("routeChangeComplete", () => {
        if (!isPopState.current) {
          dispatch(notClickBrowserButtons({}));
        }
        isPopState.current = false;
      });
    };
  }, [router]);
}