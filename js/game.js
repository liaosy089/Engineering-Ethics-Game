// ============================================================
// 誠信抉擇 - 遊戲主控（狀態 / 輸入 / 迴圈 / UI / 對話流程）
// ============================================================

let state = null;
let keys = {};
let keysEdge = {};
let transitionCooldown = 0;
const ctx = document.getElementById("gameCanvas").getContext("2d");

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
    if (k === " " || k === "enter") handleDialogueAdvance();
    if (["1", "2", "3", "4"].includes(k)) handleChoiceKey(parseInt(k, 10) - 1);
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function updateMovement() {
  let dx = 0, dy = 0;
  if (keys["w"] || keys["arrowup"]) dy = -1;
  if (keys["s"] || keys["arrowdown"]) dy = 1;
  if (keys["a"] || keys["arrowleft"]) dx = -1;
  if (keys["d"] || keys["arrowright"]) dx = 1;

  state.player.moving = dx !== 0 || dy !== 0;
  if (state.player.moving) {
    if (dx < 0) state.player.dir = "left";
    else if (dx > 0) state.player.dir = "right";
    else if (dy < 0) state.player.dir = "up";
    else if (dy > 0) state.player.dir = "down";

    const len = Math.hypot(dx, dy) || 1;
    const speed = 3.8;
    const nx = state.player.x + (dx / len) * speed;
    const ny = state.player.y + (dy / len) * speed;
    const pos = clampToFloor(state.map, nx, ny);
    state.player.x = pos.x;
    state.player.y = pos.y;
  }

  if (transitionCooldown <= 0 && isInExit(state.map, state.player.x, state.player.y)) {
    switchMap(resolveExitTarget(state));
  }
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

  if (!introOpen && !endingOpen) {
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
}

document.querySelectorAll(".case-btn").forEach((btn) => {
  btn.addEventListener("click", () => startGame(btn.dataset.case));
});
document.getElementById("restartBtn").addEventListener("click", () => {
  location.reload();
});

requestAnimationFrame(loop);
