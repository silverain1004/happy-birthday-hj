(function () {
  var canvas = document.getElementById("confetti");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var pieces = [];
  var running = false;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawnBurst(count) {
    var cx = canvas.width * 0.5;
    var cy = canvas.height * 0.35;
    for (var i = 0; i < count; i++) {
      var angle = random(0, Math.PI * 2);
      var speed = random(2, 7);
      pieces.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - random(1, 4),
        w: random(4, 9),
        h: random(5, 11),
        rot: random(0, Math.PI * 2),
        vr: random(-0.2, 0.2),
        color: "hsl(" + random(320, 360) + ",85%," + random(55, 72) + "%)",
        life: 1,
        decay: random(0.004, 0.012),
      });
    }
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = pieces.length - 1; i >= 0; i--) {
      var p = pieces[i];
      p.vy += 0.12;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > canvas.height + 20) {
        pieces.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (pieces.length) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  function start() {
    if (reduceMotion) return;
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  function burst() {
    spawnBurst(80);
    start();
  }

  window.addEventListener("resize", resize);
  resize();

  if (!reduceMotion) {
    burst();
  }

  var btn = document.getElementById("burst");
  if (btn) btn.addEventListener("click", burst);
})();

(function () {
  var nav = document.querySelector(".year-nav");
  if (!nav) return;

  var links = nav.querySelectorAll(".year-nav-link");
  var idToLink = {};
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute("href");
    if (href && href.charAt(0) === "#") idToLink[href.slice(1)] = links[i];
  }

  function setActive(id) {
    for (var j = 0; j < links.length; j++) {
      links[j].classList.remove("is-active");
      links[j].removeAttribute("aria-current");
    }
    var active = idToLink[id];
    if (active) {
      active.classList.add("is-active");
      active.setAttribute("aria-current", "true");
    }
  }

  var sections = document.querySelectorAll(".snap-section");
  if (!sections.length) return;
  var ticking = false;

  function updateActiveFromViewport() {
    var viewportCenter = window.innerHeight * 0.5;
    var closestId = "intro";
    var closestDistance = Infinity;

    for (var s = 0; s < sections.length; s++) {
      var rect = sections[s].getBoundingClientRect();
      var sectionCenter = rect.top + rect.height * 0.5;
      var distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = sections[s].id || closestId;
      }
    }
    setActive(closestId);
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateActiveFromViewport();
      ticking = false;
    });
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  updateActiveFromViewport();
})();

(function () {
  var startBtn = document.getElementById("start");
  var countdownEl = document.getElementById("countdown");
  var intro = document.getElementById("intro");
  if (!startBtn) return;

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function formatRemaining(ms) {
    var totalSeconds = Math.max(0, Math.floor(ms / 1000));
    var hoursTotal = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return pad2(hoursTotal) + ":" + pad2(minutes) + ":" + pad2(seconds);
  }

  // 2026-03-29 00:00:00 (사용자 PC의 로컬 시간 기준)
  // 테스트 모드: URL에 ?test=1 이면 "지금부터 1분 뒤"로 설정
  var target = new Date(2026, 2, 29, 0, 0, 0, 0);
  try {
    var params = new URLSearchParams(window.location.search || "");
    if (params.get("test") === "1") {
      target = new Date(Date.now() + 10 * 1000);
    }
  } catch (e) {}

  function setLocked(locked) {
    startBtn.disabled = locked;
    startBtn.setAttribute("aria-disabled", locked ? "true" : "false");
    if (locked) {
      document.body.classList.add("is-locked");
    } else {
      document.body.classList.remove("is-locked");
    }
  }

  function tickCountdown() {
    var now = new Date();
    var remaining = target.getTime() - now.getTime();
    if (remaining <= 0) {
      setLocked(false);
      if (countdownEl) countdownEl.textContent = "00:00:00";
      return false;
    }

    setLocked(true);
    if (countdownEl) countdownEl.textContent = formatRemaining(remaining);
    return true;
  }

  // 최초 1회 즉시 렌더 후 1초마다 갱신
  var keep = tickCountdown();
  if (keep) {
    var timer = window.setInterval(function () {
      if (!tickCountdown()) window.clearInterval(timer);
    }, 1000);
  }

  startBtn.addEventListener("click", function () {
    if (startBtn.disabled) return;

    // 클릭(사용자 제스처)에서 소리 재생을 걸어야 정책에 덜 막힘
    if (window.__bgm && typeof window.__bgm.playWithSound === "function") {
      window.__bgm.playWithSound();
    }

    // "지금 페이지"로 이동: 인트로 섹션으로 스크롤
    if (intro && typeof intro.scrollIntoView === "function") {
      intro.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      location.hash = "#intro";
    }
  });
})();

(function () {
  var toggle = document.getElementById("bgmToggle");
  var mount = document.getElementById("yt-bgm");
  if (!toggle || !mount) return;

  var VIDEO_ID = "zCO9WiMItNI";
  var player = null;
  var pendingPlay = false;
  var pendingAutoplay = false;

  function setUi(mode) {
    // mode: "off" | "muted" | "on"
    var pressed = mode !== "off";
    toggle.setAttribute("aria-pressed", pressed ? "true" : "false");
    if (mode === "off") {
      toggle.textContent = "BGM 켜기";
      toggle.setAttribute("aria-label", "배경음악 재생");
    } else if (mode === "muted") {
      toggle.textContent = "소리 켜기";
      toggle.setAttribute("aria-label", "배경음악 소리 켜기");
    } else {
      toggle.textContent = "소리 끄기";
      toggle.setAttribute("aria-label", "배경음악 소리 끄기");
    }
  }

  function ensurePlayer() {
    if (player || !window.YT || !window.YT.Player) return;
    player = new window.YT.Player(mount, {
      width: "0",
      height: "0",
      videoId: VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        loop: 1,
        playlist: VIDEO_ID,
      },
      events: {
        onReady: function () {
          try {
            player.setVolume(25);
          } catch (e) {}

          // 자동재생은 대부분 "무음"일 때만 허용됨
          if (pendingAutoplay) {
            pendingAutoplay = false;
            try {
              player.mute();
            } catch (e) {}
            try {
              player.playVideo();
              setUi("muted");
            } catch (e) {}
            return;
          }

          if (pendingPlay) {
            pendingPlay = false;
            try {
              player.playVideo();
            } catch (e) {}
          }
        },
        onStateChange: function (ev) {
          var state = ev && typeof ev.data === "number" ? ev.data : null;
          var isPlaying = state === 1; // YT.PlayerState.PLAYING
          var isPaused = state === 2; // PAUSED
          if (isPaused) setUi("off");
          if (isPlaying) {
            try {
              setUi(player.isMuted() ? "muted" : "on");
            } catch (e) {
              setUi("on");
            }
          }
        },
      },
    });
  }

  // IFrame API가 늦게 올라와도 버튼은 동작하도록 폴링
  var poll = window.setInterval(function () {
    if (player) {
      window.clearInterval(poll);
      return;
    }
    if (window.YT && window.YT.Player) {
      ensurePlayer();
      window.clearInterval(poll);
    }
  }, 200);

  setUi("off");

  function playWithSound() {
    if (!window.YT || !window.YT.Player) return false;
    ensurePlayer();
    if (!player) return false;
    try {
      try {
        player.unMute();
      } catch (e) {}
      player.playVideo();
      setUi("on");
      return true;
    } catch (e) {
      return false;
    }
  }

  // 메인 버튼 같은 "사용자 클릭"에서 호출할 수 있게 노출
  window.__bgm = window.__bgm || {};
  window.__bgm.playWithSound = playWithSound;

  toggle.addEventListener("click", function () {
    // 유튜브가 임베드 불가거나 차단된 경우를 대비한 안전장치
    if (!window.YT || !window.YT.Player) {
      pendingPlay = true;
      return;
    }

    ensurePlayer();
    if (!player) {
      pendingPlay = true;
      return;
    }

    try {
      var state = player.getPlayerState();
      var isPlaying = state === 1;
      var isMuted = false;
      try {
        isMuted = player.isMuted();
      } catch (e) {}

      // 클릭 순환: (꺼짐) -> 무음 재생 -> 소리 켬 -> 정지
      if (!isPlaying) {
        try {
          player.mute();
        } catch (e) {}
        player.playVideo();
        setUi("muted");
        return;
      }

      if (isMuted) {
        try {
          player.unMute();
        } catch (e) {}
        setUi("on");
        return;
      }

      player.pauseVideo();
      setUi("off");
    } catch (e) {
      // 상태 조회가 막힐 수 있어 보수적으로 재생 시도
      try {
        try {
          player.mute();
        } catch (e2) {}
        player.playVideo();
        setUi("muted");
      } catch (e2) {}
    }
  });
})();
