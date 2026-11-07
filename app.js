
const TYPES = [
  ["鋁罐",8,4],["IPA&PA",24,4],["鋁罐_美式",8,2],
  ["拉格",4,4],["皮爾森",4,2],["維也納",4,1],
  ["琥珀",4,1],["波特",4,1],["司陶特",4,1],
  ["矮瓶",4,1],["英式",8,1],["台灣",8,2],
  ["其他",8,1],["比利時",8,1],["黃金",4,2],
  ["金黃強",4,2],["雙倍",4,2],["三倍",4,2],
  ["四倍",4,2],["強黑",4,2],["白",8,2],
  ["酸",8,1],["勃克&蘇格蘭",8,1],["日本",8,1],
  ["水果",24,6],["蘭比克",8,2],["德式",16,4],
  ["大瓶",16,2]
];

const KEY = "beerOrderSystem";
let data;

try {
  data = JSON.parse(localStorage.getItem(KEY) || "{}");
} catch {
  data = {};
}

if (!data || typeof data !== "object" || Array.isArray(data)) {
  data = {};
}

if (!data.stock || typeof data.stock !== "object") {
  data.stock = {};
}

if (!Array.isArray(data.products)) {
  data.products = [];
}

if (!data.orders || typeof data.orders !== "object") {
  data.orders = {};
}

if (!data.importNameRules || typeof data.importNameRules !== "object") {
  data.importNameRules = {};
}

if (!data.importStyleRules || typeof data.importStyleRules !== "object" || Array.isArray(data.importStyleRules)) {
  data.importStyleRules = {};
}

data.products.forEach(p => {
  if (!p.location) p.location = "none";
});

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function id() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function num(value) {
  return Math.max(0, Number(value) || 0);
}

function typeOptions() {
  return TYPES.map(t =>
    `<option value="${safe(t[0])}">${safe(t[0])}</option>`
  ).join("");
}

document.querySelector("#productType").innerHTML = typeOptions();
document.querySelector("#filterType").innerHTML += typeOptions();

// ==========================
// 頁面切換
// ==========================

document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".tab").forEach(b =>
      b.classList.remove("active")
    );

    document.querySelectorAll(".page").forEach(p =>
      p.classList.remove("active")
    );

    button.classList.add("active");

    document.getElementById(
      button.dataset.page
    ).classList.add("active");

    renderOrders();
    renderProducts();
  };
});

// ==========================
// 第一頁：庫存盤點
// ==========================

function renderStock() {
  const tbody = document.querySelector("#stockTable");
  const headerRow = tbody.closest("table")?.querySelector("thead tr");

  if (headerRow) {
    headerRow.innerHTML = `
      <th>啤酒類型</th>
      <th>冰箱現有（排）</th>
      <th>櫃子現有（排）</th>
    `;
  }

  tbody.innerHTML = TYPES.map(([type]) => {
    const stock = data.stock[type] || {
      fridge: 0,
      cabinet: 0
    };

    return `
      <tr data-type="${safe(type)}">
        <td>${safe(type)}</td>
        <td>
          <input class="fridge"
            type="number" min="0"
            inputmode="numeric"
            value="${num(stock.fridge)}">
        </td>
        <td>
          <input class="cabinet"
            type="number" min="0"
            inputmode="numeric"
            value="${num(stock.cabinet)}">
        </td>
      </tr>
    `;
  }).join("");
}

document.querySelector("#saveStock").onclick = () => {
  document.querySelectorAll("#stockTable tr").forEach(row => {
    data.stock[row.dataset.type] = {
      fridge: num(row.querySelector(".fridge").value),
      cabinet: num(row.querySelector(".cabinet").value)
    };
  });

  save();
  alert("庫存已儲存");
  renderOrders();
};

// ==========================
// 新增商品
// ==========================

document.querySelector("#addVendor").onclick = () => {
  const input = document.createElement("input");
  input.className = "vendor";
  input.placeholder = "供應商名稱";
  input.required = true;

  document.querySelector("#vendorInputs").append(input);
};

document.querySelector("#addForm").onsubmit = event => {
  event.preventDefault();

  const name = document.querySelector("#productName").value.trim();
  const type = document.querySelector("#productType").value;

  const vendors = [...document.querySelectorAll(".vendor")]
    .map(input => input.value.trim())
    .filter(Boolean);

  if (!name || !vendors.length) {
    alert("請填寫商品名稱與供應商");
    return;
  }

  data.products.push({
    id: id(),
    name,
    type,
    vendors: [...new Set(vendors)],
    active: true,
    location: "none"
  });

  save();
  event.target.reset();

  document.querySelector("#vendorInputs").innerHTML =
    '<input class="vendor" required placeholder="供應商名稱">';

  renderProducts();
  renderOrders();

  alert("商品新增成功");
};

// ==========================
// 第二頁：商品資料
// ==========================

function renderProducts() {
  const keyword = (
    document.querySelector("#searchProduct").value || ""
  ).trim().toLowerCase();

  const filter = document.querySelector("#filterType").value;
  const container = document.querySelector("#productList");

  if (!keyword && !filter) {
    container.innerHTML =
      "<p>請輸入商品名稱、供應商，或選擇商品種類後搜尋。</p>";
    return;
  }

  const products = data.products.filter(p =>
    p.active !== false &&
    (!filter || p.type === filter) &&
    (
      (p.name || "").toLowerCase().includes(keyword) ||
      (p.vendors || []).some(v =>
        String(v).toLowerCase().includes(keyword)
      )
    )
  );

  if (!products.length) {
    container.innerHTML = "<p>沒有找到符合條件的商品。</p>";
    return;
  }

  container.innerHTML = products.map(p => {
    const location = p.location || "none";

    return `
      <div class="card">
        <h3>${safe(p.name)}</h3>
        <p>類型：${safe(p.type)}</p>
        <p>供應商：${safe((p.vendors || []).join("、"))}</p>

        <label>是否有貨</label>
        <select class="productLocation"
          data-product-id="${safe(p.id)}">
          <option value="none"
            ${location === "none" ? "selected" : ""}>無</option>
          <option value="fridge"
            ${location === "fridge" ? "selected" : ""}>冰箱</option>
          <option value="cabinet"
            ${location === "cabinet" ? "selected" : ""}>櫃子</option>
        </select>

        <button onclick="editVendors('${safe(p.id)}')">
          編輯供應商
        </button>

        <button onclick="disableProduct('${safe(p.id)}')">
          停用商品
        </button>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".productLocation").forEach(select => {
    select.onchange = () => {
      const product = data.products.find(
        p => p.id === select.dataset.productId
      );

      if (!product) return;

      product.location = select.value;
      save();
      renderProducts();
      renderOrders();
    };
  });
}

document.querySelector("#searchProduct").oninput = renderProducts;
document.querySelector("#filterType").onchange = renderProducts;

function editVendors(productId) {
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  const result = prompt(
    "輸入供應商，以逗號分隔",
    (product.vendors || []).join(", ")
  );

  if (result === null) return;

  product.vendors = [...new Set(
    result.split(/[,，]/)
      .map(v => v.trim())
      .filter(Boolean)
  )];

  save();
  renderProducts();
  renderOrders();
}

function disableProduct(productId) {
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  if (confirm("確定停用這個商品？")) {
    product.active = false;
    save();
    renderProducts();
    renderOrders();
  }
}

// ==========================
// 第三頁：叫貨建議
// ==========================

function getAvailableProducts() {
  return data.products.filter(
    p => p.active !== false &&
    (p.location || "none") === "none"
  );
}

// 冰箱與櫃子合併計算缺貨排數
function getOrderDeficit(type, fridgeTarget, cabinetTarget) {
  const stock = data.stock[type] || {
    fridge: 0,
    cabinet: 0
  };

  const targetTotal = fridgeTarget + cabinetTarget;
  const actualTotal =
    num(stock.fridge) + num(stock.cabinet);

  return Math.max(0, targetTotal - actualTotal);
}

function renderOrders() {
  const container = document.querySelector("#orderList");
  if (!container) return;

  const available = getAvailableProducts();
  const html = [];

  TYPES.forEach(([type, fridgeTarget, cabinetTarget]) => {
    const totalDeficit = getOrderDeficit(
      type,
      fridgeTarget,
      cabinetTarget
    );

    // 庫存總數足夠，不需要叫貨
    if (totalDeficit === 0) return;

    const products = available.filter(p => p.type === type);
    if (!products.length) return;

    const vendorGroups = {};

    products.forEach(product => {
      [...new Set(product.vendors || [])].forEach(vendor => {
        if (!vendorGroups[vendor]) vendorGroups[vendor] = [];
        vendorGroups[vendor].push(product.name);
      });
    });

    // 只顯示供應商名稱，點開才顯示品項
    const vendorHtml = Object.keys(vendorGroups)
      .sort((a, b) => a.localeCompare(b, "zh-Hant"))
      .map(vendor => {
        const names = [...new Set(vendorGroups[vendor])];

        return `
          <details style="
            margin: 8px 0;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
          ">
            <summary style="
              cursor: pointer;
              font-weight: bold;
            ">
              ${safe(vendor)}
              <span style="
                font-size: 12px;
                font-weight: normal;
                opacity: 0.65;
              ">
                （${names.length} 款）
              </span>
            </summary>

            <div style="
              padding: 10px 4px 2px;
              line-height: 1.9;
            ">
              ${names.map(name => `
                <div>・${safe(name)}</div>
              `).join("")}
            </div>
          </details>
        `;
      }).join("");

    html.push(`
      <div class="card">
        <h3>${safe(type)}</h3>
        <p><strong>需叫 ${totalDeficit} 排</strong></p>
        ${vendorHtml}
      </div>
    `);
  });

  container.innerHTML = html.length
    ? html.join("")
    : "<p>目前沒有需要補貨且有可叫商品的類型。</p>";
}

// 匯出叫貨建議 CSV
document.querySelector("#exportOrders").onclick = () => {
  const rows = [
    ["啤酒類型", "建議叫貨排數", "供應商", "商品名稱"]
  ];

  const available = getAvailableProducts();

  TYPES.forEach(([type, fridgeTarget, cabinetTarget]) => {
    const totalDeficit = getOrderDeficit(
      type,
      fridgeTarget,
      cabinetTarget
    );

    // 不匯出庫存已足夠的類型
    if (totalDeficit === 0) return;

    available.filter(p => p.type === type).forEach(product => {
      [...new Set(product.vendors || [])].forEach(vendor => {
        rows.push([
          type,
          totalDeficit,
          vendor,
          product.name
        ]);
      });
    });
  });

  if (rows.length === 1) {
    alert("目前沒有可匯出的叫貨品項。");
    return;
  }

  const csv = "\uFEFF" + rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "可叫貨品項清單.csv";
  link.click();

  URL.revokeObjectURL(url);
};

// ==========================
// 商品清單匯出／匯入
// ==========================

function downloadJSON(content, filename) {
  const blob = new Blob(
    [JSON.stringify(content, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function chooseJSONFile(callback) {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";

  document.body.appendChild(input);

  input.onchange = async () => {
    const file = input.files[0];

    if (!file) {
      input.remove();
      return;
    }

    try {
      callback(JSON.parse(await file.text()));
    } catch (error) {
      alert("檔案讀取失敗，請確認是否為正確的商品清單。");
    } finally {
      input.remove();
    }
  };

  input.click();
}

document.querySelector("#exportProducts").onclick = () => {
  downloadJSON({
    format: "abv-product-list",
    version: 2,
    products: data.products,
    classificationRules: data.importNameRules,
    styleRules: data.importStyleRules
  }, "ABV商品清單.json");
};

document.querySelector("#importProducts").onclick = () => {
  chooseJSONFile(parsed => {
    const products = Array.isArray(parsed)
      ? parsed
      : parsed?.products;

    if (!Array.isArray(products) || !products.every(p =>
      p &&
      typeof p === "object" &&
      typeof p.name === "string" &&
      typeof p.type === "string" &&
      Array.isArray(p.vendors) &&
      p.vendors.every(v => typeof v === "string")
    )) {
      alert("商品清單格式不正確，無法匯入。");
      return;
    }

    if (!confirm(
      `即將匯入 ${products.length} 項商品，並取代目前的商品清單。\n\n庫存數量不會受到影響，匯入商品會預設為無貨。\n\n確定繼續嗎？`
    )) return;

    data.products = products.map(p => ({
      id: p.id || id(),
      name: p.name,
      type: p.type,
      vendors: [...new Set(
        p.vendors.map(v => v.trim()).filter(Boolean)
      )],
      active: p.active !== false,
      location: "none"
    }));

    const importedRules =
      parsed && !Array.isArray(parsed)
        ? parsed.classificationRules
        : null;

    if (
      importedRules &&
      typeof importedRules === "object" &&
      !Array.isArray(importedRules)
    ) {
      Object.entries(importedRules).forEach(([nameKey, type]) => {
        if (
          typeof nameKey === "string" &&
          typeof type === "string" &&
          TYPES.some(t => t[0] === type)
        ) {
          data.importNameRules[nameKey] = type;
        }
      });
    }

    const importedStyles =
      parsed && !Array.isArray(parsed)
        ? parsed.styleRules
        : null;

    if (
      importedStyles &&
      typeof importedStyles === "object" &&
      !Array.isArray(importedStyles)
    ) {
      Object.entries(importedStyles).forEach(([key, type]) => {
        if (
          typeof type === "string" &&
          TYPES.some(t => t[0] === type)
        ) {
          data.importStyleRules[key] = type;
        }
      });
    }

    save();
    renderProducts();
    renderOrders();

    alert(`成功匯入 ${products.length} 項商品！`);
  });
};

// ==========================
// 批次匯入：智慧學習
// ==========================

let pendingBulk = [];

function normalizeProductName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s　\-‐‑–—_・,，.。()（）\[\]【】]/g, "")
    .trim();
}

function normalizeStyle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function styleRuleKey(supplier, sourceType) {
  return normalizeStyle(supplier) +
    "::" +
    normalizeStyle(sourceType);
}

// ==========================
// 智慧分類核心
// ==========================

function inferType(productName, sourceType, supplier, volume, canNote) {
  const combined = `${productName} ${sourceType}`.toLowerCase();

  const valid = type =>
    TYPES.some(t => t[0] === type);

  const learned =
    data.importNameRules[normalizeProductName(productName)];

  const styleKey = styleRuleKey(supplier, sourceType);
  const learnedStyle = data.importStyleRules[styleKey];

  // 包裝規則優先
  if (volume === 750) {
    return {
      type: "大瓶",
      reason: "750ml → 大瓶（固定規則）"
    };
  }

  if (canNote) {
    return {
      type: "鋁罐",
      reason: "供應商註明罐裝 → 鋁罐（固定規則）"
    };
  }

  // 第一層：曾確認的商品
  if (learned && valid(learned)) {
    return {
      type: learned,
      reason: "曾人工確認的商品分類"
    };
  }

  // 第二層：供應商風格學習
  if (sourceType && learnedStyle && valid(learnedStyle)) {
    return {
      type: learnedStyle,
      reason: "已學習此供應商的風格分類"
    };
  }

  // 第三層：風格關鍵字
  // 複合風格放前面，避免被一般風格覆蓋
  const rules = [
    [
      /琥珀|amber(?:\s|-)*(?:ale|lager)?/i,
      "琥珀"
    ],
    [
      /維也納|vienna(?:\s|-)*lager|\bvienna\b/i,
      "維也納"
    ],
    [
      /酸愛爾|酸艾爾|柏林小麥|berliner[\s-]*weisse|鹽小麥|\bgose\b|農舍愛爾|農舍艾爾|farmhouse[\s-]*ale|季節啤酒|\bsaison\b|法蘭德斯紅|法蘭德斯棕|flanders[\s-]*(?:red|brown)|oud[\s-]*bruin/i,
      "酸"
    ],
    [
      /比利時.{0,8}(金黃強|黃金強)|金黃強.{0,6}(愛爾|艾爾)|belgian.{0,12}strong golden/,
      "金黃強"
    ],
    [
      /比利時.{0,8}(黃金|金色).{0,5}(愛爾|艾爾)|比利時黃金|belgian golden ale/,
      "黃金"
    ],
    [
      /比利時.{0,8}(雙倍|dubbel)|belgian dubbel/,
      "雙倍"
    ],
    [
      /比利時.{0,8}(三倍|tripel)|belgian tripel/,
      "三倍"
    ],
    [
      /比利時.{0,8}(四倍|quadrupel|quad)|belgian quadrupel/,
      "四倍"
    ],
    [
      /比利時.{0,8}(強黑|深色烈性)|belgian dark strong|belgian strong dark/,
      "強黑"
    ],
    [
      /西打酒|蘋果酒|\bcider\b|水果白啤酒|水果白啤/,
      "水果"
    ],
    [
      /勃克|博克|\bbock\b|doppelbock|eisbock|蘇格蘭|蘇格蘭愛爾|scottish|scotch ale|wee heavy|\bscotch\b/,
      "勃克&蘇格蘭"
    ],
    [
      /慕尼黑|munich|德式|德國|german|巴伐利亞|bavarian/,
      "德式"
    ],
    [
      /英式|英國|british|english/,
      "英式"
    ],
    [
      /捷克皮爾森|皮爾森|pilsner|pilsener/,
      "皮爾森"
    ],
    [
      /酸啤|酸艾爾|\bsour\b|\bgose\b/,
      "酸"
    ],
    [
      /斯陶特|司陶特|世濤|stout/,
      "司陶特"
    ],
    [
      /波特|porter/,
      "波特"
    ],
    [
      /淡愛爾|淡艾爾|美式淡愛爾|美式淡艾爾|pale ale|\bipa\b/,
      "IPA&PA"
    ],
    [
      /小麥|白啤|weizen|witbier|wheat/,
      "白"
    ],
    [
      /拉格|lager/,
      "拉格"
    ],
    [
      /比利時|belgian|修道院|trappist/,
      "比利時"
    ],
    [
      /水果|fruit|果啤/,
      "水果"
    ],
    [
      /無酒精|0度|non.?alcohol|alcohol.?free/,
      "其他"
    ]
  ];

  for (const [pattern, type] of rules) {
    if (pattern.test(combined)) {
      return {
        type,
        reason: `風格關鍵字推測：${type}（可修改）`
      };
    }
  }

  return {
    type: "其他",
    reason: "無明確分類線索，請人工確認"
  };
}

function getBulkTypeOptions(selected) {
  return TYPES.map(t => `
    <option value="${safe(t[0])}"
      ${t[0] === selected ? "selected" : ""}>
      ${safe(t[0])}
    </option>
  `).join("");
}

// ==========================
// 解析供應商資料
// ==========================

function splitSupplierLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  let columns = trimmed
    .split(/\t+/)
    .map(v => v.trim())
    .filter(Boolean);

  if (columns.length < 2) {
    columns = trimmed
      .split(/\s{2,}/)
      .map(v => v.trim())
      .filter(Boolean);
  }

  if (!columns.length) return null;

  const name = columns[0];
  const sourceType = columns[1] || "";

  const all = columns.join(" ");

  // 擷取容量：750ml、750 ml、750毫升
  const match = all.match(
    /(?:^|[^\d])(\d{2,4})\s*(?:ml|毫升|㏄|cc)(?![a-z])/i
  );

  const volume = match ? Number(match[1]) : null;

  // 供應商備註或單位標示罐裝
  const canNote = columns.slice(1).some(c =>
    /罐|can(?:ned)?/i.test(c)
  );

  return {
    name,
    sourceType,
    volume,
    canNote
  };
}

function existingProductByName(name) {
  const key = normalizeProductName(name);

  return data.products.find(p =>
    normalizeProductName(p.name) === key &&
    p.active !== false
  ) || null;
}

// ==========================
// 批次匯入檢視卡片
// ==========================

function renderBulkReview() {
  const review = document.querySelector("#bulkReview");
  const confirmArea = document.querySelector("#bulkConfirmArea");

  if (!pendingBulk.length) {
    review.innerHTML = "";
    confirmArea.hidden = true;
    return;
  }

  review.innerHTML =
    `<h3>請逐筆檢視（${pendingBulk.length} 筆）</h3>` +
    pendingBulk.map((item, index) => {
      const duplicate = existingProductByName(item.name);

      const duplicateAction =
        item.action || (duplicate ? "merge" : "new");

      const matchLabel = duplicate
        ? `找到既有商品：${safe(duplicate.name)}（將加入供應商）`
        : "尚未找到完全相同的商品";

      return `
        <article class="bulk-review-card"
          data-bulk-index="${index}">

          <div class="bulk-card-top">
            <span class="bulk-index">
              商品 ${index + 1} / ${pendingBulk.length}
            </span>
            <span class="muted">
              ${safe(item.reason || "請確認分類")}
            </span>
          </div>

          <div class="bulk-select-row">
            <input type="checkbox"
              class="bulk-include"
              ${item.include ? "checked" : ""}
              aria-label="選擇匯入此商品">
            <strong>納入本次匯入</strong>
          </div>

          <label>商品名稱（可編輯）</label>
          <input class="bulk-name"
            value="${safe(item.name)}"
            autocomplete="off">

          <div class="raw-type">
            供應商原始種類：
            ${safe(item.sourceType || "（未提供）")}
            ｜容量：
            ${item.volume ? safe(item.volume + "ml") : "未標示"}
            ${item.canNote ? "｜供應商註明罐裝" : ""}
          </div>

          <label>網站分類（下拉選單）</label>
          <select class="bulk-type">
            ${getBulkTypeOptions(item.type)}
          </select>

          <div class="bulk-select-row" style="margin:10px 0">
            <input type="checkbox"
              class="bulk-learn-style"
              ${item.learnStyle ? "checked" : ""}
              ${!item.sourceType ? "disabled" : ""}>

            <span>
              記住此供應商的「${safe(item.sourceType || "未提供風格")}」
              分類（選填）
            </span>
          </div>

          <div class="bulk-action">
            <label>匯入方式</label>
            <div class="muted">${matchLabel}</div>

            <select class="bulk-action-select"
              ${duplicate ? "" : "disabled"}>

              <option value="new"
                ${duplicateAction === "new" ? "selected" : ""}>
                建立新商品
              </option>

              <option value="merge"
                ${duplicateAction === "merge" ? "selected" : ""}>
                併入既有商品並加入供應商
              </option>

            </select>
          </div>

        </article>
      `;
    }).join("");

  confirmArea.hidden = false;
  updateBulkCount();

  review.querySelectorAll(".bulk-review-card").forEach(card => {
    const index = Number(card.dataset.bulkIndex);

    card.querySelector(".bulk-include").onchange = e => {
      pendingBulk[index].include = e.target.checked;
      updateBulkCount();
    };

    card.querySelector(".bulk-name").oninput = e => {
      pendingBulk[index].name = e.target.value;
    };

    card.querySelector(".bulk-type").onchange = e => {
      pendingBulk[index].type = e.target.value;
    };

    card.querySelector(".bulk-learn-style").onchange = e => {
      pendingBulk[index].learnStyle = e.target.checked;
    };

    card.querySelector(".bulk-action-select").onchange = e => {
      pendingBulk[index].action = e.target.value;
    };
  });
}

function updateBulkCount() {
  const count = pendingBulk.filter(item =>
    item.include && item.name.trim()
  ).length;

  document.querySelector("#bulkCount").textContent =
    `已勾選 ${count} 筆商品；匯入前會再次檢查重複商品。`;
}

// ==========================
// 整理並檢視商品
// ==========================

document.querySelector("#parseBulk").onclick = () => {
  const supplier =
    document.querySelector("#bulkSupplier").value.trim();

  const raw =
    document.querySelector("#bulkText").value;

  if (!supplier) {
    alert("請先輸入供應商名稱。");
    return;
  }

  if (!raw.trim()) {
    alert("請貼上供應商商品資料。");
    return;
  }

  const parsed = raw
    .split(/\r?\n/)
    .map(splitSupplierLine)
    .filter(item => item && item.name);

  if (!parsed.length) {
    alert("沒有辨識到商品資料，請確認貼上的內容。");
    return;
  }

  pendingBulk = parsed.map(item => {
    const suggestion = inferType(
      item.name,
      item.sourceType,
      supplier,
      item.volume,
      item.canNote
    );

    return {
      ...item,
      type: suggestion.type,
      reason: suggestion.reason,
      include: true,
      learnStyle: false,
      action: existingProductByName(item.name)
        ? "merge"
        : "new"
    };
  });

  renderBulkReview();

  document.querySelector("#bulkReview").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};

// ==========================
// 取消批次檢視
// ==========================

document.querySelector("#cancelBulk").onclick = () => {
  if (
    pendingBulk.length &&
    !confirm("要取消這次檢視嗎？尚未匯入的資料會清除。")
  ) return;

  pendingBulk = [];
  renderBulkReview();
};

// ==========================
// 確認批次匯入
// ==========================

document.querySelector("#confirmBulk").onclick = () => {
  const supplier =
    document.querySelector("#bulkSupplier").value.trim();

  const selected = pendingBulk.filter(item =>
    item.include && item.name.trim()
  );

  if (!selected.length) {
    alert("請至少勾選一筆商品。");
    return;
  }

  if (!supplier) {
    alert("請填寫供應商名稱。");
    return;
  }

  if (!confirm(
    `即將處理 ${selected.length} 筆商品。\n\n商品名稱與分類會依你在檢視畫面確認的內容匯入；庫存不會改變。\n\n確定匯入？`
  )) return;

  // 同一供應商的相同風格，不允許同批學習成不同分類
  const newStyleRules = {};

  for (const item of selected) {
    if (!item.learnStyle || !item.sourceType) continue;

    const key = styleRuleKey(supplier, item.sourceType);

    if (
      newStyleRules[key] &&
      newStyleRules[key] !== item.type
    ) {
      alert(
        `「${item.sourceType}」在本批次選了不同分類，請取消部分「記住風格」勾選後再匯入。`
      );
      return;
    }

    newStyleRules[key] = item.type;
  }

  let added = 0;
  let merged = 0;

  selected.forEach(item => {
    const name = item.name.trim();

    // 記住人工確認的商品分類
    data.importNameRules[
      normalizeProductName(name)
    ] = item.type;

    let existing = item.action === "merge"
      ? existingProductByName(name)
      : null;

    if (!existing && item.action !== "new") {
      existing = existingProductByName(name);
    }

    if (existing) {
      existing.vendors = [...new Set([
        ...(existing.vendors || []),
        supplier
      ].filter(Boolean))];

      existing.type = item.type;
      merged++;
    } else {
      data.products.push({
        id: id(),
        name,
        type: item.type,
        vendors: supplier ? [supplier] : [],
        active: true,
        location: "none"
      });

      added++;
    }
  });

  // 儲存使用者勾選的風格學習紀錄
  Object.assign(data.importStyleRules, newStyleRules);

  save();

  pendingBulk = [];
  renderBulkReview();
  renderProducts();
  renderOrders();

  document.querySelector("#bulkText").value = "";

  alert(
    `批次匯入完成！\n新增商品：${added} 筆\n合併供應商：${merged} 筆`
  );
};

// ==========================
// 啟動網站
// ==========================

renderStock();
renderProducts();
renderOrders();


// ==========================================
// ABV 升級：複數類型＋商品編輯
// 適用於目前的 app.js
// 請整段貼在檔案最底部
// ==========================================

(function () {
  "use strict";

  const ABV_TYPES = TYPES.map(item => item[0]);

  // --------------------------
  // 1. 舊資料相容
  // --------------------------

  function normalizeTypes(product) {
    const oldTypes = Array.isArray(product.types)
      ? product.types
      : [];

    let types = [...new Set(
      oldTypes.filter(t => ABV_TYPES.includes(t))
    )];

    const primary = ABV_TYPES.includes(product.type)
      ? product.type
      : types[0];

    if (primary && !types.includes(primary)) {
      // 舊版批次匯入若改變主要分類，
      // 以新分類取代原主要分類
      const previousPrimary = product._abvPrimary;

      if (
        previousPrimary &&
        types.includes(previousPrimary)
      ) {
        types = types.filter(t => t !== previousPrimary);
      }

      types.unshift(primary);
    }

    if (!types.length) {
      types = ["其他"];
    }

    product.types = types;
    product.type = primary || types[0];
    product._abvPrimary = product.type;
  }

  data.products.forEach(normalizeTypes);

  // 擴充原本儲存功能
  const originalSave = save;

  save = function () {
    data.products.forEach(normalizeTypes);
    originalSave();
  };

  function hasType(product, type) {
    return (
      Array.isArray(product.types)
        ? product.types
        : [product.type]
    ).includes(type);
  }

  function uniqueVendors(text) {
    return [...new Set(
      String(text || "")
        .split(/[,，、\n]+/)
        .map(v => v.trim())
        .filter(Boolean)
    )];
  }

  // --------------------------
  // 2. 共用複選介面
  // --------------------------

  function typePickerHTML(selected) {
    const values = Array.isArray(selected)
      ? selected
      : [];

    const chips = values.map(t => `
      <span style="
        display:inline-flex;
        align-items:center;
        padding:5px 10px;
        border-radius:20px;
        background:#e8edf5;
        color:#202b3b;
        font-size:13px;
      ">
        ${safe(t)}
      </span>
    `).join("");

    const options = ABV_TYPES.map(type => `
      <label style="
        display:flex;
        align-items:center;
        justify-content:center;
        gap:4px;
        padding:9px 5px;
        border:1px solid #ccc;
        border-radius:8px;
        font-size:12px;
        cursor:pointer;
        text-align:center;
        min-height:32px;
      ">
        <input
          type="checkbox"
          class="abv-type-check"
          value="${safe(type)}"
          ${values.includes(type) ? "checked" : ""}
          style="width:auto;margin:0"
        >
        <span>${safe(type)}</span>
      </label>
    `).join("");

    return `
      <div class="abv-type-picker">
        <div style="
          font-weight:bold;
          margin-bottom:8px;
        ">
          啤酒類型（可複選）
        </div>

        <div class="abv-selected-types"
          style="
            display:flex;
            flex-wrap:wrap;
            gap:6px;
            margin-bottom:10px;
          ">
          ${chips || "尚未選擇類型"}
        </div>

        <details>
          <summary style="
            cursor:pointer;
            padding:10px;
            border:1px solid #bbb;
            border-radius:8px;
            margin-bottom:10px;
          ">
            ＋ 新增／移除啤酒類型
          </summary>

          <div style="
            display:grid;
            grid-template-columns:repeat(3,minmax(0,1fr));
            gap:7px;
            margin-top:10px;
          ">
            ${options}
          </div>
        </details>
      </div>
    `;
  }

  function selectedTypes(picker) {
    if (!picker) return [];

    return [...picker.querySelectorAll(
      ".abv-type-check:checked"
    )].map(input => input.value);
  }

  function refreshPicker(picker) {
    const values = selectedTypes(picker);

    const display = picker.querySelector(
      ".abv-selected-types"
    );

    display.innerHTML = values.length
      ? values.map(type => `
          <span style="
            display:inline-flex;
            align-items:center;
            padding:5px 10px;
            border-radius:20px;
            background:#e8edf5;
            color:#202b3b;
            font-size:13px;
          ">
            ${safe(type)}
          </span>
        `).join("")
      : "<span>尚未選擇類型</span>";
  }

  function bindPicker(picker) {
    picker.querySelectorAll(
      ".abv-type-check"
    ).forEach(input => {
      input.onchange = () => refreshPicker(picker);
    });
  }

  // --------------------------
  // 3. 新增商品：複數類型
  // --------------------------

  const addTypeSelect = document.querySelector(
    "#productType"
  );

  const addForm = document.querySelector("#addForm");

  const addPicker = document.createElement("div");
  addPicker.id = "abv-add-type-picker";

  addPicker.innerHTML = typePickerHTML(
    addTypeSelect.value
      ? [addTypeSelect.value]
      : []
  );

  // 隱藏舊版單選下拉欄位
  addTypeSelect.style.display = "none";

  // 插入新版複選介面
  addTypeSelect.insertAdjacentElement(
    "afterend",
    addPicker
  );

  bindPicker(addPicker);

  // 取代舊版新增商品事件
  addForm.onsubmit = event => {
    event.preventDefault();

    const name = document.querySelector(
      "#productName"
    ).value.trim();

    const types = selectedTypes(addPicker);

    const vendors = [...new Set(
      [...document.querySelectorAll(
        "#vendorInputs .vendor"
      )]
        .map(input => input.value.trim())
        .filter(Boolean)
    )];

    if (!name) {
      alert("請輸入商品名稱");
      return;
    }

    if (!types.length) {
      alert("請至少選擇一種啤酒類型");
      return;
    }

    if (!vendors.length) {
      alert("請至少輸入一個供應商");
      return;
    }

    const duplicate = data.products.find(p =>
      p.active !== false &&
      normalizeProductName(p.name) ===
        normalizeProductName(name)
    );

    if (duplicate) {
      alert(
        "已有相同名稱的商品：" +
        duplicate.name +
        "\n請到商品資料頁面編輯。"
      );
      return;
    }

    data.products.push({
      id: id(),
      name,
      type: types[0],
      types,
      vendors,
      active: true,
      location: "none"
    });

    data.importNameRules[
      normalizeProductName(name)
    ] = types[0];

    save();

    addForm.reset();

    document.querySelector(
      "#vendorInputs"
    ).innerHTML = `
      <input
        class="vendor"
        required
        placeholder="供應商名稱"
      >
    `;

    // 重設類型選擇
    addPicker.innerHTML = typePickerHTML([]);
    bindPicker(addPicker);

    renderProducts();
    renderOrders();

    alert("商品新增成功！");
  };

  // --------------------------
  // 4. 商品資料：搜尋＋編輯
  // --------------------------

  renderProducts = function () {
    const keyword = (
      document.querySelector(
        "#searchProduct"
      ).value || ""
    ).trim().toLowerCase();

    const filter = document.querySelector(
      "#filterType"
    ).value;

    const container = document.querySelector(
      "#productList"
    );

    if (!keyword && !filter) {
      container.innerHTML =
        "<p>請輸入商品名稱、供應商，或選擇商品種類後搜尋。</p>";
      return;
    }

    const products = data.products.filter(p =>
      p.active !== false &&
      (!filter || hasType(p, filter)) &&
      (
        String(p.name || "")
          .toLowerCase()
          .includes(keyword) ||
        (p.vendors || []).some(v =>
          String(v)
            .toLowerCase()
            .includes(keyword)
        )
      )
    );

    if (!products.length) {
      container.innerHTML =
        "<p>沒有找到符合條件的商品。</p>";
      return;
    }

    container.innerHTML = products.map(p => {
      normalizeTypes(p);

      const location = p.location || "none";

      const typeBadges = p.types.map(type => `
        <span style="
          display:inline-block;
          padding:5px 9px;
          margin:2px 3px 2px 0;
          border-radius:20px;
          background:#e8edf5;
          color:#202b3b;
          font-size:12px;
        ">
          ${safe(type)}
        </span>
      `).join("");

      return `
        <div class="card"
          data-abv-product="${safe(p.id)}">

          <h3>${safe(p.name)}</h3>

          <div style="margin:8px 0">
            ${typeBadges}
          </div>

          <p>
            供應商：
            ${safe((p.vendors || []).join("、"))}
          </p>

          <label>是否有貨</label>

          <select class="abv-location">
            <option value="none"
              ${location === "none" ? "selected" : ""}>
              無
            </option>
            <option value="fridge"
              ${location === "fridge" ? "selected" : ""}>
              冰箱
            </option>
            <option value="cabinet"
              ${location === "cabinet" ? "selected" : ""}>
              櫃子
            </option>
          </select>

          <div style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-top:12px;
          ">
            <button
              type="button"
              class="abv-edit-button"
            >
              ✏️ 編輯商品
            </button>

            <button
              type="button"
              class="abv-disable-button"
            >
              停用商品
            </button>
          </div>

          <div
            class="abv-editor"
            hidden
            style="
              border:1px solid #ccc;
              border-radius:10px;
              padding:12px;
              margin-top:12px;
            "
          >
            <h4>編輯商品資料</h4>

            <label>商品名稱</label>
            <input
              class="abv-edit-name"
              value="${safe(p.name)}"
              style="
                width:100%;
                box-sizing:border-box;
                margin:6px 0 12px;
              "
            >

            ${typePickerHTML(p.types)}

            <label>供應商</label>

            <textarea
              class="abv-edit-vendors"
              rows="2"
              style="
                width:100%;
                box-sizing:border-box;
                margin:6px 0;
              "
            >${safe((p.vendors || []).join("、"))}</textarea>

            <p style="
              font-size:12px;
              opacity:.7;
            ">
              多個供應商可用逗號、頓號或換行分隔
            </p>

            <div style="
              display:flex;
              gap:8px;
              flex-wrap:wrap;
              margin-top:12px;
            ">
              <button
                type="button"
                class="abv-save-button"
              >
                儲存修改
              </button>

              <button
                type="button"
                class="abv-cancel-button"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(
      "[data-abv-product]"
    ).forEach(card => {
      const product = data.products.find(p =>
        String(p.id) ===
          card.dataset.abvProduct
      );

      if (!product) return;

      const editor = card.querySelector(
        ".abv-editor"
      );

      const picker = editor.querySelector(
        ".abv-type-picker"
      );

      bindPicker(picker);

      // 是否有貨
      card.querySelector(
        ".abv-location"
      ).onchange = event => {
        product.location = event.target.value;
        save();
        renderProducts();
        renderOrders();
      };

      // 展開編輯
      card.querySelector(
        ".abv-edit-button"
      ).onclick = () => {
        editor.hidden = !editor.hidden;
      };

      // 取消編輯
      card.querySelector(
        ".abv-cancel-button"
      ).onclick = () => {
        renderProducts();
      };

      // 停用商品
      card.querySelector(
        ".abv-disable-button"
      ).onclick = () => {
        if (!confirm(
          `確定停用「${product.name}」？`
        )) return;

        product.active = false;
        save();
        renderProducts();
        renderOrders();
      };

      // 儲存編輯
      card.querySelector(
        ".abv-save-button"
      ).onclick = () => {
        const newName = editor.querySelector(
          ".abv-edit-name"
        ).value.trim();

        const newTypes = selectedTypes(picker);

        const newVendors = uniqueVendors(
          editor.querySelector(
            ".abv-edit-vendors"
          ).value
        );

        if (!newName) {
          alert("商品名稱不能空白");
          return;
        }

        if (!newTypes.length) {
          alert("請至少選擇一種啤酒類型");
          return;
        }

        if (!newVendors.length) {
          alert("至少需要一個供應商");
          return;
        }

        const duplicate = data.products.find(p =>
          p.active !== false &&
          String(p.id) !== String(product.id) &&
          normalizeProductName(p.name) ===
            normalizeProductName(newName)
        );

        if (duplicate) {
          alert(
            "已有相同名稱的商品：" +
            duplicate.name
          );
          return;
        }

        const oldName = product.name;
        const oldType = product.type;

        product.name = newName;
        product.types = newTypes;
        product.type = newTypes[0];
        product._abvPrimary = newTypes[0];
        product.vendors = newVendors;

        const oldKey = normalizeProductName(
          oldName
        );

        const newKey = normalizeProductName(
          newName
        );

        // 修正舊商品分類學習
        if (
          oldKey !== newKey &&
          data.importNameRules[oldKey] === oldType
        ) {
          delete data.importNameRules[oldKey];
        }

        // 智慧分類保留第一個類型作為預設
        data.importNameRules[newKey] =
          newTypes[0];

        save();

        renderProducts();
        renderOrders();

        alert("商品資料已更新！");
      };
    });
  };

  // --------------------------
  // 5. 叫貨建議：支援多類型
  // --------------------------

  renderOrders = function () {
    const container = document.querySelector(
      "#orderList"
    );

    if (!container) return;

    const available = getAvailableProducts();
    const html = [];

    TYPES.forEach(([
      type,
      fridgeTarget,
      cabinetTarget
    ]) => {
      const deficit = getOrderDeficit(
        type,
        fridgeTarget,
        cabinetTarget
      );

      if (deficit === 0) return;

      // 一款酒可以符合多個類型
      const products = available.filter(p =>
        hasType(p, type)
      );

      if (!products.length) return;

      const vendorGroups = {};

      products.forEach(product => {
        [...new Set(
          product.vendors || []
        )].forEach(vendor => {
          if (!vendorGroups[vendor]) {
            vendorGroups[vendor] = [];
          }

          vendorGroups[vendor].push(
            product.name
          );
        });
      });

      const vendorHtml = Object.keys(
        vendorGroups
      )
        .sort((a, b) =>
          a.localeCompare(b, "zh-Hant")
        )
        .map(vendor => {
          const names = [...new Set(
            vendorGroups[vendor]
          )];

          return `
            <details style="
              margin:8px 0;
              border:1px solid #ddd;
              border-radius:8px;
              padding:10px;
            ">
              <summary style="
                cursor:pointer;
                font-weight:bold;
              ">
                ${safe(vendor)}
                <span style="
                  font-size:12px;
                  font-weight:normal;
                  opacity:.65;
                ">
                  （${names.length} 款）
                </span>
              </summary>

              <div style="
                padding:10px 4px 2px;
                line-height:1.9;
              ">
                ${names.map(name => `
                  <div>・${safe(name)}</div>
                `).join("")}
              </div>
            </details>
          `;
        }).join("");

      html.push(`
        <div class="card">
          <h3>${safe(type)}</h3>
          <p>
            <strong>
              需叫 ${deficit} 排
            </strong>
          </p>
          ${vendorHtml}
        </div>
      `);
    });

    container.innerHTML = html.length
      ? html.join("")
      : "<p>目前沒有需要補貨且有可叫商品的類型。</p>";
  };

  // --------------------------
  // 6. CSV：支援多類型
  // --------------------------

  document.querySelector(
    "#exportOrders"
  ).onclick = () => {
    const rows = [[
      "啤酒類型",
      "建議叫貨排數",
      "供應商",
      "商品名稱"
    ]];

    const available = getAvailableProducts();

    TYPES.forEach(([
      type,
      fridgeTarget,
      cabinetTarget
    ]) => {
      const deficit = getOrderDeficit(
        type,
        fridgeTarget,
        cabinetTarget
      );

      if (deficit === 0) return;

      available
        .filter(p => hasType(p, type))
        .forEach(product => {
          [...new Set(
            product.vendors || []
          )].forEach(vendor => {
            rows.push([
              type,
              deficit,
              vendor,
              product.name
            ]);
          });
        });
    });

    if (rows.length === 1) {
      alert("目前沒有可匯出的叫貨品項。");
      return;
    }

    const csv = "\uFEFF" + rows.map(row =>
      row.map(value =>
        `"${String(value ?? "")
          .replace(/"/g, '""')}"`
      ).join(",")
    ).join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "可叫貨品項清單.csv";
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // --------------------------
  // 7. 舊版批次匯入相容
  // --------------------------

  // 舊版批次匯入仍會產生單一 type。
  // 儲存時會自動建立 types 陣列。
  //
  // 若是新匯入的商品：
  //   type: "IPA&PA"
  //   types: ["IPA&PA"]
  //
  // 之後可以在商品資料頁面
  // 編輯成：
  //   types: ["IPA&PA", "矮瓶"]
  //
  // 商品清單 JSON 匯出會保留 types，
  // 匯入時另外由以下功能處理。

  const importButton = document.querySelector(
    "#importProducts"
  );

  importButton.onclick = () => {
    chooseJSONFile(parsed => {
      const products = Array.isArray(parsed)
        ? parsed
        : parsed?.products;

      if (
        !Array.isArray(products) ||
        !products.every(p =>
          p &&
          typeof p === "object" &&
          typeof p.name === "string" &&
          typeof p.type === "string" &&
          Array.isArray(p.vendors) &&
          p.vendors.every(v =>
            typeof v === "string"
          )
        )
      ) {
        alert("商品清單格式不正確，無法匯入。");
        return;
      }

      if (!confirm(
        `即將匯入 ${products.length} 項商品，並取代目前商品清單。\n\n庫存數量不受影響；商品是否有貨會重設為「無」。\n\n確定繼續嗎？`
      )) return;

      data.products = products.map(p => {
        const types = Array.isArray(p.types)
          ? [...new Set(
              p.types.filter(t =>
                ABV_TYPES.includes(t)
              )
            )]
          : [];

        const primary = ABV_TYPES.includes(p.type)
          ? p.type
          : types[0] || "其他";

        if (!types.includes(primary)) {
          types.unshift(primary);
        }

        return {
          id: p.id || id(),
          name: p.name,
          type: primary,
          types,
          _abvPrimary: primary,
          vendors: [...new Set(
            p.vendors
              .map(v => v.trim())
              .filter(Boolean)
          )],
          active: p.active !== false,
          location: "none"
        };
      });

      const importedRules =
        parsed && !Array.isArray(parsed)
          ? parsed.classificationRules
          : null;

      if (
        importedRules &&
        typeof importedRules === "object" &&
        !Array.isArray(importedRules)
      ) {
        Object.entries(importedRules).forEach(
          ([key, type]) => {
            if (ABV_TYPES.includes(type)) {
              data.importNameRules[key] = type;
            }
          }
        );
      }

      const importedStyles =
        parsed && !Array.isArray(parsed)
          ? parsed.styleRules
          : null;

      if (
        importedStyles &&
        typeof importedStyles === "object" &&
        !Array.isArray(importedStyles)
      ) {
        Object.entries(importedStyles).forEach(
          ([key, type]) => {
            if (ABV_TYPES.includes(type)) {
              data.importStyleRules[key] = type;
            }
          }
        );
      }

      save();
      renderProducts();
      renderOrders();

      alert(
        `成功匯入 ${products.length} 項商品！`
      );
    });
  };

  // --------------------------
  // 8. 更新頁面
  // --------------------------

  renderProducts();
  renderOrders();

})();
