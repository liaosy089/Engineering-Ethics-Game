// ============================================================
// 誠信抉擇 - 遊戲資料定義（地圖 / NPC / 對話 / 任務 / 結局）
// ============================================================

// ---- 角色美術（頭像）----
// 尚未提供圖檔的角色會自動 fallback 為無頭像，不影響遊戲運作。
const PORTRAITS = {
  player: "assets/characters/player.jpg",
  xiaofeng: "assets/characters/xiaofeng.jpg",
  chief: "assets/characters/chief.jpg",
  colleague: "assets/characters/colleague.jpg",
  supervisor: "assets/characters/supervisor.jpg",
  contractor: "assets/characters/contractor.jpg",
  historian: "assets/characters/historian.jpg",
  vendor: "assets/characters/vendor.jpg",
  committee: "assets/characters/committee.jpg",
  rival: "assets/characters/rival.jpg",
};

// ---- 角色美術（Q版全身立繪，選用）----
// 提供了就用全身立繪站在場景裡（自動去除白底），沒提供就退回頭像圓牌，不影響遊戲運作。
const SPRITES = {
  player: "assets/characters/sprites/player.jpg",
  xiaofeng: "assets/characters/sprites/xiaofeng.jpg",
  chief: "assets/characters/sprites/chief.jpg",
  colleague: "assets/characters/sprites/colleague.jpg",
  supervisor: "assets/characters/sprites/supervisor.jpg",
  contractor: "assets/characters/sprites/contractor.jpg",
  historian: "assets/characters/sprites/historian.jpg",
  vendor: "assets/characters/sprites/vendor.jpg",
  committee: "assets/characters/sprites/committee.jpg",
  rival: "assets/characters/sprites/rival.jpg",
};

// ---- 場景：單張背景圖 + 可走動範圍(貼合透視的梯形) + 固定站位 ----
// background 檔案不存在時會自動退回純色底，不影響遊戲運作。
// floor 是梯形：yTop/yBottom 上下邊界，top/bottom 各自的左右邊界，模擬「越遠越窄」的透視走道。
// exit.target 為 "case_field" 時，由 getExitTarget() 依目前案件解析成 CASES[caseId].fieldMap。
const SCENES = {
  office: {
    label: "文化局辦公室",
    background: "assets/backgrounds/office.jpg",
    floor: { yTop: 210, yBottom: 445, topLeftX: 200, topRightX: 600, bottomLeftX: 20, bottomRightX: 700 },
    playerSpawn: { x: 260, y: 410 },
    exit: { x: 480, y: 395, w: 80, h: 60, target: "case_field" },
    npcs: [
      { id: "xiaofeng", name: "小風", x: 240, y: 260 },
      { id: "chief", name: "科長", x: 560, y: 260 },
      { id: "colleague", name: "阿德", x: 420, y: 340 },
    ],
    objects: [],
  },
  site: {
    label: "古蹟修復工地",
    background: "assets/backgrounds/site.jpg",
    // 這張圖的石板路是從左下往右上斜切收窄的透視，右半邊多半是圍籬跟建築，
    // 梯形跟著實際路面走，不是左右對稱的通道。
    floor: { yTop: 255, yBottom: 442, topLeftX: 10, topRightX: 185, bottomLeftX: 10, bottomRightX: 470 },
    playerSpawn: { x: 150, y: 430 },
    exit: { x: 415, y: 410, w: 70, h: 50, target: "office" },
    npcs: [
      { id: "supervisor", name: "監造技師", x: 110, y: 340 },
      { id: "historian", name: "文史工作者", x: 240, y: 370 },
      { id: "contractor", name: "承包商", x: 370, y: 420 },
    ],
    objects: [
      { id: "material_pile", name: "材料堆", icon: "🪵", x: 330, y: 320 },
    ],
  },
  exhibition: {
    label: "特展布展現場",
    background: "assets/backgrounds/exhibition.jpg",
    floor: { yTop: 220, yBottom: 445, topLeftX: 150, topRightX: 600, bottomLeftX: 20, bottomRightX: 700 },
    playerSpawn: { x: 260, y: 410 },
    exit: { x: 480, y: 395, w: 80, h: 60, target: "office" },
    npcs: [
      { id: "vendor", name: "甲廠商業務", x: 240, y: 270 },
      { id: "committee", name: "評選委員", x: 560, y: 270 },
      { id: "rival", name: "競爭廠商業務", x: 420, y: 340 },
    ],
    objects: [
      { id: "spec_compare", name: "規格書比對", icon: "📋", x: 350, y: 400 },
    ],
  },
};

// ---- 物品圖示 ----
const ITEM_ICONS = {
  gift_box: "🎁",
  material_photo: "📷",
  spec_compare_doc: "📋",
};
const ITEM_NAMES = {
  gift_box: "廠商禮盒",
  material_photo: "材質比對照片",
  spec_compare_doc: "規格比對報告",
};

// ---- 任務流程 ----
const QUEST_STEPS_CASE1 = [
  { id: "start", title: "向科長報到", desc: "去找科長，了解這次古蹟修復工程驗收案的狀況。" },
  { id: "go_site", title: "前往工地", desc: "前往古蹟修復工地，了解目前驗收與施工狀況。" },
  { id: "investigate", title: "了解狀況", desc: "跟工地的人聊聊，留意任何不對勁的細節。" },
  { id: "report", title: "回報結果", desc: "回文化局，向科長回報你在工地的發現。" },
];

const QUEST_STEPS_CASE2 = [
  { id: "c2_start", title: "向科長報到", desc: "去找科長，了解這次特展設備採購案的狀況。" },
  { id: "c2_review_spec", title: "了解規格書", desc: "去找負責撰寫規格書的同事，了解目前規格內容。" },
  { id: "c2_investigate", title: "了解狀況", desc: "到特展現場，跟廠商、評選委員、其他廠商聊聊，留意任何不對勁的地方。" },
  { id: "c2_report", title: "回報結果", desc: "回文化局，向科長回報你的發現與處理建議。" },
];

// ---- 案件設定 ----
const CASES = {
  case1: {
    title: "案件一：古蹟修復工程",
    fieldMap: "site",
    questSteps: QUEST_STEPS_CASE1,
  },
  case2: {
    title: "案件二：特展設備採購",
    fieldMap: "exhibition",
    questSteps: QUEST_STEPS_CASE2,
  },
};

// ---- 對話樹 ----
// 每個節點：{ speaker, text, choices?: [{label, next, effects?}], next?, onEnter? }
const DIALOGUES = {

  // ============ 小風（政風室）============
  xiaofeng: {
    start(state) {
      if (state.caseId === "case2") {
        if (state.flags.vendorResolved && !state.flags.inviteRegistered) {
          return state.flags.acceptedInvite ? "c2_register_accepted" : "c2_register_declined";
        }
        if (!state.flags.metXiaofeng) return "c2_intro";
        if (state.flags.foundSpecEvidence && state.quest.stepIndex >= 3 && !state.flags.consultedReport2 && !state.flags.reportedUp2 && !state.flags.coveredUp2) {
          return "c2_report_advice";
        }
        return "c2_smalltalk";
      }
      if (state.flags.giftResolved && !state.flags.giftRegistered) {
        return state.flags.acceptedGift ? "register_gift_accepted" : "register_gift_declined";
      }
      if (!state.flags.metXiaofeng) return "intro";
      if (state.flags.giftOffered && !state.flags.giftResolved) return "gift_advice";
      if (state.flags.foundEvidence && state.quest.stepIndex >= 3 && !state.flags.consultedReport && !state.flags.reportedUp && !state.flags.coveredUp) {
        return "report_advice";
      }
      return "smalltalk";
    },
    nodes: {
      intro: {
        speaker: "小風",
        text: "嗨，你好呀！我是政風室的小風😊\n你就是新來負責古蹟修復案驗收的同仁吧？",
        onEnter: (s) => { s.flags.metXiaofeng = true; },
        next: "intro2",
      },
      intro2: {
        speaker: "小風",
        text: "政風不是專門在抓人的啦～我們比較像「事前的安全帶」。\n工作上遇到不確定的狀況，像是廠商送禮、要不要簽字驗收，都歡迎隨時來找我聊聊！",
        choices: [
          { label: "了解，謝謝小風！", next: null },
        ],
      },
      smalltalk: {
        speaker: "小風",
        text: "最近工程還順利嗎？有任何不確定的地方，都可以來找我聊聊喔！",
        choices: [{ label: "好，謝謝小風", next: null }],
      },
      gift_advice: {
        speaker: "小風",
        text: "聽起來工地那邊有廠商要送你東西？跟你說一下原則：\n依《公務員廉政倫理規範》，超過新台幣500元的餽贈，原則上要婉拒或簽報，不能就這樣收下喔。",
        choices: [
          {
            label: "了解，謝謝小風",
            next: null,
            effects: (s) => { s.flags.consultedGift = true; },
          },
        ],
      },
      register_gift_declined: {
        speaker: "小風",
        text: "聽說工地那邊有廠商要送你禮盒，後來你婉拒了對吧？辛苦了！\n不過提醒一下：不管最後有沒有收下，都要來政風室做個「餽贈登錄」喔。\n像是如果你當場拒絕，但沒有留下紀錄，事後萬一廠商私下亂講「其實有送成」，你會百口莫辯——登錄起來，才是保護你自己最好的方式。",
        choices: [
          {
            label: "了解，我現在登錄",
            next: null,
            effects: (s) => { addIntegrity(s, 8); s.flags.giftRegistered = true; s.flags.metXiaofeng = true; },
          },
        ],
      },
      register_gift_accepted: {
        speaker: "小風",
        text: "聽說工地那邊的廠商送了你東西……你收下了嗎？\n依規定這類餽贈是不能收的，我們必須馬上處理：一是趕快把東西退還或折算價金繳庫，二是這件事要正式登錄簽報。\n現在補救還來得及，一起把程序走完，總比讓它變成日後被放大檢視的把柄好。",
        choices: [
          {
            label: "好，我現在就處理",
            next: null,
            effects: (s) => { addIntegrity(s, 5); s.flags.giftRegistered = true; s.flags.giftRemedied = true; s.flags.metXiaofeng = true; },
          },
        ],
      },
      report_advice: {
        speaker: "小風",
        text: "如果你發現工程真的有問題，可以正式簽陳給科長；\n必要的話，政風室也能協助簽報、啟動查核，你不用一個人扛這件事。",
        choices: [
          {
            label: "謝謝，我知道該怎麼做了",
            next: null,
            effects: (s) => { s.flags.consultedReport = true; },
          },
        ],
      },
      c2_intro: {
        speaker: "小風",
        text: "欸，又是你！這次換了新案子吧？特展設備採購對吧。\n跟上次一樣，遇到不確定的地方，隨時來找我聊聊！",
        onEnter: (s) => { s.flags.metXiaofeng = true; },
        choices: [{ label: "好，謝謝小風！", next: null }],
      },
      c2_smalltalk: {
        speaker: "小風",
        text: "評選會議準備得還順利嗎？有狀況隨時來找我。",
        choices: [{ label: "好，謝謝小風", next: null }],
      },
      c2_register_declined: {
        speaker: "小風",
        text: "聽說廠商約你吃飯，後來你婉拒了對吧？很好！\n這種屬於《公務員廉政倫理規範》講的「飲宴應酬」，跟有利害關係的廠商吃飯應酬，原則上要婉拒——不管最後有沒有赴約，都要回政風室登錄，才不會之後被誤會你們私下有往來。",
        choices: [
          {
            label: "了解，我現在登錄",
            next: null,
            effects: (s) => { addIntegrity(s, 8); s.flags.inviteRegistered = true; s.flags.metXiaofeng = true; },
          },
        ],
      },
      c2_register_accepted: {
        speaker: "小風",
        text: "聽說你去赴了廠商的飯局約……這屬於《公務員廉政倫理規範》講的「飲宴應酬」，跟有利害關係的廠商吃飯，原則上應該婉拒才對。\n趕快把這次應酬的時間、場合、內容登錄下來，之後如果有人質疑，才有紀錄可以說明。",
        choices: [
          {
            label: "好，我現在處理",
            next: null,
            effects: (s) => { addIntegrity(s, 5); s.flags.inviteRegistered = true; s.flags.inviteRemedied = true; s.flags.metXiaofeng = true; },
          },
        ],
      },
      c2_report_advice: {
        speaker: "小風",
        text: "如果規格書真的是照著特定廠商的產品型錄寫的，這就是綁標的高風險徵兆，\n你可以正式簽報，要求採購單位重新檢視規格，必要時政風室這邊也能協助。",
        choices: [
          {
            label: "謝謝，我知道該怎麼做了",
            next: null,
            effects: (s) => { s.flags.consultedReport2 = true; },
          },
        ],
      },
    },
  },

  // ============ 科長 ============
  chief: {
    start(state) {
      if (state.caseId === "case2") {
        if (!state.flags.metChief) return "c2_briefing";
        if (state.quest.stepIndex >= 3 && !state.flags.reportedUp2 && !state.flags.coveredUp2 && !state.flags.caseClosedBlind2) {
          return state.flags.foundSpecEvidence ? "c2_final_decision" : "c2_final_no_evidence";
        }
        if (state.flags.reportedUp2 || state.flags.coveredUp2 || state.flags.caseClosedBlind2) return "c2_after";
        return "c2_wait";
      }
      if (!state.flags.metChief) return "briefing";
      if (state.quest.stepIndex >= 3 && !state.flags.reportedUp && !state.flags.coveredUp && !state.flags.caseClosedBlind) {
        return state.flags.foundEvidence ? "final_decision" : "final_no_evidence";
      }
      if (state.flags.reportedUp || state.flags.coveredUp || state.flags.caseClosedBlind) return "after";
      return "wait";
    },
    nodes: {
      briefing: {
        speaker: "科長",
        text: "喔，你來啦。OO街屋古蹟修復工程差不多要驗收結案了，監造那邊說都沒問題。",
        next: "briefing2",
      },
      briefing2: {
        speaker: "科長",
        text: "這案子拖超過一年，上面一直在問進度。這次驗收你負責，盡快簽一簽趕快結掉，大家都輕鬆～",
        choices: [
          {
            label: "我了解，我先去工地看看狀況",
            next: null,
            effects: (s) => { s.flags.metChief = true; advanceQuestTo(s, "go_site"); },
          },
        ],
      },
      wait: {
        speaker: "科長",
        text: "去工地看看吧，監造技師都在現場，有狀況再回來跟我說。",
        choices: [{ label: "好的", next: null }],
      },
      final_decision: {
        speaker: "科長",
        text: "怎麼樣，工地那邊都還好吧？",
        next: "final_decision2",
      },
      final_decision2: {
        speaker: "科長",
        text: "喔？你說材料看起來不太一樣……會不會是你看錯了？外觀沒問題，驗收先過關，之後有機會再處理啦。",
        next: "final_decision3",
      },
      final_decision3: {
        speaker: "科長",
        text: "老實說，這案子拖很久了，我也不想節外生枝。你就照原本方式結案，好嗎？",
        choices: [
          {
            label: "我認為這件事應該依規定陳報，不能就這樣結案",
            next: null,
            effects: (s) => {
              s.flags.reportedUp = true;
              addIntegrity(s, s.flags.consultedReport ? 25 : 18);
              s.flags.giftResolved = true;
              triggerEnding(s);
            },
          },
          {
            label: "……好，那就照原本方式結案",
            next: null,
            effects: (s) => {
              s.flags.coveredUp = true;
              addIntegrity(s, -25);
              s.flags.giftResolved = true;
              triggerEnding(s);
            },
          },
        ],
      },
      final_no_evidence: {
        speaker: "科長",
        text: "驗收都OK吧？那就照流程結案囉，辛苦了。",
        choices: [
          {
            label: "好的",
            next: null,
            effects: (s) => {
              s.flags.caseClosedBlind = true;
              s.flags.giftResolved = true;
              triggerEnding(s);
            },
          },
        ],
      },
      after: {
        speaker: "科長",
        text: "這件案子辛苦你了。",
        choices: [{ label: "（離開）", next: null }],
      },
      c2_briefing: {
        speaker: "科長",
        text: "欸，你上次那件案子辦得不錯，這次再麻煩你一下。這次是OO特展的設備採購案，快要開評選會議了。",
        next: "c2_briefing2",
      },
      c2_briefing2: {
        speaker: "科長",
        text: "規格書同事那邊都寫好了，你幫忙跑一下流程。評選委員我也找好了，是OOO老師，很資深，你們配合一下應該沒問題。",
        choices: [
          {
            label: "好，我先去了解一下規格書內容",
            next: null,
            effects: (s) => { s.flags.metChief = true; advanceQuestTo(s, "c2_review_spec"); },
          },
        ],
      },
      c2_wait: {
        speaker: "科長",
        text: "記得先去了解一下規格書跟特展現場的狀況。",
        choices: [{ label: "好的", next: null }],
      },
      c2_final_decision: {
        speaker: "科長",
        text: "規格書都確認過了吧？評選會議準備好了嗎？",
        next: "c2_final_decision2",
      },
      c2_final_decision2: {
        speaker: "科長",
        text: "什麼？你說規格根本是照抄甲廠商的產品型錄寫的？……會不會你想太多了，很多案子都馬馬虎虎這樣寫的啦。",
        next: "c2_final_decision3",
      },
      c2_final_decision3: {
        speaker: "科長",
        text: "評選會議都排好了，這時候喊卡，上面會很難看。你確定要現在講嗎？",
        choices: [
          {
            label: "我認為這樣的規格有綁標疑慮，應該退回重新檢視，我要正式簽報",
            next: null,
            effects: (s) => {
              s.flags.reportedUp2 = true;
              addIntegrity(s, s.flags.consultedReport2 ? 25 : 18);
              triggerEnding(s);
            },
          },
          {
            label: "……好吧，那就照原本流程送出去",
            next: null,
            effects: (s) => {
              s.flags.coveredUp2 = true;
              addIntegrity(s, -25);
              triggerEnding(s);
            },
          },
        ],
      },
      c2_final_no_evidence: {
        speaker: "科長",
        text: "規格書都OK吧？那評選會議就照排定時間進行囉，辛苦了。",
        choices: [
          {
            label: "好的",
            next: null,
            effects: (s) => {
              s.flags.caseClosedBlind2 = true;
              triggerEnding(s);
            },
          },
        ],
      },
      c2_after: {
        speaker: "科長",
        text: "這次也辛苦你了。",
        choices: [{ label: "（離開）", next: null }],
      },
    },
  },

  // ============ 監造技師 ============
  supervisor: {
    start(state) {
      return state.flags.askedSupervisor ? "default" : "greet";
    },
    nodes: {
      greet: {
        speaker: "監造技師",
        text: "呃……你好，我是這次的監造技師。驗收的話，目前看起來都符合圖說啦。",
        choices: [
          { label: "圖說上指定的材料，工地現場都有照著用嗎？", next: "material_q" },
          { label: "辛苦了，我先四處看看", next: null },
        ],
      },
      material_q: {
        speaker: "監造技師",
        text: "（有點閃躲）材料喔……應該……是有照圖說啦。你如果有疑問，可以直接問承包商，他們比較清楚細節。",
        choices: [
          {
            label: "好，謝謝",
            next: null,
            effects: (s) => { s.flags.askedSupervisor = true; },
          },
        ],
      },
      default: {
        speaker: "監造技師",
        text: "現場都還好，有問題可以問承包商那邊。",
        choices: [{ label: "好", next: null }],
      },
    },
  },

  // ============ 阿德（採購同事）============
  colleague: {
    start(state) {
      if (state.caseId !== "case2") return "idle_case1";
      if (!state.flags.reviewedSpec) return "spec_intro";
      return "spec_default";
    },
    nodes: {
      idle_case1: {
        speaker: "阿德",
        text: "你在忙什麼案子啊？辛苦了，有需要幫忙再說一聲。",
        choices: [{ label: "先這樣，謝了", next: null }],
      },
      spec_intro: {
        speaker: "阿德",
        text: "喔，你是這次特展採購案的承辦喔？規格書我都寫好了，你要看嗎？",
        choices: [{ label: "麻煩你了，我看一下", next: "spec_detail" }],
      },
      spec_detail: {
        speaker: "阿德",
        text: "這次的展示櫃要求要用某個特殊等級的抗UV玻璃，燈光也指定要某個型號的博物館級投射燈。\n規格是我參考之前OO公司投的案子寫的，這樣比較好抓，你放心啦。",
        choices: [
          { label: "這樣其他廠商投得進來嗎？", next: "spec_worry" },
          {
            label: "了解，謝謝",
            next: null,
            effects: (s) => { s.flags.reviewedSpec = true; },
          },
        ],
      },
      spec_worry: {
        speaker: "阿德",
        text: "呃……應該可以吧？我也不是很確定，反正這樣寫比較省事，你不用想太多啦。",
        choices: [
          {
            label: "好，謝謝",
            next: null,
            effects: (s) => { s.flags.reviewedSpec = true; s.flags.specSuspicionRaised = true; },
          },
        ],
      },
      spec_default: {
        speaker: "阿德",
        text: "規格書的事，你去現場再確認看看囉。",
        choices: [{ label: "好", next: null }],
      },
    },
  },

  // ============ 承包商 ============
  contractor: {
    start(state) {
      if (state.flags.giftResolved) return "default";
      if (state.flags.giftInformed) return "gift_setup_informed";
      return "greet";
    },
    nodes: {
      greet: {
        speaker: "承包商",
        text: "喔！新來負責的長官，辛苦你了～工程都照圖施工啦，你放心！",
        choices: [
          { label: "圖說上指定的檜木，工地現場有用嗎？", next: "deny" },
          { label: "先看看再說", next: null },
        ],
      },
      deny: {
        speaker: "承包商",
        text: "檜木喔……現在檜木很貴又不好買啦，我們用同等級的材料替代，效果差不多啦，官方文件上寫檜木就好，不用太計較～",
        choices: [
          { label: "這樣算是變更設計，需要正式核准吧？", next: "gift_setup" },
        ],
      },
      gift_setup: {
        speaker: "承包商",
        text: "哎呀，都是小事情，不用那麼緊張啦。對了，這個給你，家鄉土產，不成敬意，你收下就好～\n（遞上一個禮盒）",
        onEnter: (s) => { s.flags.giftOffered = true; },
        choices: [
          {
            label: "謝謝，我收下了",
            next: "gift_reminder",
            effects: (s) => {
              addIntegrity(s, -15);
              addItem(s, "gift_box");
              s.flags.acceptedGift = true;
              s.flags.giftResolved = true;
            },
          },
          {
            label: "不好意思，我不能收，這樣不合規定",
            next: "gift_reminder",
            effects: (s) => {
              addIntegrity(s, 10);
              s.flags.declinedGift = true;
              s.flags.giftResolved = true;
            },
          },
          {
            label: "我想先請教一下政風室的意見",
            next: "xiaofeng_tip",
          },
        ],
      },
      xiaofeng_tip: {
        speaker: "小風（電話那頭）",
        portraitOverride: "xiaofeng",
        text: "喂？聽起來工地那邊有廠商要送你東西？\n依《公務員廉政倫理規範》，超過新台幣500元的餽贈，原則上要婉拒或簽報，不能就這樣收下喔。先謝謝對方心意，委婉拒絕最保險！",
        onEnter: (s) => { s.flags.consultedGift = true; s.flags.giftInformed = true; },
        choices: [{ label: "了解，謝謝小風", next: "gift_setup_informed" }],
      },
      gift_setup_informed: {
        speaker: "承包商",
        text: "怎樣，這個禮盒，要收下嗎？",
        choices: [
          {
            label: "謝謝，但依規定我不能收下",
            next: "gift_reminder",
            effects: (s) => {
              addIntegrity(s, 15);
              s.flags.declinedGift = true;
              s.flags.giftResolved = true;
            },
          },
          {
            label: "……好吧，我還是收下好了",
            next: "gift_reminder",
            effects: (s) => {
              addIntegrity(s, -25);
              addItem(s, "gift_box");
              s.flags.acceptedGift = true;
              s.flags.giftResolved = true;
            },
          },
        ],
      },
      gift_reminder: {
        speaker: "（提醒）",
        text: "不管最後收下與否，記得之後要去政風室找小風完成「餽贈登錄」。\n就算當場拒絕了，只要沒有留下紀錄，事後萬一廠商亂講，你也百口莫辯——登錄起來，才是保護自己最好的方式。",
        choices: [{ label: "好，我知道了", next: null }],
      },
      default: {
        speaker: "承包商",
        text: "工程都在趕工，麻煩長官多照顧啦！",
        choices: [{ label: "（離開）", next: null }],
      },
    },
  },

  // ============ 文史工作者 ============
  historian: {
    start(state) {
      return state.flags.gotClue ? "default" : "greet";
    },
    nodes: {
      greet: {
        speaker: "文史工作者",
        text: "唉，你也是文化局的人吧？我常常來看這棟老房子，最近觀察到怪怪的地方。",
        choices: [
          { label: "怎麼說？", next: "clue" },
          { label: "謝謝提醒，我了解", next: null },
        ],
      },
      clue: {
        speaker: "文史工作者",
        text: "我看到工人把好好的檜木料堆在角落當廢料丟掉，換上去的看起來像塑合板，顏色都對不起來。\n你們驗收真的有仔細核對材質嗎？可以去那堆廢料旁邊看看。",
        choices: [
          {
            label: "謝謝你告訴我，我會去查證",
            next: null,
            effects: (s) => { s.flags.gotClue = true; },
          },
        ],
      },
      default: {
        speaker: "文史工作者",
        text: "希望這次修復能真的把老房子照顧好。",
        choices: [{ label: "好，謝謝", next: null }],
      },
    },
  },

  // ============ 材料堆（互動物件）============
  material_pile: {
    start(state) {
      return state.flags.foundEvidence ? "seen" : "inspect";
    },
    nodes: {
      inspect: {
        speaker: "（你蹲下來查看）",
        text: "你蹲下來仔細比對角落的廢棄料與牆上新裝的材料……\n顏色、紋理明顯不一樣：被丟棄的料看起來才像真正的檜木，新裝上去的材質偏向便宜的塑合板。\n你拍下照片存證。",
        choices: [
          {
            label: "確認",
            next: null,
            effects: (s) => {
              addIntegrity(s, 5);
              addItem(s, "material_photo");
              s.flags.foundEvidence = true;
              advanceQuestTo(s, "report");
            },
          },
        ],
      },
      seen: {
        speaker: "（材料堆）",
        text: "這堆被換下來的材料，你已經拍照存證過了。",
        choices: [{ label: "離開", next: null }],
      },
    },
  },

  // ============ 甲廠商業務 ============
  vendor: {
    start(state) {
      if (state.flags.vendorResolved) return "default";
      if (state.flags.inviteInformed) return "invite_informed";
      if (state.flags.vendorInvited) return "invite";
      if (state.flags.metVendor) return "reveal";
      return "greet";
    },
    nodes: {
      greet: {
        speaker: "甲廠商業務",
        text: "長官好～這次的展場設備都是我們公司在弄，品質有保證的啦！",
        choices: [
          { label: "這次規格好像蠻specific的，你們常常投這種案子嗎？", next: "reveal" },
          {
            label: "先看看展場狀況",
            next: null,
            effects: (s) => { s.flags.metVendor = true; },
          },
        ],
      },
      reveal: {
        speaker: "甲廠商業務",
        text: "哈哈，這種規格書我們最熟了啦，之前配合很多次，跟評選的OOO老師也認識很久了，你們放心～",
        onEnter: (s) => { s.flags.metVendor = true; },
        choices: [{ label: "喔？你們常配合？", next: "invite" }],
      },
      invite: {
        speaker: "甲廠商業務",
        text: "對呀，等結果出來，我請你跟評選老師一起吃個飯，好好聊聊，以後也請你多照顧啦！",
        onEnter: (s) => { s.flags.vendorInvited = true; },
        choices: [
          {
            label: "好啊，先約起來",
            next: "invite_reminder",
            effects: (s) => {
              addIntegrity(s, -15);
              s.flags.acceptedInvite = true;
              s.flags.vendorResolved = true;
            },
          },
          {
            label: "謝謝，但這樣不太合適，我先不參加了",
            next: "invite_reminder",
            effects: (s) => {
              addIntegrity(s, 10);
              s.flags.declinedInvite = true;
              s.flags.vendorResolved = true;
            },
          },
          {
            label: "我想先請教一下政風室的意見",
            next: "xiaofeng_tip2",
          },
        ],
      },
      xiaofeng_tip2: {
        speaker: "小風（電話那頭）",
        portraitOverride: "xiaofeng",
        text: "喂？廠商邀你跟評選委員一起吃飯喔？\n這屬於《公務員廉政倫理規範》講的「飲宴應酬」，跟有利害關係的廠商吃飯，原則上應該婉拒，評選會議還沒結束前更不適合赴約，會有球員兼裁判的觀感問題。",
        onEnter: (s) => { s.flags.consultedInvite = true; s.flags.inviteInformed = true; },
        choices: [{ label: "了解，謝謝小風", next: "invite_informed" }],
      },
      invite_informed: {
        speaker: "甲廠商業務",
        text: "所以怎樣，要不要一起吃個飯？",
        choices: [
          {
            label: "謝謝，但這樣不太合適，我先不參加了",
            next: "invite_reminder",
            effects: (s) => {
              addIntegrity(s, 15);
              s.flags.declinedInvite = true;
              s.flags.vendorResolved = true;
            },
          },
          {
            label: "……好啊，先約起來",
            next: "invite_reminder",
            effects: (s) => {
              addIntegrity(s, -25);
              s.flags.acceptedInvite = true;
              s.flags.vendorResolved = true;
            },
          },
        ],
      },
      invite_reminder: {
        speaker: "（提醒）",
        text: "不管有沒有答應飯局邀約，這類跟利害關係廠商的「飲宴應酬」都要回政風室登錄備查，之後才不會被誤會，也保護你自己。",
        choices: [{ label: "好，我知道了", next: null }],
      },
      default: {
        speaker: "甲廠商業務",
        text: "有什麼問題都可以再問我！",
        choices: [{ label: "（離開）", next: null }],
      },
    },
  },

  // ============ 評選委員 ============
  committee: {
    start(state) {
      return state.flags.metCommittee ? "default" : "greet";
    },
    nodes: {
      greet: {
        speaker: "評選委員",
        text: "你好，我是這次特展案的評選委員之一，之前也常跟文化局合作。",
        choices: [
          { label: "請問老師跟甲廠商熟嗎？", next: "slip" },
          {
            label: "老師好，麻煩您了",
            next: null,
            effects: (s) => { s.flags.metCommittee = true; },
          },
        ],
      },
      slip: {
        speaker: "評選委員",
        text: "（愣了一下）呃……其實那家的負責人是我表哥啦，不過工作是工作，我評分會很公正的，你放心。",
        onEnter: (s) => { s.flags.metCommittee = true; s.flags.knowsCommitteeConflict = true; },
        choices: [
          {
            label: "老師，這種情況依規定應該要迴避，我需要回報處理",
            next: null,
            effects: (s) => { addIntegrity(s, 15); s.flags.raisedConflict = true; },
          },
          {
            label: "好的，了解，那麻煩您費心了",
            next: null,
            effects: (s) => { addIntegrity(s, -15); s.flags.ignoredConflict = true; },
          },
        ],
      },
      default: {
        speaker: "評選委員",
        text: "評選會議上再麻煩你了。",
        choices: [{ label: "好的", next: null }],
      },
    },
  },

  // ============ 競爭廠商業務 ============
  rival: {
    start(state) {
      return state.flags.gotSpecClue2 ? "default" : "greet";
    },
    nodes: {
      greet: {
        speaker: "競爭廠商業務",
        text: "你好，我是隔壁OO公司的，這次也有想投這個案子，不過看規格書覺得怪怪的，想跟你反應一下。",
        choices: [
          { label: "怎麼說？", next: "clue" },
          { label: "謝謝提醒，我了解", next: null },
        ],
      },
      clue: {
        speaker: "競爭廠商業務",
        text: "那個抗UV玻璃跟燈光的規格，根本是照抄甲廠商的產品型錄寫的，一般公司的產品規格不可能剛好完全對得上。\n我們公司東西不比他們差，卻連投標資格都沒有。",
        choices: [
          {
            label: "謝謝你告訴我，我會去查證",
            next: null,
            effects: (s) => { s.flags.gotSpecClue2 = true; },
          },
        ],
      },
      default: {
        speaker: "競爭廠商業務",
        text: "希望這次採購案能公平一點。",
        choices: [{ label: "好，謝謝", next: null }],
      },
    },
  },

  // ============ 規格書比對（互動物件）============
  spec_compare: {
    start(state) {
      return state.flags.foundSpecEvidence ? "seen" : "inspect";
    },
    nodes: {
      inspect: {
        speaker: "（你拿出規格書比對）",
        text: "你把規格書上的技術規格，一條一條對照甲廠商的產品型錄……\n幾乎一字不差，連型號都對得上，這規格根本是照著他們的產品寫的。",
        choices: [
          {
            label: "確認",
            next: null,
            effects: (s) => {
              addIntegrity(s, 5);
              addItem(s, "spec_compare_doc");
              s.flags.foundSpecEvidence = true;
              advanceQuestTo(s, "c2_report");
            },
          },
        ],
      },
      seen: {
        speaker: "（規格書比對）",
        text: "這份規格書的問題，你已經比對確認過了。",
        choices: [{ label: "離開", next: null }],
      },
    },
  },
};

// ---- 結局 ----
const ENDINGS = {
  hero: {
    title: "誠信守護者",
    text: "你堅持依規定陳報，政風室介入了解後，確認材料確實遭到偷換。案件妥善處理，古蹟修復要求廠商改正，同事們也看見了：發現問題就說出來，其實沒有想像中可怕。",
  },
  shaky: {
    title: "勇敢的一步",
    text: "你最終選擇如實陳報，這是正確的方向。只是過程中有些環節處理得不夠謹慎，讓自己一度陷入尷尬處境。這次的經驗提醒了你：疑慮出現的當下，除了做對選擇，也要把程序走完整，不要留下模糊地帶。",
  },
  compromise: {
    title: "妥協的代價",
    text: "你選擇照原本方式結案。半年後，這起偷工減料事件被媒體踢爆，回頭追查時發現你當時其實已經知情。這不只是工程問題，也讓你陷入行政調查——早知道，當初開口求助就好了。",
  },
  missed: {
    title: "擦肩而過",
    text: "驗收順利結案，你也沒有多想。只是這棟古蹟修復完工不久，牆面就出現異狀……如果當初多留意工地的細節、多問一句，或許能提早發現問題。",
  },
};

function computeEndingKey(state) {
  if (state.flags.reportedUp) {
    return state.integrity >= 80 ? "hero" : "shaky";
  }
  if (state.flags.coveredUp) return "compromise";
  return "missed";
}

// 不論當初收下或婉拒禮物，只要沒有完成政風登錄，事後都可能百口莫辯——
// 這段後記無論最終結局為何都會附加，強化「有餽贈就要登錄」的提醒。
function getGiftRegistrationNote(state) {
  if (!state.flags.giftOffered || state.flags.giftRegistered) return "";
  if (state.flags.acceptedGift) {
    return "\n\n（後記：那個禮盒，你後來沒有拿去政風室登錄或退還。半年後，這件事被人翻出來檢舉，你才發現自己既沒有退款紀錄、也沒有申報紀錄，說不清當初到底是怎麼回事。）";
  }
  return "\n\n（後記：工地那次，你雖然當場婉拒了禮盒，但沒有回政風室完成登錄。後來耳聞承包商私下跟人說「其實有送成」，你才發現自己百口莫辯——不管當初收或不收，沒有留下紀錄，就沒有東西能還你清白。）";
}

// ---- 結局（案件二）----
const ENDINGS2 = {
  hero2: {
    title: "誠信守護者 II",
    text: "你不只識破了規格書量身訂做的問題，也主動處理了評選委員的利益衝突，讓這次採購案重新回到公平公正的軌道上。同事看見了：把關，不是找麻煩，而是讓大家都安心。",
  },
  shaky2: {
    title: "遲來的堅持",
    text: "你最終要求重新檢視規格，方向是對的。只是過程中有些環節處理得不夠完整，讓自己一度陷入尷尬，也提醒你下次疑慮出現時，要更早、更完整地處理。",
  },
  compromise2: {
    title: "沉默的代價",
    text: "你選擇照原本流程送出去。評選結果出爐後不久，這起綁標疑慮被廠商間的糾紛捅了出來，回頭追查時發現你其實早就知情——這不只是採購問題，也讓你被捲入調查。",
  },
  missed2: {
    title: "沒發現的裂縫",
    text: "評選會議照常舉行，你也沒有多想。後來這批設備陸續出問題，你才想起規格書那些「剛好對得上」的細節……如果當初多問一句，或許能提早發現。",
  },
};

function computeEndingKey2(state) {
  if (state.flags.reportedUp2) {
    return state.flags.raisedConflict && state.integrity >= 80 ? "hero2" : "shaky2";
  }
  if (state.flags.coveredUp2) return "compromise2";
  return "missed2";
}

// 不論當初赴約或婉拒飯局邀約，只要沒有完成政風登錄，事後都可能說不清——
function getInviteRegistrationNote(state) {
  if (!state.flags.vendorInvited || state.flags.inviteRegistered) return "";
  if (state.flags.acceptedInvite) {
    return "\n\n（後記：那次飯局，你後來沒有回政風室登錄。評選結果公布後，有人質疑你跟廠商私下有往來，你才發現自己說不清那頓飯到底吃了什麼、談了什麼。）";
  }
  return "\n\n（後記：那次廠商邀約，你雖然婉拒了，但沒有回政風室完成登錄。後來耳聞廠商私下跟人說「其實有一起吃飯」，你才發現自己百口莫辯——不管去或不去，沒有留下紀錄，就沒有東西能還你清白。）";
}
