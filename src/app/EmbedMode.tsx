"use client";

import { useEffect } from "react";

/**
 * Activa el modo embed cuando la URL contiene ?embed=1.
 * - Marca <body class="embed-mode"> para que CSS oculte header/footer.
 * - Emite postMessage({type:"dsvoice:height", height}) al parent en cada
 *   cambio de tamaño, para que el iframe contenedor se auto-ajuste.
 */
export default function EmbedMode() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const isEmbed = params.get("embed") === "1";
    if (!isEmbed) return;

    document.body.classList.add("embed-mode");

    const post = () => {
      const height = document.documentElement.scrollHeight;
      window.parent?.postMessage(
        { type: "dsvoice:height", height },
        "*"
      );
    };

    post();

    const ro = new ResizeObserver(post);
    ro.observe(document.body);

    const mo = new MutationObserver(post);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    window.addEventListener("load", post);
    window.addEventListener("resize", post);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("load", post);
      window.removeEventListener("resize", post);
      document.body.classList.remove("embed-mode");
    };
  }, []);

  return null;
}
