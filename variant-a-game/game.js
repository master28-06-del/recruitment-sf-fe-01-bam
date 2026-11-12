(() => {
  "use strict";

  const stage = document.getElementById("stage");
  const viewportElement = document.querySelector(".viewport");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const failScreen = document.getElementById("failScreen");
  const winScreen = document.getElementById("winScreen");
  const gut = document.getElementById("gut");
  const player = document.getElementById("player");
  const obstacleLayer = document.getElementById("obstacles");
  const readyLabel = document.getElementById("readyLabel");
  const muteButton = document.getElementById("muteButton");
  const debug = new URLSearchParams(location.search).has("debug");

  const clickTag = window.clickTag || "https://example.com/landing";
  document.querySelectorAll(".clickout").forEach((link) => { link.href = clickTag; });

  const sounds = {
    music: new Audio("assets/music/background_music/Funny Game Loop.mp3"),
    crash: new Audio("assets/music/crash/Cartoon Crash Boing.mp3"),
    fail: new Audio("assets/music/endcard_fail/Fail.mp3"),
    applause: new Audio("assets/music/endcard_win/applause.mp3"),
    cheer: new Audio("assets/music/endcard_win/Celebrative Happy Woohoo Cheer 2.mp3")
  };
  sounds.music.loop = true;
  sounds.music.volume = 0.36;
  sounds.crash.volume = 0.7;
  sounds.fail.volume = 0.58;
  sounds.applause.volume = 0.65;
  sounds.cheer.volume = 0.42;
  let muted = false;
  let state = "start";
  let rafId = 0;
  let failDelay = 0;
  let endSound = null;
  let failSoundPlayed = false;
  let lastFrame = 0;
  let elapsed = 0;
  let playerY = 320;
  let velocityY = 0;
  let distance = 0;
  let obstacles = [];
  let hidden = document.hidden;
  let pageHidden = false;
  let inViewport = true;
  const playerX = 86;
  const playerHitRadiusX = 17;
  const playerHitRadiusY = 18.5;
  const gutTopInnerEdge = 233;
  const gutBottomInnerEdge = 575;
  const sceneLength = 2528;
  const initialSpeed = 94;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resizeStage() {
    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width || document.documentElement.clientWidth;
    const viewportHeight = visualViewport?.height || window.innerHeight;
    const viewportLeft = visualViewport?.offsetLeft || 0;
    const viewportTop = visualViewport?.offsetTop || 0;
    viewportElement.style.setProperty("--viewport-width", `${viewportWidth}px`);
    viewportElement.style.setProperty("--viewport-height", `${viewportHeight}px`);
    viewportElement.style.setProperty("--viewport-left", `${viewportLeft}px`);
    viewportElement.style.setProperty("--viewport-top", `${viewportTop}px`);
    const scale = Math.min(viewportWidth / 360, viewportHeight / 640);
    stage.style.setProperty("--stage-scale", String(scale));
  }
  window.addEventListener("resize", resizeStage, { passive: true });
  window.visualViewport?.addEventListener("resize", resizeStage, { passive: true });
  resizeStage();
  if (debug) stage.classList.add("debug");

  function playSound(audio, restart = true) {
    if (muted || hidden) return;
    if (restart) audio.currentTime = 0;
    const result = audio.play();
    if (result && typeof result.catch === "function") result.catch(() => {});
  }

  function stopSounds() {
    Object.values(sounds).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
    });
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastFrame = 0;
    if (failDelay) window.clearTimeout(failDelay);
    failDelay = 0;
  }

  function makeObstacleDeck() {
    const deck = [];
    for (let i = 1; i <= 6; i += 1) deck.push({ src: `assets/01_game/bac${i}.png`, kind: "bacteria" });
    for (let i = 1; i <= 9; i += 1) deck.push({ src: `assets/01_game/txt${i}.png`, kind: "text" });
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const sizes = {
      bac1: [125, 119], bac2: [43, 154], bac3: [158, 56],
      bac4: [138, 68], bac5: [107, 87], bac6: [100, 95],
      txt1: [46, 188], txt2: [68, 226], txt3: [47, 121],
      txt4: [58, 169], txt5: [60, 362], txt6: [41, 289],
      txt7: [59, 163], txt8: [37, 306], txt9: [51, 313]
    };

    return deck.map((item, index) => {
      const image = document.createElement("img");
      const key = item.src.match(/(?:bac|txt)\d+/)[0];
      const [width, height] = sizes[key];
      image.className = `obstacle${debug ? " debug" : ""}`;
      image.alt = "";
      image.draggable = false;
      image.style.width = `${width / 2}px`;
      image.style.height = `${height / 2}px`;
      const obstacle = {
        image,
        kind: item.kind,
        x: 405 + index * 143,
        y: [268, 320, 372, 288, 380, 340, 260, 370, 300, 390, 275, 350, 380, 295, 360][index],
        alphaMask: null,
        passed: false
      };
      image.addEventListener("load", () => {
        image.style.width = `${image.naturalWidth / 2}px`;
        image.style.height = `${image.naturalHeight / 2}px`;
        obstacle.alphaMask = createAlphaMask(image);
      }, { once: true });
      image.src = item.src;
      obstacleLayer.appendChild(image);
      return obstacle;
    });
  }

  function createAlphaMask(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alpha = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < alpha.length; i += 1) alpha[i] = pixels[i * 4 + 3];
    return { alpha, width: canvas.width, height: canvas.height };
  }

  function resetRun() {
    stopLoop();
    stopSounds();
    endSound = null;
    failSoundPlayed = false;
    obstacleLayer.replaceChildren();
    obstacles = [];
    distance = 0;
    elapsed = 0;
    playerY = 320;
    velocityY = 0;
    gut.style.transform = "translate3d(0,0,0)";
    player.style.transform = "translate3d(0,0,0) rotate(0deg)";
    failScreen.hidden = true;
    winScreen.hidden = true;
    startScreen.hidden = true;
    gameScreen.hidden = false;
    readyLabel.classList.remove("show");
    state = "ready";
    obstacles = makeObstacleDeck();
    drawFrame();
    if (!reducedMotion) {
      void readyLabel.offsetWidth;
      readyLabel.classList.add("show");
    }
    playSound(sounds.music);
    rafId = requestAnimationFrame(frame);
  }

  function jump() {
    if (state === "start") {
      resetRun();
      velocityY = -335;
      state = "playing";
      return;
    }
    if (state === "ready") {
      state = "playing";
      velocityY = -335;
      return;
    }
    if (state === "playing") velocityY = -335;
  }

  function render() {
    gut.style.transform = `translate3d(${-distance}px,0,0)`;
    player.style.transform = `translate3d(0,${playerY - 320}px,0) rotate(${Math.max(-18, Math.min(20, velocityY * 0.035))}deg)`;
    obstacles.forEach(({ image, x, y }) => {
      image.style.transform = `translate3d(${x - distance}px,${y}px,0) translate(-50%,-50%)`;
    });
  }

  function drawFrame() {
    player.style.transform = `translate3d(0,${playerY - 320}px,0)`;
    obstacles.forEach(({ image, x, y }) => {
      image.style.transform = `translate3d(${x - distance}px,${y}px,0) translate(-50%,-50%)`;
    });
  }

  function collided(obstacle) {
    const width = Number.parseFloat(obstacle.image.style.width) || obstacle.image.naturalWidth / 2;
    const height = Number.parseFloat(obstacle.image.style.height) || obstacle.image.naturalHeight / 2;
    const centerX = obstacle.x - distance;
    const left = centerX - width / 2;
    const top = obstacle.y - height / 2;
    const overlapLeft = Math.max(left, playerX - playerHitRadiusX);
    const overlapRight = Math.min(left + width, playerX + playerHitRadiusX);
    const overlapTop = Math.max(top, playerY - playerHitRadiusY);
    const overlapBottom = Math.min(top + height, playerY + playerHitRadiusY);
    if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) return false;

    const mask = obstacle.alphaMask;
    if (!mask) {
      const dx = (centerX - playerX) / (playerHitRadiusX + width * 0.3);
      const dy = (obstacle.y - playerY) / (playerHitRadiusY + height * 0.3);
      return dx * dx + dy * dy <= 1;
    }

    const xStart = Math.max(0, Math.floor((overlapLeft - left) * 2));
    const xEnd = Math.min(mask.width, Math.ceil((overlapRight - left) * 2));
    const yStart = Math.max(0, Math.floor((overlapTop - top) * 2));
    const yEnd = Math.min(mask.height, Math.ceil((overlapBottom - top) * 2));

    for (let y = yStart; y < yEnd; y += 1) {
      const screenY = top + (y + 0.5) / 2;
      const dy = (screenY - playerY) / playerHitRadiusY;
      for (let x = xStart; x < xEnd; x += 1) {
        if (mask.alpha[y * mask.width + x] < 32) continue;
        const screenX = left + (x + 0.5) / 2;
        const dx = (screenX - playerX) / playerHitRadiusX;
        if (dx * dx + dy * dy <= 1) return true;
      }
    }
    return false;
  }

  function finish(result) {
    if (state === "ended") return;
    state = "ended";
    stopLoop();
    sounds.music.pause();
    sounds.music.currentTime = 0;
    gameScreen.hidden = true;

    if (result === "win") {
      winScreen.hidden = false;
      endSound = sounds.applause;
      playSound(sounds.applause);
      sounds.applause.onended = () => {
        if (state !== "ended") return;
        endSound = sounds.cheer;
        playSound(sounds.cheer);
      };
      return;
    }

    failScreen.hidden = false;
    endSound = sounds.fail;
    playSound(sounds.crash);
    failSoundPlayed = false;
    failDelay = window.setTimeout(() => {
      failDelay = 0;
      if (state === "ended" && !hidden && !failSoundPlayed) {
        failSoundPlayed = true;
        playSound(sounds.fail);
      }
    }, 520);
  }

  function frame(timestamp) {
    rafId = 0;
    if (hidden || state === "ended" || state === "start") return;
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.04) : 0;
    lastFrame = timestamp;
    elapsed += dt;
    if (state === "ready" && elapsed >= 0.85) state = "playing";

    if (state === "playing") {
      const speed = initialSpeed + Math.min(elapsed * 1.2, 24);
      distance += speed * dt;
      velocityY += 900 * dt;
      playerY += velocityY * dt;
      if (playerY - playerHitRadiusY <= gutTopInnerEdge ||
          playerY + playerHitRadiusY >= gutBottomInnerEdge) {
        finish("fail");
        return;
      }

      for (const obstacle of obstacles) {
        if (obstacle.passed) continue;
        if (collided(obstacle)) {
          finish("fail");
          return;
        }
        const width = Number.parseFloat(obstacle.image.style.width) || obstacle.image.naturalWidth / 2;
        if (obstacle.x - distance + width / 2 < playerX - playerHitRadiusX) obstacle.passed = true;
      }
      if (distance >= sceneLength) {
        finish("win");
        return;
      }
    }

    render();
    rafId = requestAnimationFrame(frame);
  }

  function updateVisibility() {
    const wasHidden = hidden;
    hidden = document.hidden || pageHidden || !inViewport;
    if (hidden === wasHidden) return;
    if (hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lastFrame = 0;
      if (failDelay) window.clearTimeout(failDelay);
      failDelay = 0;
      Object.values(sounds).forEach((audio) => audio.pause());
      return;
    }
    if (state === "playing" || state === "ready") {
      playSound(sounds.music, false);
      if (!rafId) rafId = requestAnimationFrame(frame);
    } else if (state === "ended" && endSound && !endSound.ended) {
      playSound(endSound, false);
    }
  }

  document.addEventListener("visibilitychange", updateVisibility);
  window.addEventListener("pagehide", () => {
    pageHidden = true;
    updateVisibility();
  });
  window.addEventListener("pageshow", () => {
    pageHidden = false;
    updateVisibility();
  });
  if ("IntersectionObserver" in window) {
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting && entry.intersectionRatio > 0;
      updateVisibility();
    });
    visibilityObserver.observe(stage);
  }
  document.getElementById("startButton").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
  });
  document.getElementById("gameHit").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
  });
  document.getElementById("replayButton").addEventListener("click", resetRun);
  muteButton.addEventListener("click", () => {
    muted = !muted;
    muteButton.setAttribute("aria-pressed", String(muted));
    muteButton.setAttribute("aria-label", muted ? "Ton einschalten" : "Ton ausschalten");
    if (muted) Object.values(sounds).forEach((audio) => audio.pause());
    else if (state === "playing" || state === "ready") playSound(sounds.music, false);
    else if (state === "ended" && endSound) playSound(endSound, false);
  });
})();
