document.addEventListener("DOMContentLoaded", () => {
  const cameraImage = document.getElementById("cameraImage");
  const cameraFrame = document.getElementById("cameraFrame");
  const cameraLabel = document.getElementById("cameraLabel");
  const timeDisplay = document.getElementById("timeDisplay");
  const eventLog = document.getElementById("eventLog");
  const cooldownText = document.getElementById("cooldownText");
  const progressBar = document.getElementById("progressBar");
  const soundBtn = document.getElementById("soundBtn");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");
  const restartBtn = document.getElementById("restartBtn");
  const camButtons = Array.from(document.querySelectorAll("[data-cam]"));

  if (!cameraImage || !cameraFrame || !timeDisplay || !eventLog || !cooldownText || !soundBtn || !overlay) return;

  const TOTAL_HOURS = 6;
  const SECONDS_PER_HOUR = 12;
  const TOTAL_SECONDS = TOTAL_HOURS * SECONDS_PER_HOUR;

const cameraData = {
  1: {
    name: "Cam 1",
    normal: "images/1.jpeg",
    monster: "images/1M.jpeg",
  },
  2: {
    name: "Cam 2",
    normal: "images/2.jpeg",
    monster: "images/2M.jpeg",
  },
  3: {
    name: "Cam 3",
    normal: "images/3.jpeg",
    monster: "images/3M.jpeg",
  },
  4: {
    name: "Cam 4",
    normal: "images/4.jpeg",
    monster: "images/4M.jpeg",
  },
};
  const hourLabels = ["12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM"];

  const state = {
    selectedCam: 1,
    monsterCam: 1,      // 1 a 4 = en cámaras, 0 = oficina
    hourIndex: 0,
    secondsIntoHour: 0,
    lureCooldown: 0,
    gameOver: false,
    gameWon: false,
  };

  function makeFallbackSvg(title, subtitle, danger = false) {
    const bg = danger ? "#1b060a" : "#05070c";
    const line = danger ? "#ff4e5c" : "#8af0ff";
    const txt = danger ? "#ffb6be" : "#d9f7ff";

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="${bg}"/>
            <stop offset="100%" stop-color="#0b1017"/>
          </linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#g)"/>
        <rect x="24" y="24" width="752" height="552" rx="28" fill="none" stroke="${line}" stroke-opacity="0.5" stroke-width="3"/>
        <text x="50%" y="45%" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" fill="${txt}" font-weight="700">${title}</text>
        <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${txt}" opacity="0.85">${subtitle}</text>
        <text x="50%" y="80%" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${txt}" opacity="0.45">Reemplaza esta vista con tu PNG</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function playLureTone() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 720;
    gain.gain.value = 0.03;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);

    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  }

  function updateTimeUI() {
    timeDisplay.textContent = hourLabels[state.hourIndex];
    const totalElapsed = state.hourIndex * SECONDS_PER_HOUR + state.secondsIntoHour;
    const percent = Math.min(100, (totalElapsed / TOTAL_SECONDS) * 100);
    progressBar.style.width = `${percent}%`;
  }

  function updateCooldownUI() {
    if (state.lureCooldown > 0) {
      cooldownText.textContent = `${state.lureCooldown}s`;
      soundBtn.textContent = `EMITIR SONIDO (${state.lureCooldown})`;
      soundBtn.disabled = true;
    } else {
      cooldownText.textContent = "Listo";
      soundBtn.textContent = "EMITIR SONIDO";
      soundBtn.disabled = state.gameOver || state.gameWon;
    }
  }

  function setActiveCamButton(cam) {
    camButtons.forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.cam) === cam);
    });
  }

  function renderCamera() {
    const cam = cameraData[state.selectedCam];
    const monsterHere = state.monsterCam === state.selectedCam;

    cameraLabel.textContent = `CAM ${state.selectedCam} · ${cam.name}`;
    cameraFrame.classList.toggle("danger", monsterHere);

    const desiredSrc = monsterHere ? cam.monster : cam.normal;
    const fallbackSrc = makeFallbackSvg(
      `CAM ${state.selectedCam}`,
      monsterHere ? "Entidad detectada" : cam.name,
      monsterHere
    );

    cameraImage.dataset.fallbackUsed = "0";
    cameraImage.onerror = () => {
      if (cameraImage.dataset.fallbackUsed === "1") return;
      cameraImage.dataset.fallbackUsed = "1";
      cameraImage.src = fallbackSrc;
    };
    cameraImage.src = desiredSrc;

    if (monsterHere) {
      eventLog.textContent = `¡La entidad está en CAM ${state.selectedCam}!`;
    }
  }

  function updateAllUI() {
    updateTimeUI();
    updateCooldownUI();
    setActiveCamButton(state.selectedCam);
    renderCamera();
  }

  function selectCam(cam) {
    if (state.gameOver || state.gameWon) return;
    state.selectedCam = cam;
    updateAllUI();
  }

  function triggerLure() {
    if (state.gameOver || state.gameWon || state.lureCooldown > 0) return;

    playLureTone();
    state.lureCooldown = 8;

    const success = Math.random() < 0.7;

    if (success) {
      state.monsterCam = state.selectedCam;
      eventLog.textContent = `El sonido atrajo a la entidad a CAM ${state.selectedCam}.`;
    } else {
      eventLog.textContent = "La entidad ignoró el sonido y siguió avanzando.";
    }

    updateCooldownUI();
    renderCamera();
  }

  function loseGame() {
    state.gameOver = true;
    overlayTitle.textContent = "GAME OVER";
    overlayText.textContent = "La entidad llegó a la oficina.";
    overlay.classList.remove("hidden");
    updateCooldownUI();
  }

  function winGame() {
    state.gameWon = true;
    overlayTitle.textContent = "VICTORIA";
    overlayText.textContent = "Sobreviviste hasta las 6 AM.";
    overlay.classList.remove("hidden");
    updateCooldownUI();
  }

  function monsterMove() {
    if (state.gameOver || state.gameWon) return;

    if (state.monsterCam === 0) {
      loseGame();
      return;
    }

    // Probabilidad de avanzar según la cámara actual
    const chances = {
      1: 0.26,
      2: 0.34,
      3: 0.42,
      4: 0.52,
    };

    const chance = chances[state.monsterCam] ?? 0.3;

    if (Math.random() < chance) {
      if (state.monsterCam < 4) {
        state.monsterCam += 1;
        eventLog.textContent = `La entidad se movió a CAM ${state.monsterCam}.`;
      } else {
        state.monsterCam = 0;
        eventLog.textContent = "La entidad llegó a la oficina.";
        renderCamera();
        loseGame();
        return;
      }
    }

    renderCamera();
  }

  function tickClock() {
    if (state.gameOver || state.gameWon) return;

    state.secondsIntoHour += 1;

    if (state.lureCooldown > 0) {
      state.lureCooldown -= 1;
      if (state.lureCooldown < 0) state.lureCooldown = 0;
    }

    if (state.secondsIntoHour >= SECONDS_PER_HOUR) {
      state.secondsIntoHour = 0;
      state.hourIndex += 1;

      if (state.hourIndex >= hourLabels.length - 1) {
        updateTimeUI();
        winGame();
        return;
      }
    }

    updateAllUI();
  }

  function resetGame() {
    state.selectedCam = 1;
    state.monsterCam = 1;
    state.hourIndex = 0;
    state.secondsIntoHour = 0;
    state.lureCooldown = 0;
    state.gameOver = false;
    state.gameWon = false;

    overlay.classList.add("hidden");
    eventLog.textContent = "Sistema listo. Monitorea las cámaras.";
    updateAllUI();
  }

  camButtons.forEach((btn) => {
    btn.addEventListener("click", () => selectCam(Number(btn.dataset.cam)));
  });

  soundBtn.addEventListener("click", triggerLure);
  restartBtn.addEventListener("click", resetGame);

  // Inicio
  updateAllUI();

  // Reloj y movimiento de la entidad
  setInterval(tickClock, 1000);
  setInterval(monsterMove, 2800);
});