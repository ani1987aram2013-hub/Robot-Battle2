
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const keys = {};
const MAX_LEVEL = 20;
const bossLevels = [5, 10, 15, 20];

let player, enemies, bullets, particles;
let level = 1;
let health = 100;
let coins = 0;
let score = 0;
let weapon = 1;
let armor = 0;
let speedLevel = 0;
let running = false;
let paused = false;
let stageComplete = false;
let spawnTimer = 0;
let lastShot = 0;
let frame = 0;
let moveDirection = 0;
let firing = false;
let animationId = null;

function resetStage() {
  player = {
    x: 100,
    y: 390,
    w: 48,
    h: 78,
    speed: 4 + speedLevel * 0.6
  };

  enemies = [];
  bullets = [];
  particles = [];
  spawnTimer = 0;
  stageComplete = false;

  const isBoss = bossLevels.includes(level);
  const count = isBoss ? 1 : 3 + Math.min(level, 7);

  for (let i = 0; i < count; i++) {
    const hp = isBoss ? 18 + level * 4 : 2 + Math.floor(level / 4);

    enemies.push({
      x: isBoss ? 730 : 550 + i * 100,
      y: isBoss ? 300 : 405,
      w: isBoss ? 105 : 48,
      h: isBoss ? 145 : 78,
      hp,
      maxHp: hp,
      speed: isBoss ? 0.7 + level * 0.025 : 0.8 + level * 0.055,
      boss: isBoss,
      cooldown: 100 + Math.random() * 100
    });
  }

  updateUI();
}

function updateUI() {
  $("health").textContent = health;
  $("coins").textContent = coins;
  $("level").textContent = `${level} / ${MAX_LEVEL}`;
  $("score").textContent = score;

  $("healthBar").style.width = `${health}%`;

  const enemy = enemies?.[0];
  $("enemyLabel").textContent = enemy?.boss ? "BOSS" : "Թշնամի";
  $("enemyBar").style.width = enemy
    ? `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`
    : "0%";

  $("shopCoins").textContent = coins;
  $("weaponPrice").textContent = `🪙 ${weapon * 30}`;
  $("armorPrice").textContent = `🪙 ${(armor + 1) * 25}`;
  $("speedPrice").textContent = `🪙 ${(speedLevel + 1) * 35}`;
  $("healPrice").textContent = "🪙 20";
}

function robot(x, y, scale, color, boss = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = color;
  ctx.shadowBlur = boss ? 22 : 10;

  // Գլուխ
  ctx.fillStyle = "#222d3b";
  ctx.fillRect(8, 0, 32, 25);

  ctx.fillStyle = color;
  ctx.fillRect(12, 5, 24, 6);

  // Լուսավորվող աչքեր
  ctx.fillStyle = boss ? "#ff182f" : "#69f5ff";
  ctx.fillRect(13, 13, 7, 5);
  ctx.fillRect(28, 13, 7, 5);

  // Մետաղական իրան
  ctx.fillStyle = "#34485c";
  ctx.fillRect(4, 28, 40, 30);

  ctx.fillStyle = color;
  ctx.fillRect(10, 33, 28, 5);

  ctx.fillStyle = "#17212e";
  ctx.fillRect(17, 41, 14, 11);

  // Ձեռքեր
  ctx.fillStyle = "#64788c";
  ctx.fillRect(-4, 30, 8, 25);
  ctx.fillRect(44, 30, 8, 25);

  ctx.fillStyle = color;
  ctx.fillRect(-3, 48, 7, 8);
  ctx.fillRect(44, 48, 7, 8);

  // Ոտքեր
  ctx.fillStyle = "#263747";
  ctx.fillRect(8, 58, 11, 16);
  ctx.fillRect(29, 58, 11, 16);

  ctx.fillStyle = color;
  ctx.fillRect(5, 70, 16, 5);
  ctx.fillRect(27, 70, 16, 5);

  ctx.restore();
}

function background() {
  const sky = ctx.createLinearGradient(0, 0, 0, 540);
  sky.addColorStop(0, "#101d32");
  sky.addColorStop(0.65, "#26364b");
  sky.addColorStop(1, "#080e18");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 540);

  // Լուսին
  ctx.fillStyle = "#9eafc4";
  ctx.beginPath();
  ctx.arc(770, 100, 34, 0, Math.PI * 2);
  ctx.fill();

  // Հեռավոր քաղաքի շենքեր
  for (let i = 0; i < 13; i++) {
    const x = i * 82;
    const h = 80 + (i * 47 % 130);

    ctx.fillStyle = i % 2 ? "#17283b" : "#1c2b3e";
    ctx.fillRect(x, 400 - h, 65, h);

    ctx.fillStyle = "#f8b65b";
    for (let wy = 420 - h; wy < 395; wy += 19) {
      for (let wx = x + 10; wx < x + 60; wx += 20) {
        ctx.globalAlpha = 0.35 + Math.random() * 0.25;
        ctx.fillRect(wx, wy, 5, 7);
      }
    }
  }

  ctx.globalAlpha = 1;

  // Արենայի հատակ
  ctx.fillStyle = "#111d2b";
  ctx.fillRect(0, 470, 960, 70);

  ctx.strokeStyle = "#176182";
  ctx.lineWidth = 2;

  for (let x = 0; x <= 960; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 470);
    ctx.lineTo(x - 25, 540);
    ctx.stroke();
  }

  ctx.fillStyle = "#e3a64a";
  ctx.fillRect(0, 468, 960, 4);

  // Մակարդակի ցուցիչ
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px Arial";
  ctx.fillText(`SECTOR ${String(level).padStart(2, "0")}`, 20, 30);
}

function shoot() {
  const now = performance.now();
  if (now - lastShot < Math.max(100, 330 - weapon * 30)) return;

  lastShot = now;

  bullets.push({
    x: player.x + player.w,
    y: player.y + 36,
    speed: 10 + weapon,
    damage: weapon,
    size: 5 + weapon
  });
}

function explosion(x, y, color) {
  for (let i = 0; i < 14; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 22,
      color
    });
  }
}

function update() {
  if (!running || paused || stageComplete) return;

  frame++;

  const direction =
    (keys.ArrowRight || keys.d || moveDirection === 1 ? 1 : 0) -
    (keys.ArrowLeft || keys.a || moveDirection === -1 ? 1 : 0);

  player.x += direction * player.speed;
  player.x = Math.max(5, Math.min(960 - player.w - 5, player.x));

  if (keys[" "] || firing) shoot();

  bullets.forEach(b => b.x += b.speed);
  bullets = bullets.filter(b => b.x < 980);

  for (const enemy of enemies) {
    enemy.cooldown--;

    // Թշնամիները մոտենում են խաղացողին
    if (!enemy.boss) {
      enemy.x -= enemy.speed;
    } else {
      enemy.x += enemy.x > 620 ? -0.15 : 0.15;
    }

    // Թշնամու կրակոց
    if (enemy.cooldown <= 0) {
      bullets.push({
        x: enemy.x,
        y: enemy.y + enemy.h * 0.5,
        speed: -(enemy.boss ? 6 : 4),
        damage: enemy.boss ? 12 : 5,
        size: enemy.boss ? 10 : 6,
        enemyShot: true
      });

      enemy.cooldown = enemy.boss ? 65 : 130;
    }

    // Թշնամին հասել է խաղացողին
    if (
      enemy.x < player.x + player.w &&
      enemy.x + enemy.w > player.x &&
      Math.abs(enemy.y - player.y) < 100
    ) {
      enemy.x = -500;
      health -= Math.max(2, 10 - armor * 2);
      explosion(player.x + 20, player.y + 30, "#ff394d");
    }
  }

  for (const b of bullets) {
    if (b.enemyShot) {
      if (
        b.x < player.x + player.w &&
        b.x + b.size > player.x &&
        b.y > player.y &&
        b.y < player.y + player.h
      ) {
        b.hit = true;
        health -= Math.max(1, b.damage - armor * 2);
        explosion(b.x, b.y, "#ff394d");
      }
      continue;
    }

    for (const enemy of enemies) {
      if (
        b.x + b.size > enemy.x &&
        b.x < enemy.x + enemy.w &&
        b.y > enemy.y &&
        b.y < enemy.y + enemy.h &&
        !b.hit
      ) {
        b.hit = true;
        enemy.hp -= b.damage;
        explosion(b.x, b.y, "#00eaff");

        if (enemy.hp <= 0) {
          enemy.x = -500;
          score += enemy.boss ? 250 : 25;
          coins += enemy.boss ? 100 : 10;
          explosion(enemy.x + 20, enemy.y + 30, "#ffad42");
        }
      }
    }
  }

  bullets = bullets.filter(b => !b.hit);
  enemies = enemies.filter(e => e.x + e.w > -50);

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }

  particles = particles.filter(p => p.life > 0);

  if (health <= 0) {
    health = 0;
    running = false;
    showMessage("ԽԱՂԸ ԱՎԱՐՏՎԵՑ", "Փորձիր նորից։ Քո միավորները՝ " + score);
    $("startBtn").textContent = "ՆՈՐԻՑ ՍԿՍԵԼ";
  } else if (enemies.length === 0) {
    stageComplete = true;
    running = false;

    if (level >= MAX_LEVEL) {
      showMessage("🏆 ԴՈՒ ՀԱՂԹԵՑԻՐ!", "Դու հաղթահարեցիր բոլոր 20 մակարդակները։");
      $("startBtn").textContent = "ՆՈՐ ԽԱՂ";
    } else {
      coins += 20;
      showMessage(
        `ՄԱԿԱՐԴԱԿ ${level}-Ը ՀԱՂԹԱՀԱՐՎԱԾ Է!`,
        `Ստացար 20 բոնուսային մետաղադրամ։ Պատրաստվիր ${level + 1}-րդ մակարդակին։`
      );
      $("startBtn").textContent = "ՀԱՋՈՐԴ ՄԱԿԱՐԴԱԿ";
    }
  }

  updateUI();
}

function draw() {
  background();

  // Մարտադաշտի մառախուղ
  const fog = ctx.createLinearGradient(0, 360, 0, 470);
  fog.addColorStop(0, "#6ca7c500");
  fog.addColorStop(1, "#6ca7c522");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 350, 960, 120);

  if (player) {
    robot(player.x, player.y, 1, "#00dfff");

    // Կապույտ էներգետիկ հրացան
    ctx.fillStyle = "#718da6";
    ctx.fillRect(player.x + 35, player.y + 31, 27, 12);
  }

  for (const enemy of enemies || []) {
    robot(
      enemy.x,
      enemy.y,
      enemy.boss ? 1.75 : 1,
      enemy.boss ? "#ff263f" : "#ff4a55",
      enemy.boss
    );

    if (enemy.boss) {
      ctx.fillStyle = "#400b18";
      ctx.fillRect(enemy.x - 10, enemy.y - 22, 130, 9);
      ctx.fillStyle = "#ff273e";
      ctx.fillRect(
        enemy.x - 10,
        enemy.y - 22,
        130 * Math.max(0, enemy.hp / enemy.maxHp),
        9
      );
    }
  }

  for (const b of bullets || []) {
    ctx.save();
    ctx.shadowColor = b.enemyShot ? "#ff273e" : "#00efff";
    ctx.shadowBlur = 16;
    ctx.fillStyle = b.enemyShot ? "#ff394d" : "#c8ffff";
    ctx.fillRect(b.x, b.y, 19, b.size);
    ctx.restore();
  }

  for (const p of particles || []) {
    ctx.globalAlpha = Math.max(0, p.life / 22);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  }

  ctx.globalAlpha = 1;

  if (paused) {
    ctx.fillStyle = "#030712cc";
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = "#00eaff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ԴԱԴԱՐ", 480, 270);
    ctx.textAlign = "left";
  }
}

function loop() {
  update();
  draw();

  if (running || paused) {
    animationId = requestAnimationFrame(loop);
  } else {
    animationId = null;
  }
}

function showMessage(title, text) {
  $("message").classList.remove("hidden");
  $("messageTitle").textContent = title;
  $("messageText").textContent = text;
}

function startStage() {
  if (level > MAX_LEVEL) level = 1;

  if (health <= 0 || level === 1 && score === 0 && coins === 0) {
    health = 100;
    score = 0;
    coins = 0;
    weapon = 1;
    armor = 0;
    speedLevel = 0;
  }

  resetStage();
  $("message").classList.add("hidden");
  running = true;
  paused = false;

  if (animationId === null) loop();
}

$("startBtn").addEventListener("click", () => {
  if (health <= 0 || level > MAX_LEVEL) {
    level = 1;
    health = 100;
    score = 0;
    coins = 0;
    weapon = 1;
    armor = 0;
    speedLevel = 0;
  } else if (stageComplete && level < MAX_LEVEL) {
    level++;
  }

  startStage();
});

$("pauseBtn").addEventListener("click", () => {
  if (!running && !paused) return;

  paused = !paused;
  $("pauseBtn").textContent = paused ? "▶ ՇԱՐՈՒՆԱԿԵԼ" : "⏸ ԴԱԴԱՐ";

  if (paused) {
    draw();
  } else if (animationId === null) {
    loop();
  }
});

$("shopBtn").addEventListener("click", () => {
  $("shop").classList.toggle("hidden");
  updateUI();
});

$("closeShop").addEventListener("click", () => {
  $("shop").classList.add("hidden");
});

document.querySelectorAll("[data-upgrade]").forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.upgrade;

    const prices = {
      weapon: weapon * 30,
      armor: (armor + 1) * 25,
      speed: (speedLevel + 1) * 35,
      heal: 20
    };

    const price = prices[type];

    if (coins < price) {
      showMessage("ԲԱՎԱՐԱՐ ՄԵՏԱՂԱԴՐԱՄ ՉԿԱ", "Հաղթիր ավելի շատ թշնամիների և փորձիր կրկին։");
      return;
    }

    if (type === "heal" && health >= 100) {
      showMessage("ԿՅԱՆՔԴ ԼԻ Է", "Վերականգնելու կարիք չկա։");
      return;
    }

    coins -= price;

    if (type === "weapon") weapon++;
    if (type === "armor") armor++;
    if (type === "speed") {
      speedLevel++;
      if (player) player.speed = 4 + speedLevel * 0.6;
    }
    if (type === "heal") health = Math.min(100, health + 35);

    updateUI();
  });
});

document.addEventListener("keydown", e => {
  keys[e.key] = true;

  if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key.toLowerCase() === "p") {
    $("pauseBtn").click();
  }
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

function bindHold(id, onDown, onUp) {
  const button = $(id);

  button.addEventListener("pointerdown", e => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    onDown();
  });

  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, onUp);
  }
}

bindHold("leftBtn", () => moveDirection = -1, () => {
  if (moveDirection === -1) moveDirection = 0;
});

bindHold("rightBtn", () => moveDirection = 1, () => {
  if (moveDirection === 1) moveDirection = 0;
});

bindHold("fireBtn", () => firing = true, () => firing = false);

health = 100;
coins = 0;
score = 0;
level = 1;
resetStage();
draw();

