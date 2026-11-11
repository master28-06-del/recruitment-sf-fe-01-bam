(() => {
  "use strict";

  const stage = document.getElementById("stage");
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
  let lastFrame = 0;
  let elapsed = 0;
  let playerY = 320;
  let velocityY = 0;
  let distance = 0;
  let obstacles = [];
  let hidden = document.hidden;
  const playerX = 86;
  const sceneLength = 2528;
  const initialSpeed = 94;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resizeStage() {
    const scale = Math.min(window.innerWidth / 360, window.innerHeight / 640);
    const logicalHeight = window.innerHeight / scale;
    stage.style.height = `${logicalHeight}px`;
    stage.style.setProperty("--content-offset", `${(logicalHeight - 640) / 2}px`);
    stage.style.transform = `scale(${scale})`;
  }
  window.addEventListener("resize", resizeStage, { passive: true });
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
      image.src = item.src;
      image.alt = "";
      image.draggable = false;
      image.style.width = `${width / 2}px`;
      image.style.height = `${height / 2}px`;
      image.addEventListener("load", () => {
        image.style.width = `${image.naturalWidth / 2}px`;
        image.style.height = `${image.naturalHeight / 2}px`;
      }, { once: true });
      obstacleLayer.appendChild(image);
      return {
        image,
        kind: item.kind,
        x: 405 + index * 143,
        y: [268, 320, 372, 288, 380, 340, 260, 370, 300, 390, 275, 350, 380, 295, 360][index],
        passed: false
      };
    });
  }

  function resetRun() {
    stopLoop();
    stopSounds();
    endSound = null;
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
    const dx = Math.abs(playerX - (obstacle.x - distance));
    const dy = Math.abs(playerY - obstacle.y);
    const rx = 13 + width * (obstacle.kind === "text" ? 0.22 : 0.3);
    const ry = 13 + height * (obstacle.kind === "text" ? 0.32 : 0.3);
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1;
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
        endSound = sounds.cheer;
        playSound(sounds.cheer);
      };
    } else {
      failScreen.hidden = false;
      endSound = sounds.fail;
      playSound(sounds.crash);
      failDelay = window.setTimeout(() => {
        failDelay = 0;
        if (state === "ended" && !hidden) playSound(sounds.fail);
      }, 520);
    }
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
      if (playerY < 20 || playerY > 620) {
        finish("fail");
        return;
      }

      for (const obstacle of obstacles) {
        if (!obstacle.passed && obstacle.x - distance < playerX + 30 && obstacle.x - distance > playerX - 30) {
          if (collided(obstacle)) {
            finish("fail");
            return;
          }
        }
        if (!obstacle.passed && obstacle.x - distance < playerX - 26) obstacle.passed = true;
      }
      if (distance >= sceneLength) {
        finish("win");
        return;
      }
    }

    render();
    rafId = requestAnimationFrame(frame);
  }

  function onVisibilityChange() {
    hidden = document.hidden;
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

  document.addEventListener("visibilitychange", onVisibilityChange);
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
