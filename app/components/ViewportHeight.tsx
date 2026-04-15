"use client";

import { useEffect } from "react";

export default function ViewportHeight() {
  useEffect(() => {
    const root = document.documentElement;

    const setHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty("--app-height", `${height}px`);
    };

    setHeight();

    window.addEventListener("resize", setHeight);
    window.visualViewport?.addEventListener("resize", setHeight);
    window.visualViewport?.addEventListener("scroll", setHeight);

    return () => {
      window.removeEventListener("resize", setHeight);
      window.visualViewport?.removeEventListener("resize", setHeight);
      window.visualViewport?.removeEventListener("scroll", setHeight);
    };
  }, []);

  return null;
}
