(() => {
  "use strict";

  const clickTag = window.clickTag || "https://example.com/landing";
  const clickArea = document.querySelector(".click-area");
  clickArea.href = clickTag;

  const params = new URLSearchParams(location.search);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let startTimer = 0;

  function startAt(deadline) {
    if (reducedMotion) {
      document.body.classList.add("animate");
      return;
    }
    window.clearTimeout(startTimer);
    startTimer = window.setTimeout(
      () => document.body.classList.add("animate"),
      Math.max(0, deadline - Date.now())
    );
  }

  if (params.has("sync") && window.parent !== window) {
    window.parent.postMessage({ type: "fireplace-ready" }, location.origin);
    window.addEventListener("message", (event) => {
      if (event.source !== window.parent || event.origin !== location.origin) return;
      if (event.data?.type === "fireplace-start" && Number.isFinite(event.data.at)) {
        startAt(event.data.at);
      }
    });
  } else {
    startAt(Date.now() + 180);
  }
})();
