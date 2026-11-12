(() => {
  "use strict";

  const clickTag = window.clickTag || "https://example.com/landing";
  const clickArea = document.querySelector(".click-area");
  clickArea.href = clickTag;

  const params = new URLSearchParams(location.search);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const messageOrigin = location.origin === "null" ? "*" : location.origin;
  let started = false;

  function startAt(timestamp) {
    if (started) return;
    started = true;

    if (reducedMotion) {
      document.body.classList.add("animate");
      return;
    }

    const delay = Math.max(0, timestamp - Date.now());
    const kickOff = () => document.body.classList.add("animate");

    if (delay <= 0) {
      kickOff();
      return;
    }

    requestAnimationFrame(() => {
      window.setTimeout(kickOff, delay);
    });
  }

  if (params.has("sync") && window.parent !== window) {
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || event.origin !== location.origin) return;
      if (event.data?.type === "fireplace-start" && Number.isFinite(event.data.at)) {
        startAt(event.data.at);
      }
    });
  }

  function assetsReady() {
    if (params.has("sync") && window.parent !== window) {
      window.parent.postMessage({ type: "fireplace-ready" }, messageOrigin);
      window.setTimeout(() => startAt(Date.now() + 180), 1200);
    } else {
      startAt(Date.now() + 180);
    }
  }

  if (document.readyState === "complete") {
    assetsReady();
  } else {
    window.addEventListener("load", assetsReady, { once: true });
  }
})();
