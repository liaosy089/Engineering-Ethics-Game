// ============================================================
// 誠信抉擇 - 遊戲主控（狀態 / 輸入 / 迴圈 / UI / 對話流程）
// ============================================================

let state = null;

// 兩個案件的通關進度（存在 localStorage，重新整理、關掉分頁再回來都還在；
// 跟文字版共用同一把 key，同一台裝置上不管玩走動版還是文字版，進度都算數）。
function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("cs_progress")) || {};
  } catch (e) {
    return {};
  }
}
function saveProgress() {
  try {
    localStorage.setItem("cs_progress", JSON.stringify(progress));
  } catch (e) {}
}
let progress = loadProgress();

let keys = {};
let keysEdge = {};
let transitionCooldown = 0;
const gameCanvasEl = document.getElementById("gameCanvas");
const ctx = gameCanvasEl.getContext("2d");

// 畫布的 CSS 顯示尺寸是彈性的（手機縮小、桌機放大到 1100px 寬），
// 但實際繪圖解析度固定拉高 2 倍，畫面放大時才不會糊掉。
const CANVAS_RENDER_SCALE = 2;
gameCanvasEl.width = CANVAS_W * CANVAS_RENDER_SCALE;
gameCanvasEl.height = CANVAS_H * CANVAS_RENDER_SCALE;
ctx.scale(CANVAS_RENDER_SCALE, CANVAS_RENDER_SCALE);

// ---------------- 效果輔助函式（供 data.js 對話節點呼叫）----------------

function addIntegrity(s, delta) {
  s.integrity = Math.max(0, Math.min(100, s.integrity + delta));
}
function addItem(s, itemId) {
  if (!s.items.includes(itemId)) s.items.push(itemId);
}
function advanceQuestTo(s, stepId) {
  const steps = CASES[s.caseId].questSteps;
  const idx = steps.findIndex((q) => q.id === stepId);
  if (idx > s.quest.stepIndex) s.quest.stepIndex = idx;
}
function triggerEnding(s) {
  if (s.caseId === "case1") {
    if (s.flags.giftOffered && !s.flags.giftRegistered) {
      addIntegrity(s, -25);
      s.flags.giftUnregisteredPenalty = true;
    }
    s.ended = true;
    s.endingKey = computeEndingKey(s);
  } else {
    if (s.flags.vendorInvited && !s.flags.inviteRegistered) {
      addIntegrity(s, -25);
      s.flags.inviteUnregisteredPenalty = true;
    }
    s.ended = true;
    s.endingKey = computeEndingKey2(s);
  }
}

// ---------------- 初始化 / 地圖切換 ----------------

function initState(caseId) {
  const scene = loadScene("office");
  state = {
    caseId,
    currentMapId: "office",
    map: scene,
    player: {
      x: scene.playerSpawn.x, y: scene.playerSpawn.y, dir: "down", moving: false,
      portrait: loadImage(PORTRAITS.player),
      sprite: loadSpriteChromaKeyed(SPRITES.player),
    },
    integrity: 70,
    flags: {},
    items: [],
    quest: { stepIndex: 0 },
    dialogue: null,
    ended: false,
    endingKey: null,
  };
}

function resolveExitTarget(s) {
  const t = s.map.exit.target;
  return t === "case_field" ? CASES[s.caseId].fieldMap : t;
}

function switchMap(mapId) {
  state.currentMapId = mapId;
  state.map = loadScene(mapId);
  state.player.x = state.map.playerSpawn.x;
  state.player.y = state.map.playerSpawn.y;
  transitionCooldown = 20;

  const steps = CASES[state.caseId].questSteps;
  const fieldMapId = CASES[state.caseId].fieldMap;
  if (mapId === fieldMapId && !state.flags.enteredField) {
    state.flags.enteredField = true;
    advanceQuestTo(state, steps[2].id);
  }
  if (mapId === "office" && state.flags.enteredField) {
    advanceQuestTo(state, steps[3].id);
  }
  updateMapUI();
  updateAllUI();
}

// ---------------- 輸入 ----------------

const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "e"];

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (MOVE_KEYS.includes(k)) e.preventDefault();
  if (!keys[k]) keysEdge[k] = true;
  keys[k] = true;

  if (state && state.dialogue) {
    if (k === " " || k === "enter" || k === "e") handleDialogueAdvance();
    if (["1", "2", "3", "4"].includes(k)) handleChoiceKey(parseInt(k, 10) - 1);
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function updateMovement() {
  let dx = 0, dy = 0, mag = 1;

  if (touchJoystick.active) {
    dx = touchJoystick.dx;
    dy = touchJoystick.dy;
    mag = Math.min(1, Math.hypot(dx, dy));
  } else {
    if (keys["w"] || keys["arrowup"]) dy = -1;
    if (keys["s"] || keys["arrowdown"]) dy = 1;
    if (keys["a"] || keys["arrowleft"]) dx = -1;
    if (keys["d"] || keys["arrowright"]) dx = 1;
  }

  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;

  state.player.moving = mag > 0.08 && (dx !== 0 || dy !== 0);
  if (state.player.moving) {
    if (dx < -0.3) state.player.dir = "left";
    else if (dx > 0.3) state.player.dir = "right";
    else if (dy < 0) state.player.dir = "up";
    else if (dy > 0) state.player.dir = "down";

    const speed = 3.8 * mag;
    const nx = state.player.x + dx * speed;
    const ny = state.player.y + dy * speed;
    const pos = clampToFloor(state.map, nx, ny);
    state.player.x = pos.x;
    state.player.y = pos.y;
  }

  const inExit = isInExit(state.map, state.player.x, state.player.y);
  if (!inExit) {
    exitConfirmDismissed = false;
  } else if (transitionCooldown <= 0 && !exitConfirmPending && !exitConfirmDismissed) {
    const fieldMapId = CASES[state.caseId].fieldMap;
    const evidenceFlag = FIELD_EVIDENCE_FLAG[state.caseId];
    if (state.currentMapId === fieldMapId && !state.flags[evidenceFlag]) {
      exitConfirmPending = true;
      showConfirm(
        "你好像還沒有仔細調查現場、找大家聊聊，確定要先離開嗎？",
        () => { exitConfirmPending = false; switchMap(resolveExitTarget(state)); },
        () => { exitConfirmPending = false; exitConfirmDismissed = true; }
      );
      return;
    }
    switchMap(resolveExitTarget(state));
  }
}

// 離開案件現場前，如果還沒找到關鍵證據，先提醒一下，避免不小心走進離開熱點
// 就被系統當成「沒調查、直接結案」處理。exitConfirmPending 避免提示視窗因為
// 每一影格都判斷一次而重複彈出；exitConfirmDismissed 記住「玩家已經在熱點上
// 選過『再看看』」，一直站著也不會一直跳，要走出熱點範圍再走回來才會重新提醒。
const FIELD_EVIDENCE_FLAG = { case1: "foundEvidence", case2: "foundSpecEvidence" };
let exitConfirmPending = false;
let exitConfirmDismissed = false;

function showConfirm(message, onConfirm, onCancel) {
  document.getElementById("confirmText").textContent = message;
  document.getElementById("confirm-overlay").classList.remove("hidden");
  document.getElementById("confirmOkBtn").onclick = () => {
    document.getElementById("confirm-overlay").classList.add("hidden");
    onConfirm();
  };
  document.getElementById("confirmCancelBtn").onclick = () => {
    document.getElementById("confirm-overlay").classList.add("hidden");
    if (onCancel) onCancel();
  };
}

function tryInteract() {
  const ent = findNearestEntity(state.map, state.player.x, state.player.y, 55);
  if (ent) openDialogue(ent);
}

// ---------------- 對話系統 ----------------

function currentNode() {
  return DIALOGUES[state.dialogue.npcId].nodes[state.dialogue.nodeId];
}

function openDialogue(ent) {
  const npcId = ent.id;
  const tree = DIALOGUES[npcId];
  const startId = typeof tree.start === "function" ? tree.start(state) : tree.start;
  state.dialogue = { npcId, nodeId: startId };
  document.getElementById("panel-dialogue").classList.remove("hidden");
  renderDialogueNode();
}

function setPortrait(imgEl, portraitId) {
  const src = portraitId && PORTRAITS[portraitId];
  if (!src) {
    imgEl.classList.add("hidden");
    imgEl.removeAttribute("src");
    return;
  }
  imgEl.onerror = () => imgEl.classList.add("hidden");
  imgEl.src = src;
  imgEl.classList.remove("hidden");
}

function renderDialogueNode() {
  const node = currentNode();
  if (node.onEnter) node.onEnter(state);
  updateAllUI();

  document.getElementById("dialogueSpeaker").textContent = node.speaker;
  document.getElementById("dialogueText").textContent = node.text;
  setPortrait(document.getElementById("dialoguePortrait"), node.portraitOverride || state.dialogue.npcId);

  const choicesBox = document.getElementById("dialogueChoices");
  choicesBox.innerHTML = "";
  const continueEl = document.getElementById("dialogueContinue");

  if (node.choices && node.choices.length) {
    continueEl.classList.add("hidden");
    node.choices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = `<span class="choice-num">${i + 1}</span>${choice.label}`;
      btn.onclick = () => selectChoice(choice);
      choicesBox.appendChild(btn);
    });
  } else {
    continueEl.classList.remove("hidden");
    continueEl.onclick = handleDialogueAdvance;
  }
}

function selectChoice(choice) {
  if (choice.effects) choice.effects(state);
  updateAllUI();
  if (state.ended) {
    closeDialogueForEnding();
    return;
  }
  if (choice.next) {
    state.dialogue.nodeId = choice.next;
    renderDialogueNode();
  } else {
    closeDialogue();
  }
}

function handleChoiceKey(index) {
  if (!state.dialogue) return;
  const node = currentNode();
  if (node.choices && node.choices[index]) selectChoice(node.choices[index]);
}

function handleDialogueAdvance() {
  if (!state.dialogue) return;
  const node = currentNode();
  if (node.choices && node.choices.length) return;
  if (node.next) {
    state.dialogue.nodeId = node.next;
    renderDialogueNode();
  } else if (state.ended) {
    closeDialogueForEnding();
  } else {
    closeDialogue();
  }
}

function closeDialogue() {
  state.dialogue = null;
  document.getElementById("panel-dialogue").classList.add("hidden");
  document.getElementById("dialogueChoices").innerHTML = "";
}

function closeDialogueForEnding() {
  closeDialogue();
  showEnding();
}

function showEnding() {
  const isCase1 = state.caseId === "case1";
  const info = (isCase1 ? ENDINGS : ENDINGS2)[state.endingKey];
  const note = isCase1 ? getGiftRegistrationNote(state) : getInviteRegistrationNote(state);
  document.getElementById("endingTitle").textContent = info.title;
  document.getElementById("endingText").textContent = info.text + note;
  document.getElementById("endingScore").textContent = `最終誠信度：${state.integrity} / 100`;
  document.getElementById("touch-controls").classList.remove("in-game");

  progress[state.caseId] = { endingKey: state.endingKey, integrity: state.integrity };
  saveProgress();

  const remaining = Object.keys(CASES).find((id) => !progress[id]);
  const continueBlock = document.getElementById("continue-block");
  const certSection = document.getElementById("cert-section");

  if (remaining) {
    continueBlock.classList.remove("hidden");
    certSection.classList.add("hidden");
    document.getElementById("continueText").textContent =
      `太好了，這個案件完成了！還有「${CASES[remaining].title}」沒玩過，兩個案件都完成才能登記兌獎喔。`;
    const continueBtn = document.getElementById("continueBtn");
    continueBtn.textContent = `繼續挑戰：${CASES[remaining].title} →`;
    continueBtn.onclick = () => {
      document.getElementById("ending-overlay").classList.add("hidden");
      startGame(remaining);
    };
  } else {
    continueBlock.classList.add("hidden");
    resetCertUI();
    certSection.classList.remove("hidden");
  }

  document.getElementById("ending-overlay").classList.remove("hidden");
}

// ---------------- 兌獎登記（完成證明 + Google 表單）----------------
// 跟文字版共用同一套邏輯與同一份 Google 表單設定：
// 先在本機產生一張「完成證明」卡片，同仁隨時可以截圖去政風室兌獎；
// 願意留信箱的話，才會多送出一次登記。FORM_ACTION 留空的話，
// 登記功能會自動隱藏，遊戲照常運作。
const SUBMIT_CONFIG = {
  FORM_ACTION: "https://docs.google.com/forms/d/e/1FAIpQLSfrEg4U89IHuuy8ZCq9OwqzOLKrQzHOpbNg75FAyZP_rOa0AA/formResponse",
  FIELDS: {
    name: "entry.20416040", // 姓名或暱稱
    email: "entry.526894555", // 電子郵件
    date: "entry.1804918415", // 完成日期
    case1Ending: "entry.2123688083", // 案件一結局
    case1Integrity: "entry.2049931210", // 案件一誠信度
    case2Ending: "entry.1809226427", // 案件二結局
    case2Integrity: "entry.1347765137", // 案件二誠信度
    code: "entry.972049163", // 任務代號
  },
};

function submitConfigured() {
  return !!(SUBMIT_CONFIG.FORM_ACTION && SUBMIT_CONFIG.FIELDS.email);
}

function simpleCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).toUpperCase().slice(0, 6);
}

let lastCertData = null;
let certSubmitted = false;

function setCertStatus(msg, kind) {
  const el = document.getElementById("certStatus");
  el.textContent = msg;
  el.className = "cert-status" + (kind ? " " + kind : "");
}

function resetCertUI() {
  document.getElementById("certCard").classList.add("hidden");
  document.getElementById("certNameInput").value = "";
  document.getElementById("certSubmitBlock").classList.add("hidden");
  document.getElementById("certEmailInput").value = "";
  document.getElementById("certEmailInput").disabled = false;
  document.getElementById("certSubmitBtn").disabled = false;
  setCertStatus("", "");
  lastCertData = null;
  certSubmitted = false;
}

function generateCert() {
  const name = document.getElementById("certNameInput").value.trim() || "匿名同仁";
  const now = new Date();
  const dateStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
  const c1 = progress.case1;
  const c2 = progress.case2;
  const case1Ending = c1 ? `${ENDINGS[c1.endingKey].title}（${c1.integrity}分）` : "—";
  const case2Ending = c2 ? `${ENDINGS2[c2.endingKey].title}（${c2.integrity}分）` : "—";
  const code = "CS-" + simpleCode(name + dateStr + (c1 ? c1.endingKey : "") + (c2 ? c2.endingKey : ""));

  document.getElementById("certName").textContent = name;
  document.getElementById("certDate").textContent = dateStr;
  document.getElementById("certCase1").textContent = case1Ending;
  document.getElementById("certCase2").textContent = case2Ending;
  document.getElementById("certCode").textContent = "任務代號：" + code;
  document.getElementById("certCard").classList.remove("hidden");

  lastCertData = {
    name,
    date: dateStr,
    case1Ending,
    case1Integrity: c1 ? String(c1.integrity) : "",
    case2Ending,
    case2Integrity: c2 ? String(c2.integrity) : "",
    code,
  };

  if (submitConfigured() && !certSubmitted) {
    document.getElementById("certSubmitBlock").classList.remove("hidden");
  }
  document.getElementById("certCard").scrollIntoView({ behavior: "smooth", block: "center" });
}

function submitCert() {
  if (certSubmitted) return;
  if (!lastCertData) {
    setCertStatus("請先產生完成證明。", "err");
    return;
  }
  const email = document.getElementById("certEmailInput").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setCertStatus("請輸入正確的電子郵件格式。", "err");
    return;
  }
  document.getElementById("certSubmitBtn").disabled = true;
  setCertStatus("登記中…", "");

  const f = SUBMIT_CONFIG.FIELDS;
  const body = new URLSearchParams();
  if (f.name) body.append(f.name, lastCertData.name);
  if (f.email) body.append(f.email, email);
  if (f.date) body.append(f.date, lastCertData.date);
  if (f.case1Ending) body.append(f.case1Ending, lastCertData.case1Ending);
  if (f.case1Integrity) body.append(f.case1Integrity, lastCertData.case1Integrity);
  if (f.case2Ending) body.append(f.case2Ending, lastCertData.case2Ending);
  if (f.case2Integrity) body.append(f.case2Integrity, lastCertData.case2Integrity);
  if (f.code) body.append(f.code, lastCertData.code);

  fetch(SUBMIT_CONFIG.FORM_ACTION, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
    .then(() => {
      certSubmitted = true;
      setCertStatus("✅ 登記完成，感謝參與！請截圖上方完成證明至政風室兌獎。", "ok");
      document.getElementById("certEmailInput").disabled = true;
    })
    .catch((err) => {
      console.error("submit failed", err);
      document.getElementById("certSubmitBtn").disabled = false;
      setCertStatus("⚠️ 登記失敗，請確認網路後再試一次，或直接截圖完成證明兌獎。", "err");
    });
}

function renderIntroProgress() {
  const box = document.getElementById("introProgress");
  const goBtn = document.getElementById("goToCertBtn");
  const clearBtn = document.getElementById("clearProgressBtn");
  const done1 = !!progress.case1;
  const done2 = !!progress.case2;
  if (!done1 && !done2) {
    box.classList.add("hidden");
    goBtn.classList.add("hidden");
    clearBtn.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.textContent = `目前進度：案件一 ${done1 ? "✅ 已完成" : "⬜ 未完成"} ／ 案件二 ${done2 ? "✅ 已完成" : "⬜ 未完成"}`;
  clearBtn.classList.remove("hidden");
  if (done1 && done2) {
    goBtn.classList.remove("hidden");
  } else {
    goBtn.classList.add("hidden");
  }
}

function showCertOnly() {
  document.getElementById("intro-overlay").classList.add("hidden");
  document.getElementById("endingTitle").textContent = "兌獎登記";
  document.getElementById("endingText").textContent = "你已經完成兩個案件了，可以直接在下面登記兌獎資料。";
  document.getElementById("endingScore").textContent = "";
  document.getElementById("continue-block").classList.add("hidden");
  resetCertUI();
  document.getElementById("cert-section").classList.remove("hidden");
  document.getElementById("ending-overlay").classList.remove("hidden");
}

// ---------------- UI 更新 ----------------

function updateStatusUI() {
  const bar = document.getElementById("integrityBar");
  bar.style.width = state.integrity + "%";
  bar.style.background =
    state.integrity >= 70
      ? "linear-gradient(90deg,#52d17c,#2fae5b)"
      : state.integrity >= 40
      ? "linear-gradient(90deg,#f2c94c,#e0a23b)"
      : "linear-gradient(90deg,#ff6b6b,#c23b3b)";
  document.getElementById("integrityValue").textContent = `${state.integrity} / 100`;
}

function updateQuestUI() {
  const q = CASES[state.caseId].questSteps[state.quest.stepIndex];
  document.getElementById("questTitle").textContent = q.title;
  document.getElementById("questDesc").textContent = q.desc;
}

function updateInventoryUI() {
  const body = document.getElementById("inventoryBody");
  body.innerHTML = "";
  if (state.items.length === 0) {
    body.innerHTML = '<span class="inv-empty">尚無物品</span>';
    return;
  }
  for (const id of state.items) {
    const div = document.createElement("div");
    div.className = "inv-slot";
    div.title = ITEM_NAMES[id] || id;
    div.textContent = ITEM_ICONS[id] || "❔";
    body.appendChild(div);
  }
}

function updateMapUI() {
  document.getElementById("mapName").textContent = state.map.label;
  renderMinimap();
}

function renderMinimap() {
  const body = document.getElementById("minimapBody");
  body.innerHTML = "";

  for (const ent of [...state.map.npcs, ...state.map.objects]) {
    const ndot = document.createElement("div");
    ndot.className = "minimap-npc";
    const ex = (ent.x / CANVAS_W) * 100;
    const ey = (ent.y / CANVAS_H) * 100;
    ndot.style.left = `calc(${ex}% - 2.5px)`;
    ndot.style.top = `calc(${ey}% - 2.5px)`;
    body.appendChild(ndot);
  }

  const pdot = document.createElement("div");
  pdot.className = "minimap-dot";
  const px = (state.player.x / CANVAS_W) * 100;
  const py = (state.player.y / CANVAS_H) * 100;
  pdot.style.left = `calc(${px}% - 3px)`;
  pdot.style.top = `calc(${py}% - 3px)`;
  body.appendChild(pdot);
}

function updateAllUI() {
  updateStatusUI();
  updateQuestUI();
  updateInventoryUI();
}

// ---------------- 主迴圈 ----------------

function render(time) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const pulse = (Math.sin(time / 300) + 1) / 2;
  const scene = state.map;

  renderSceneBackground(ctx, scene, pulse);

  const drawables = [
    ...scene.npcs.map((n) => ({ ...n, kind: "npc" })),
    ...scene.objects.map((o) => ({ ...o, kind: "object" })),
    { ...state.player, kind: "player" },
  ].sort((a, b) => a.y - b.y);

  for (const d of drawables) {
    if (d.kind === "object") {
      renderObjectIcon(ctx, d, depthScale(scene, d.y));
    } else if (d.kind === "player") {
      renderStandee(ctx, d.x, d.y, d.sprite, d.portrait, depthScale(scene, d.y), d.dir === "left", "#5aa9ff");
    } else {
      const scale = depthScale(scene, d.y);
      renderStandee(ctx, d.x, d.y, d.sprite, d.portrait, scale, false, "#7ea8ff");
      renderNameLabel(ctx, d.x, d.y - standeeTopOffset(d, scale), d.name);
    }
  }

  const nearEnt = findNearestEntity(scene, state.player.x, state.player.y, 55);
  renderInteractPrompt(ctx, scene, nearEnt, time);
}

function loop(time) {
  requestAnimationFrame(loop);
  const introOpen = !document.getElementById("intro-overlay").classList.contains("hidden");
  const endingOpen = !document.getElementById("ending-overlay").classList.contains("hidden");
  const confirmOpen = !document.getElementById("confirm-overlay").classList.contains("hidden");

  if (!introOpen && !endingOpen && !confirmOpen) {
    if (!state.dialogue) {
      updateMovement();
      if (keysEdge["e"]) tryInteract();
    }
    if (transitionCooldown > 0) transitionCooldown--;
    render(time);
    renderMinimap();
  }
  keysEdge = {};
}

// ---------------- 啟動 ----------------

function startGame(caseId) {
  initState(caseId);
  updateMapUI();
  updateAllUI();
  setPortrait(document.getElementById("playerPortrait"), "player");
  document.getElementById("intro-overlay").classList.add("hidden");
  document.getElementById("touch-controls").classList.add("in-game");
}

document.querySelectorAll(".case-btn").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.case));
});
document.getElementById("goToCertBtn").addEventListener("click", showCertOnly);
document.getElementById("certGenerateBtn").addEventListener("click", generateCert);
document.getElementById("certSubmitBtn").addEventListener("click", submitCert);

// 「返回選案畫面」不會清掉已經破關的紀錄——只是帶你回去選案件，
// 避免破完一案想接著玩另一案時，不小心把已經完成的那案也洗掉。
document.getElementById("restartBtn").addEventListener("click", () => {
  document.getElementById("ending-overlay").classList.add("hidden");
  document.getElementById("intro-overlay").classList.remove("hidden");
  document.getElementById("touch-controls").classList.remove("in-game");
  renderIntroProgress();
});

// 真的要清空紀錄（例如同一台電腦換下一位同仁玩），才走這個次要的小連結，
// 而且要再次確認，不會被誤觸。
document.getElementById("clearProgressBtn").addEventListener("click", () => {
  const ok = confirm("確定要清除目前的破關紀錄嗎？案件一、案件二的完成狀態都會被清空，這個動作沒辦法復原。");
  if (!ok) return;
  progress = {};
  saveProgress();
  renderIntroProgress();
});

renderIntroProgress();


// ---------------- 觸控操作（搖桿）----------------

const touchJoystick = { active: false, dx: 0, dy: 0 };

(function setupJoystick() {
  const base = document.getElementById("touchJoystickBase");
  const knob = document.getElementById("touchJoystickKnob");
  const maxDist = 40;
  let baseRect = null;

  function pointFromEvent(e) {
    return e.touches && e.touches.length ? e.touches[0] : e;
  }

  function start(e) {
    e.preventDefault();
    baseRect = base.getBoundingClientRect();
    touchJoystick.active = true;
    base.classList.add("active");
    move(e);
  }
  function move(e) {
    if (!touchJoystick.active) return;
    e.preventDefault();
    const p = pointFromEvent(e);
    const cx = baseRect.left + baseRect.width / 2;
    const cy = baseRect.top + baseRect.height / 2;
    let dx = p.clientX - cx;
    let dy = p.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touchJoystick.dx = dx / maxDist;
    touchJoystick.dy = dy / maxDist;
  }
  function end(e) {
    e.preventDefault();
    touchJoystick.active = false;
    touchJoystick.dx = 0;
    touchJoystick.dy = 0;
    base.classList.remove("active");
    knob.style.transform = "translate(0, 0)";
  }

  base.addEventListener("touchstart", start, { passive: false });
  base.addEventListener("touchmove", move, { passive: false });
  base.addEventListener("touchend", end, { passive: false });
  base.addEventListener("touchcancel", end, { passive: false });
})();

function handleTouchInteract() {
  if (state && state.dialogue) {
    const node = currentNode();
    if (!(node.choices && node.choices.length)) handleDialogueAdvance();
  } else if (state) {
    tryInteract();
  }
}
document.getElementById("touchInteractBtn").addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleTouchInteract();
});

requestAnimationFrame(loop);
