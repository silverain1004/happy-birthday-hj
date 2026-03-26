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
