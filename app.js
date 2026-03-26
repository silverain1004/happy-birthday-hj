(function () {
  var PHASE_COUNTDOWN = "countdown";
  var PHASE_MAIN = "main";

  function setPhase(phase) {
    document.body.setAttribute("data-phase", phase);
  }

  function getParam(name) {
    try {
      return new URLSearchParams(window.location.search || "").get(name);
    } catch (e) {
      return null;
    }
  }

  // -----------------------
  // Countdown gate
  // -----------------------
  (function () {
    var startBtn = document.getElementById("start");
    var countdownEl = document.getElementById("countdown");
    if (!startBtn || !countdownEl) return;

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
    // 테스트 모드: URL에 ?test=1 이면 "지금부터 3초 뒤"로 설정
    var target = new Date(2026, 2, 29, 0, 0, 0, 0);
    if (getParam("test") === "1") target = new Date(Date.now() + 3 * 1000);

    function setLocked(locked) {
      startBtn.disabled = locked;
      startBtn.setAttribute("aria-disabled", locked ? "true" : "false");
    }

    function tick() {
      var now = new Date();
      var remaining = target.getTime() - now.getTime();
      if (remaining <= 0) {
        setLocked(false);
        countdownEl.textContent = "00:00:00";
        return false;
      }
      setLocked(true);
      countdownEl.textContent = formatRemaining(remaining);
      return true;
    }

    var keep = tick();
    if (keep) {
      var timer = window.setInterval(function () {
        if (!tick()) window.clearInterval(timer);
      }, 1000);
    }

    startBtn.addEventListener("click", function () {
      if (startBtn.disabled) return;
      window.__app && window.__app.startMain && window.__app.startMain();
    });
  })();

  // -----------------------
  // Main visuals (confetti)
  // -----------------------
  function initConfetti() {
    var canvas = document.getElementById("confetti");
    if (!canvas || !canvas.getContext) return null;

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

    function tickAnim() {
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
        requestAnimationFrame(tickAnim);
      } else {
        running = false;
      }
    }

    function start() {
      if (reduceMotion) return;
      if (!running) {
        running = true;
        requestAnimationFrame(tickAnim);
      }
    }

    function burst() {
      spawnBurst(80);
      start();
    }

    window.addEventListener("resize", resize);
    resize();

    return { burst: burst, reduceMotion: reduceMotion };
  }

  // -----------------------
  // Year nav active state
  // -----------------------
  function initYearNav() {
    var nav = document.querySelector(".year-nav");
    if (!nav) return;

    var links = nav.querySelectorAll(".year-nav-link");
    var indicator = nav.querySelector(".year-nav-indicator");
    var idToLink = {};
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href");
      if (href && href.charAt(0) === "#") idToLink[href.slice(1)] = links[i];
    }

    function updateIndicator(activeEl) {
      if (!indicator || !activeEl) return;
      try {
        // nav 내부 좌표 기준으로 계산해야 텍스트와 딱 맞음
        var x = activeEl.offsetLeft;
        indicator.style.transform = "translateX(" + x + "px)";
        indicator.style.width = activeEl.offsetWidth + "px";
      } catch (e) {}
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
        updateIndicator(active);
      }
    }

    var sections = document.querySelectorAll(".snap-section");
    if (!sections.length) return;
    var ticking = false;

    function updateActiveFromViewport() {
      // 카운트다운 단계에서는 nav 자체가 숨겨지므로 계산 의미 없음
      if (document.body.getAttribute("data-phase") !== "main") return;

      var viewportCenter = window.innerHeight * 0.5;
      var closestId = "intro";
      var closestDistance = Infinity;

      for (var s = 0; s < sections.length; s++) {
        // 숨겨진 섹션은 제외
        if (sections[s].offsetParent === null) continue;
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

    // 초기 indicator 위치(메인 진입 직후에도 자연스럽게)
    window.setTimeout(function () {
      var current = nav.querySelector(".year-nav-link.is-active");
      if (current) updateIndicator(current);
    }, 0);
  }

  // -----------------------
  // Auto-detect portrait images
  // -----------------------
  function initImageOrientation() {
    var imgs = document.querySelectorAll(".year-gallery img");
    if (!imgs.length) return;

    function mark(img) {
      if (!img || !img.naturalWidth || !img.naturalHeight) return;
      if (img.naturalHeight > img.naturalWidth) img.classList.add("is-portrait");
    }

    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.complete) mark(img);
      img.addEventListener("load", function () {
        mark(this);
      });
    }
  }

  // -----------------------
  // BGM (YouTube IFrame)
  // -----------------------
  function initBgm() {
    var toggle = document.getElementById("bgmToggle");
    var mount = document.getElementById("yt-bgm");
    if (!toggle || !mount) return { playWithSound: function () {}, setUi: function () {} };

    var VIDEO_ID = "zCO9WiMItNI";
    var player = null;

    function setUi(mode) {
      toggle.setAttribute("aria-pressed", mode !== "off" ? "true" : "false");
      toggle.setAttribute("data-bgm-state", mode);
      if (mode === "off") toggle.setAttribute("aria-label", "배경음악 재생");
      else if (mode === "muted") toggle.setAttribute("aria-label", "배경음악 소리 켜기");
      else toggle.setAttribute("aria-label", "배경음악 소리 끄기");
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
          },
          onStateChange: function (ev) {
            var state = ev && typeof ev.data === "number" ? ev.data : null;
            var isPlaying = state === 1;
            var isPaused = state === 2;
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

    toggle.addEventListener("click", function () {
      if (!window.YT || !window.YT.Player) return;
      ensurePlayer();
      if (!player) return;
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
      } catch (e) {}
    });

    return { playWithSound: playWithSound, setUi: setUi, ensurePlayer: ensurePlayer };
  }

  // -----------------------
  // BOOM button 2s sound
  // -----------------------
  function initBoomSound() {
    var mount = document.getElementById("yt-boom");
    if (!mount) return { play2s: function () {} };

    var VIDEO_ID = "3qEK_vlDC4s";
    var player = null;
    var stopTimer = null;
    var isReady = false;
    var pendingPlay = false;
    var segments = [
      { start: 1.5, end: 2.5 },
      { start: 2.8, end: 3.5 },
    ];
    var isFirstBoom = true;
    function pickSegment() {
      if (isFirstBoom) {
        isFirstBoom = false;
        return segments[0]; // 첫 클릭은 2번 구간 고정
      }
      return segments[Math.floor(Math.random() * segments.length)];
    }


    function playSegment(seg) {
      if (!player || !seg) return;
      var durationMs = Math.max(100, Math.floor((seg.end - seg.start) * 1000));

      if (stopTimer) {
        window.clearTimeout(stopTimer);
        stopTimer = null;
      }
      try {
        player.unMute();
      } catch (e) {}
      try {
        player.seekTo(seg.start, true);
      } catch (e) {}
      player.playVideo();

      stopTimer = window.setTimeout(function () {
        try {
          player.pauseVideo();
        } catch (e) {}
      }, durationMs);
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
          start: 0,
        },
        events: {
          onReady: function () {
            isReady = true;
            try {
              player.setVolume(40);
            } catch (e) {}
            if (pendingPlay) {
              pendingPlay = false;
              var seg = pickSegment();
              try {
                playSegment(seg);
              } catch (e) {}
            }
          },
        },
      });
    }

    function play2s() {
      if (!window.YT || !window.YT.Player) return;
      ensurePlayer();
      if (!player) return;

      try {
        if (!isReady) {
          pendingPlay = true;
          return;
        }
        var seg = pickSegment();
        playSegment(seg);
      } catch (e) {}
    }

    return { play2s: play2s };
  }

  // -----------------------
  // Intro GIF overlay (og 썸네일은 index.html img/op.png)
  // -----------------------
  var INTRO_GIF_URL =
    "https://i.pinimg.com/originals/cb/33/13/cb33131c5474225ae9a6139a7c3a2404.gif";
  var INTRO_GIF_SHOW_MS = 2200;
  var INTRO_GIF_FADE_MS = 1200;

  function showIntroGif() {
    var overlay = document.createElement("div");
    overlay.className = "intro-gif-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var img = document.createElement("img");
    img.className = "intro-gif";
    img.src = INTRO_GIF_URL + "?t=" + Date.now();
    img.alt = "";
    img.loading = "eager";
    overlay.appendChild(img);
    document.body.appendChild(overlay);

    window.setTimeout(function () {
      if (!overlay) return;
      overlay.classList.add("is-fading");
    }, INTRO_GIF_SHOW_MS);

    window.setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, INTRO_GIF_SHOW_MS + INTRO_GIF_FADE_MS);
  }

  function revealEyebrowAfterGif() {
    var el = document.querySelector('[data-typewriter="true"]');
    var hero = document.getElementById("introHero");
    if (!el && !hero) return;

    if (hero) hero.classList.add("is-visible");
    if (!el) return;

    var fullText = (el.getAttribute("data-fulltext") || el.textContent || "").trim();
    if (!fullText) return;

    el.setAttribute("data-fulltext", fullText);
    el.textContent = "";
    el.classList.add("eyebrow-reveal");
    el.setAttribute("aria-label", fullText);

    // 전체 문구가 한 번에 나타나도록 처리
    window.setTimeout(function () {
      el.textContent = fullText;
      el.classList.add("is-visible");
    }, 60);
  }

  // -----------------------
  // Boot
  // -----------------------
  setPhase(PHASE_COUNTDOWN);

  var confetti = initConfetti();
  initYearNav();
  initImageOrientation();
  var bgm = initBgm();
  var boomSound = initBoomSound();

  // -----------------------
  // Letter modal (PIN)
  // -----------------------
  (function () {
    var btn = document.getElementById("letterBtn");
    var modal = document.getElementById("letterModal");
    var wrap = document.getElementById("pinWrap");
    var help = document.getElementById("pinHelp");
    var letter = document.getElementById("letterContent");
    if (!btn || !modal || !wrap) return;

    var PIN = "220103";
    var inputs = wrap.querySelectorAll(".pin-digit");
    var scrollLockY = 0;

    function lockBackgroundScroll() {
      scrollLockY = window.scrollY || window.pageYOffset || 0;
      document.documentElement.style.overflow = "hidden";
      document.body.classList.add("letter-modal-open");
      document.body.style.position = "fixed";
      document.body.style.top = "-" + scrollLockY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    }

    function unlockBackgroundScroll() {
      document.documentElement.style.overflow = "";
      document.body.classList.remove("letter-modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollLockY);
    }

    function open() {
      lockBackgroundScroll();
      modal.setAttribute("aria-hidden", "false");
      if (help) {
        help.classList.remove("is-error");
        // help.textContent = "6자리 숫자를 입력해줘";
      }
      if (letter) letter.hidden = true;
      for (var i = 0; i < inputs.length; i++) inputs[i].value = "";
      if (inputs[0]) inputs[0].focus();
    }

    function close() {
      modal.setAttribute("aria-hidden", "true");
      unlockBackgroundScroll();
    }

    function getValue() {
      var s = "";
      for (var i = 0; i < inputs.length; i++) s += String(inputs[i].value || "");
      return s;
    }

    function check() {
      var v = getValue();
      if (v.length !== 6) return;
      if (v === PIN) {
        if (help) {
          help.classList.remove("is-error");
          // help.textContent = "열렸어.";
        }
        if (letter) letter.hidden = false;
        return;
      }
      if (help) {
        help.classList.add("is-error");
        // help.textContent = "비밀번호가 아니야.";
      }
      for (var i = 0; i < inputs.length; i++) inputs[i].value = "";
      if (inputs[0]) inputs[0].focus();
    }

    btn.addEventListener("click", open);

    modal.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute("data-modal-close") === "true") close();
    });

    window.addEventListener("keydown", function (ev) {
      if (modal.getAttribute("aria-hidden") === "true") return;
      if (ev.key === "Escape") close();
    });

    function focusNext(idx) {
      if (idx + 1 < inputs.length) inputs[idx + 1].focus();
    }
    function focusPrev(idx) {
      if (idx - 1 >= 0) inputs[idx - 1].focus();
    }

    for (var i = 0; i < inputs.length; i++) {
      (function (idx) {
        var input = inputs[idx];
        input.addEventListener("input", function () {
          var v = String(input.value || "");
          v = v.replace(/\D/g, "");
          input.value = v.slice(-1);
          if (input.value) focusNext(idx);
          check();
        });
        input.addEventListener("keydown", function (ev) {
          if (ev.key === "Backspace" && !input.value) {
            focusPrev(idx);
          }
          if (ev.key === "ArrowLeft") focusPrev(idx);
          if (ev.key === "ArrowRight") focusNext(idx);
        });
        input.addEventListener("paste", function (ev) {
          var text = (ev.clipboardData && ev.clipboardData.getData("text")) || "";
          var digits = String(text).replace(/\D/g, "").slice(0, 6);
          if (!digits) return;
          ev.preventDefault();
          for (var j = 0; j < inputs.length; j++) inputs[j].value = digits[j] || "";
          check();
        });
      })(i);
    }
  })();

  window.__app = window.__app || {};
  window.__app.startMain = function () {
    // 사용자가 클릭한 순간에 "소리 재생"을 최대한 시도
    try {
      bgm.playWithSound();
    } catch (e) {}

    setPhase(PHASE_MAIN);
    showIntroGif();

    // 메인 인트로 섹션으로 이동
    var intro = document.getElementById("intro");
    if (intro && typeof intro.scrollIntoView === "function") {
      intro.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      location.hash = "#intro";
    }

    // 폭죽
    try {
      if (confetti && !confetti.reduceMotion) confetti.burst();
    } catch (e) {}

    // GIF가 끝난 뒤 문구 전체가 사르르 나타남
    window.setTimeout(function () {
      revealEyebrowAfterGif();
    }, INTRO_GIF_SHOW_MS + INTRO_GIF_FADE_MS + 80);
  };

  // BOOM 버튼 연결
  (function () {
    var btn = document.getElementById("burst");
    if (!btn || !confetti) return;
    btn.addEventListener("click", function () {
      confetti.burst();
      boomSound.play2s();
    });
  })();
})();

