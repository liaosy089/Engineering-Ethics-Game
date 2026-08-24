// ============================================================
// 誠信抉擇 - 遊戲引擎（場景載入 / 可走動範圍 / 立牌繪圖）
// ============================================================

const CANVAS_W = 720;
const CANVAS_H = 468;

const imageCache = {};
function loadImage(src) {
  if (!src) return null;
  if (imageCache[src]) return imageCache[src];
  const img = new Image();
  img.loaded = false;
  img.failed = false;
  img.onload = () => { img.loaded = true; };
  img.onerror = () => { img.failed = true; };
  img.src = src;
  imageCache[src] = img;
  return img;
}

// 從圖片四個邊界開始做 flood fill，只把「跟邊界相連」的近白色像素去掉。
// 這樣角色身上的白襯衫、白鞋子（沒有連到邊界）不會被誤判成背景挖空。
function removeWhiteBackgroundFloodFill(imgData, width, height, threshold = 235) {
  const d = imgData.data;
  const isNearWhite = (idx) => {
    const p = idx * 4;
    return (d[p] + d[p + 1] + d[p + 2]) / 3 > threshold;
  };

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let qHead = 0, qTail = 0;

  const pushIfWhite = (idx) => {
    if (!visited[idx] && isNearWhite(idx)) {
      visited[idx] = 1;
      queue[qTail++] = idx;
    }
  };

  for (let x = 0; x < width; x++) {
    pushIfWhite(x);
    pushIfWhite((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushIfWhite(y * width);
    pushIfWhite(y * width + width - 1);
  }

  while (qHead < qTail) {
    const idx = queue[qHead++];
    d[idx * 4 + 3] = 0;
    const x = idx % width;
    const y = (idx / width) | 0;
    if (x > 0) pushIfWhite(idx - 1);
    if (x < width - 1) pushIfWhite(idx + 1);
    if (y > 0) pushIfWhite(idx - width);
    if (y < height - 1) pushIfWhite(idx + width);
  }

  // 邊緣羽化：緊鄰去背區域、但沒被判定為近白色的像素，淡化一點避免生硬鋸齒。
  for (let i = 0; i < visited.length; i++) {
    if (visited[i] || d[i * 4 + 3] === 0) continue;
    const x = i % width, y = (i / width) | 0;
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < width - 1 ? i + 1 : -1,
      y > 0 ? i - width : -1,
      y < height - 1 ? i + width : -1,
    ];
    if (neighbors.some((n) => n >= 0 && visited[n])) {
      d[i * 4 + 3] = Math.round(d[i * 4 + 3] * 0.5);
    }
  }
}

// 全身立繪多半是白底圖，這裡在載入後自動把接近白色的像素去掉，
// 讓角色可以直接「站」在場景裡，不用另外去背。
function loadSpriteChromaKeyed(src) {
  if (!src) return null;
  const cacheKey = "chroma:" + src;
  if (imageCache[cacheKey]) return imageCache[cacheKey];

  const outImg = new Image();
  outImg.loaded = false;
  outImg.failed = false;
  imageCache[cacheKey] = outImg;

  const raw = new Image();
  raw.onload = () => {
    try {
      const cvs = document.createElement("canvas");
      cvs.width = raw.width;
      cvs.height = raw.height;
      const cctx = cvs.getContext("2d");
      cctx.drawImage(raw, 0, 0);
      const imgData = cctx.getImageData(0, 0, cvs.width, cvs.height);
      removeWhiteBackgroundFloodFill(imgData, cvs.width, cvs.height);
      cctx.putImageData(imgData, 0, 0);
      const d = imgData.data;

      // 圖檔通常上下左右會留白，這裡找出角色實際內容的邊界，
      // 之後畫立牌只裁這個範圍，腳底才會準確貼齊地面。
      let minX = cvs.width, minY = cvs.height, maxX = -1, maxY = -1;
      const alphaThreshold = 20;
      for (let py = 0; py < cvs.height; py++) {
        const rowStart = py * cvs.width * 4;
        for (let px = 0; px < cvs.width; px++) {
          if (d[rowStart + px * 4 + 3] > alphaThreshold) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }
      }
      outImg.contentBox = maxX >= minX && maxY >= minY
        ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
        : { x: 0, y: 0, w: cvs.width, h: cvs.height };

      outImg.width = raw.width;
      outImg.height = raw.height;
      outImg.onload = () => { outImg.loaded = true; };
      outImg.src = cvs.toDataURL();
    } catch (err) {
      outImg.failed = true;
    }
  };
  raw.onerror = () => { outImg.failed = true; };
  raw.src = src;
  return outImg;
}

function loadScene(sceneId) {
  const def = SCENES[sceneId];
  const bg = loadImage(def.background);
  const npcs = def.npcs.map((n) => ({
    ...n,
    portrait: loadImage(PORTRAITS[n.id]),
    sprite: loadSpriteChromaKeyed(SPRITES[n.id]),
  }));
  const objects = (def.objects || []).map((o) => ({ ...o }));
  return {
    id: sceneId,
    label: def.label,
    bg,
    floor: def.floor,
    playerSpawn: def.playerSpawn,
    exit: def.exit,
    npcs,
    objects,
  };
}

function clampToFloor(scene, x, y) {
  const f = scene.floor;
  const cy = Math.max(f.yTop, Math.min(f.yBottom, y));
  const t = (cy - f.yTop) / (f.yBottom - f.yTop || 1);
  const xLeft = f.topLeftX + t * (f.bottomLeftX - f.topLeftX);
  const xRight = f.topRightX + t * (f.bottomRightX - f.topRightX);
  const cx = Math.max(xLeft, Math.min(xRight, x));
  return { x: cx, y: cy };
}

function depthScale(scene, y) {
  const f = scene.floor;
  const t = (y - f.yTop) / (f.yBottom - f.yTop || 1);
  return 0.85 + Math.max(0, Math.min(1, t)) * 0.3;
}

function findNearestEntity(scene, px, py, range) {
  let best = null, bestDist = Infinity;
  const all = [
    ...scene.npcs.map((n) => ({ ...n, kind: "npc" })),
    ...scene.objects.map((o) => ({ ...o, kind: "object" })),
  ];
  for (const ent of all) {
    const d = Math.hypot(ent.x - px, ent.y - py);
    if (d < range && d < bestDist) { best = ent; bestDist = d; }
  }
  return best;
}

// 滑鼠/觸控直接點角色或物件：不管玩家站多遠，點到就直接互動，
// 判定範圍用跟繪製時同一套 depthScale/standeeTopOffset，站牌畫多大、判定範圍就多大。
function findEntityAtPoint(scene, px, py) {
  let best = null, bestDist = Infinity;
  const all = [
    ...scene.npcs.map((n) => ({ ...n, kind: "npc" })),
    ...scene.objects.map((o) => ({ ...o, kind: "object" })),
  ];
  for (const ent of all) {
    const scale = depthScale(scene, ent.y);
    const halfW = (ent.kind === "object" ? 30 : 48) * scale;
    const topY = ent.y - standeeTopOffset(ent, scale) - 10;
    const bottomY = ent.y + 12 * scale;
    if (px < ent.x - halfW || px > ent.x + halfW || py < topY || py > bottomY) continue;
    const d = Math.hypot(ent.x - px, ent.y - py);
    if (d < bestDist) { best = ent; bestDist = d; }
  }
  return best;
}

function isInExit(scene, x, y) {
  const e = scene.exit;
  return x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h;
}

// 滑鼠/觸控直接點「離開」牌子或出口熱區本身：牌子畫在熱區正上方（見
// renderSceneBackground 的 label 版位計算），這裡把兩塊合成一個判定範圍，
// 不用真的走進熱區也能點擊離開。
function isPointNearExit(scene, px, py) {
  const e = scene.exit;
  const labelBottom = e.y - 8;
  const labelTop = labelBottom - 24 - 10;
  if (px >= e.x - 10 && px <= e.x + e.w + 10 && py >= labelTop && py <= e.y + e.h) return true;
  return false;
}

// ---------------- Rendering ----------------

const FALLBACK_BG = "#2a3040";

function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const srcRatio = img.width / img.height;
  const dstRatio = dw / dh;
  let sx, sy, sw, sh;
  if (srcRatio > dstRatio) {
    sh = img.height;
    sw = sh * dstRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / dstRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function renderSceneBackground(ctx, scene, pulse) {
  if (scene.bg && scene.bg.loaded && !scene.bg.failed) {
    drawImageCover(ctx, scene.bg, 0, 0, CANVAS_W, CANVAS_H);
  } else {
    ctx.fillStyle = FALLBACK_BG;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // 淡淡標出可走動範圍，方便還沒有背景圖時也看得出場地
    const f = scene.floor;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.moveTo(f.topLeftX, f.yTop);
    ctx.lineTo(f.topRightX, f.yTop);
    ctx.lineTo(f.bottomRightX, f.yBottom);
    ctx.lineTo(f.bottomLeftX, f.yBottom);
    ctx.closePath();
    ctx.fill();
  }

  const e = scene.exit;
  const glow = 0.5 + 0.5 * pulse;
  ctx.fillStyle = `rgba(126, 200, 255, ${0.2 + 0.14 * glow})`;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = `rgba(126, 200, 255, ${0.65 + 0.35 * glow})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([9, 6]);
  ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.setLineDash([]);

  // 用跟 NPC 名牌一樣的「深底白字」小牌子做離開標示，不管背景圖亮暗都看得清楚，
  // 加個門的 icon 讓它比純文字更醒目、一眼就認得出是出口。
  const label = "🚪 離開";
  ctx.font = "bold 15px 'Noto Sans TC', sans-serif";
  const textW = ctx.measureText(label).width;
  const padX = 10, boxH = 24;
  const boxW = textW + padX * 2;
  const cx = e.x + e.w / 2;
  const cy = e.y - boxH / 2 - 8;
  ctx.fillStyle = `rgba(20, 60, 90, ${0.78 + 0.2 * glow})`;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = `rgba(126, 200, 255, ${0.8 + 0.2 * glow})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
  }
  ctx.fillStyle = "#eaf6ff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 1);
}

function renderStandee(ctx, x, y, sprite, portrait, scale, flip, fallbackColor) {
  if (sprite && sprite.loaded && !sprite.failed) {
    renderSpriteStandee(ctx, x, y, sprite, scale, flip);
  } else {
    renderPortraitStandee(ctx, x, y, portrait, scale, flip, fallbackColor);
  }
}

// 有全身立繪：以腳底 (x,y) 為錨點站立，只裁角色實際內容範圍（去掉圖檔上下左右的留白）。
function renderSpriteStandee(ctx, x, y, sprite, scale, flip) {
  const box = sprite.contentBox || { x: 0, y: 0, w: sprite.width, h: sprite.height };
  const targetH = 130 * scale;
  const w = targetH * (box.w / box.h);
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * scale, w * 0.32, w * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y - targetH);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sprite, box.x, box.y, box.w, box.h, -w / 2, 0, w, targetH);
  ctx.restore();
}

// 沒有立繪時退回頭像圓牌。
function renderPortraitStandee(ctx, x, y, portrait, scale, flip, fallbackColor) {
  const baseSize = 60 * scale;
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + baseSize * 0.42, baseSize * 0.4, baseSize * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  const cy = y - baseSize * 0.3;
  ctx.beginPath();
  ctx.arc(x, cy, baseSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  if (portrait && portrait.loaded && !portrait.failed) {
    ctx.translate(x, cy);
    if (flip) ctx.scale(-1, 1);
    ctx.translate(-x, -cy);
    const size = baseSize;
    ctx.drawImage(portrait, x - size / 2, cy - size / 2, size, size);
  } else {
    ctx.fillStyle = fallbackColor || "#7ea8ff";
    ctx.fillRect(x - baseSize / 2, cy - baseSize / 2, baseSize, baseSize);
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function renderObjectIcon(ctx, obj, scale) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(obj.x, obj.y + 14 * scale, 20 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  const r = 24 * scale;
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(20, 16, 10, 0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `${26 * scale}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(obj.icon || "❔", obj.x, obj.y);
  ctx.restore();
}

// 站立立牌/立繪的「頭頂」距離錨點 y 多遠，供名牌與互動提示共用。
function standeeTopOffset(ent, scale) {
  const hasSprite = ent.sprite && ent.sprite.loaded && !ent.sprite.failed;
  return hasSprite ? 130 * scale : 48 * scale;
}

function renderNameLabel(ctx, x, topY, name) {
  ctx.font = "11px 'Noto Sans TC', sans-serif";
  const textW = ctx.measureText(name).width;
  const padX = 8, h = 17;
  const w = textW + padX * 2;
  const cy = topY - h / 2 - 4;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x - w / 2, cy - h / 2, w, h, 4);
    ctx.fill();
  } else {
    ctx.fillRect(x - w / 2, cy - h / 2, w, h);
  }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name, x, cy + 1);
}

function renderInteractPrompt(ctx, scene, ent, time) {
  if (!ent) return;
  const scale = depthScale(scene, ent.y);
  const bob = Math.sin(time / 200) * 3;
  const hasSprite = ent.sprite && ent.sprite.loaded && !ent.sprite.failed;
  const offset = hasSprite ? 130 * scale + 16 : 62 * scale;
  const arrowY = ent.y - offset + bob;

  // 跳動的箭頭，比單一個小圖示更容易第一眼注意到「這裡可以互動」。
  ctx.font = "20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔽", ent.x, arrowY);

  // 文字提示：「按 E　與OO對話」／「按 E　查看OO」，跟著箭頭一起浮動。
  const verb = ent.kind === "object" ? "查看" : "對話";
  const label = `按 E　${verb === "對話" ? "與" : ""}${ent.name}${verb}`;
  ctx.font = "bold 13px 'Noto Sans TC', sans-serif";
  const textW = ctx.measureText(label).width;
  const padX = 10, boxH = 22;
  const boxW = textW + padX * 2;
  const cy = arrowY - 18;
  ctx.fillStyle = "rgba(20, 20, 24, 0.8)";
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(ent.x - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 214, 110, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillRect(ent.x - boxW / 2, cy - boxH / 2, boxW, boxH);
  }
  ctx.fillStyle = "#ffd66e";
  ctx.fillText(label, ent.x, cy + 1);
}
