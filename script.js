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
