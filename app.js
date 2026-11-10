
/* ABV Beer ERP — 整合版 app.js */

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
const VALID_TYPES = TYPES.map(row => row[0]);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const safe = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));

const num = value => Math.max(0, Number(value) || 0);

const id = () =>
  Date.now().toString(36) +
  Math.random().toString(36).slice(2);

const unique = values => [...new Set(values)];

const normalizeProductName = value =>
  String(value || "")
    .toLowerCase()
    .replace(/[\s　\-‐‑–—_・,，.。()（）\[\]【】]/g, "")
    .trim();

const normalizeStyle = value =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();

const styleRuleKey = (supplier, style) =>
  normalizeStyle(supplier) + "::" + normalizeStyle(style);

const vendorsFromText = value =>
  unique(
    String(value || "")
      .split(/[,，、\n]+/)
      .map(x => x.trim())
      .filter(Boolean)
  );

// ================================
// 資料初始化
// ================================

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

if (!data.importStyleRules || typeof data.importStyleRules !== "object") {
  data.importStyleRules = {};
}

// ================================
// 商品資料共用功能
// ================================

function getTypes(product) {
  const types = Array.isArray(product.types)
    ? product.types.filter(t => VALID_TYPES.includes(t))
    : [];

  if (
    VALID_TYPES.includes(product.type) &&
    !types.includes(product.type)
  ) {
    types.unshift(product.type);
  }

  return unique(types.length ? types : ["其他"]);
}

function normalizeProduct(product) {
  product.types = getTypes(product);

  product.type = VALID_TYPES.includes(product.type)
    ? product.type
    : product.types[0];

  if (!product.types.includes(product.type)) {
    product.types.unshift(product.type);
  }

  if (!product.location) {
    product.location = "none";
  }

  if (!Array.isArray(product.vendors)) {
    product.vendors = [];
  }

  if (!product.id) {
    product.id = id();
  }

  return product;
}

data.products.forEach(normalizeProduct);

function save() {
  data.products.forEach(normalizeProduct);
  localStorage.setItem(KEY, JSON.stringify(data));
}

function existingProductByName(name) {
  const key = normalizeProductName(name);

  return data.products.find(p =>
    p.active !== false &&
    normalizeProductName(p.name) === key
  ) || null;
}

function hasType(product, type) {
  return getTypes(product).includes(type);
}

function options(selected = "") {
  return TYPES.map(([type]) => `
    <option value="${safe(type)}"
      ${type === selected ? "selected" : ""}>
      ${safe(type)}
    </option>
  `).join("");
}

function badgeHTML(types) {
  return types.map(type => `
    <span style="
      display:inline-block;
      padding:5px 9px;
      margin:2px 4px 2px 0;
      border-radius:20px;
      background:#e8edf5;
      color:#202b3b;
      font-size:12px;
    ">
      ${safe(type)}
    </span>
  `).join("");
}

// ================================
// 共用多重分類選擇器
// ================================

function typePickerHTML(
  types,
  className = "abv-type-check"
) {
  return `
    <div class="abv-type-picker">

      <div class="abv-selected-types"
        style="
          display:flex;
          flex-wrap:wrap;
          gap:5px;
          margin:8px 0;
        ">
        ${badgeHTML(types)}
      </div>

      <details>
        <summary style="
          cursor:pointer;
          padding:10px;
          border:1px solid #bbb;
          border-radius:8px;
        ">
          ＋ 新增／移除啤酒類型
        </summary>

        <div style="
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:7px;
          margin:10px 0;
        ">
          ${VALID_TYPES.map(type => `
            <label style="
              display:flex;
              align-items:center;
              justify-content:center;
              gap:4px;
              padding:9px 4px;
              border:1px solid #ccc;
              border-radius:8px;
              font-size:12px;
              min-width:0;
            ">
              <input
                type="checkbox"
                class="${className}"
                value="${safe(type)}"
                ${types.includes(type) ? "checked" : ""}
                style="width:auto;margin:0"
              >
              <span>${safe(type)}</span>
            </label>
          `).join("")}
        </div>
      </details>
    </div>
  `;
}

function selectedTypes(
  picker,
  selector = ".abv-type-check"
) {
  if (!picker) return [];

  return [...picker.querySelectorAll(
    `${selector}:checked`
  )].map(input => input.value);
}

function bindPicker(
  picker,
  selector = ".abv-type-check",
  callback
) {
  if (!picker) return;

  picker.querySelectorAll(selector).forEach(input => {
    input.onchange = () => {
      const types = selectedTypes(picker, selector);

      const display = picker.querySelector(
        ".abv-selected-types"
      );

      if (display) {
        display.innerHTML =
          badgeHTML(types) || "尚未選擇類型";
      }

      if (callback) callback(types);
    };
  });
}

// ================================
// 頁面切換
// ================================

$$(".tab").forEach(button => {
  button.onclick = () => {
    $$(".tab").forEach(b =>
      b.classList.remove("active")
    );

    $$(".page").forEach(page =>
      page.classList.remove("active")
    );

    button.classList.add("active");

    const page = document.getElementById(
      button.dataset.page
    );

    if (page) {
      page.classList.add("active");
    }

    renderProducts();
    renderOrders();
  };
});

// ================================
// 第一頁：庫存盤點
// ================================

function renderStock() {
  const tbody = $("#stockTable");
  if (!tbody) return;

  const header = tbody.closest("table")
    ?.querySelector("thead tr");

  if (header) {
    header.innerHTML = `
      <th>啤酒類型</th>
      <th>冰箱現有（排）</th>
      <th>櫃子現有（排）</th>
    `;
  }

  tbody.innerHTML = TYPES.map(([type]) => {
    const stock = data.stock[type] || {};

    return `
      <tr data-type="${safe(type)}">
        <td>${safe(type)}</td>

        <td>
          <input
            class="fridge"
            type="number"
            min="0"
            inputmode="numeric"
            value="${num(stock.fridge)}"
          >
        </td>

        <td>
          <input
            class="cabinet"
            type="number"
            min="0"
            inputmode="numeric"
            value="${num(stock.cabinet)}"
          >
        </td>
      </tr>
    `;
  }).join("");
}

$("#saveStock").onclick = () => {
  $$("#stockTable tr").forEach(row => {
    data.stock[row.dataset.type] = {
      fridge: num(row.querySelector(".fridge").value),
      cabinet: num(row.querySelector(".cabinet").value)
    };
  });

  save();
  renderOrders();
  alert("庫存已儲存");
};

// ================================
// 新增商品
// ================================

$("#productType").innerHTML = options();
$("#filterType").innerHTML += options();

const addPicker = document.createElement("div");
addPicker.id = "abv-add-type-picker";
addPicker.innerHTML = typePickerHTML([]);

$("#productType").style.display = "none";

$("#productType").insertAdjacentElement(
  "afterend",
  addPicker
);

bindPicker(addPicker);

$("#addVendor").onclick = () => {
  const input = document.createElement("input");

  input.className = "vendor";
  input.placeholder = "供應商名稱";
  input.required = true;

  $("#vendorInputs").append(input);
};

$("#addForm").onsubmit = event => {
  event.preventDefault();

  const name = $("#productName").value.trim();
  const types = selectedTypes(addPicker);

  const vendors = unique(
    $$("#vendorInputs .vendor")
      .map(input => input.value.trim())
      .filter(Boolean)
  );

  if (!name || !types.length || !vendors.length) {
    alert("請填寫商品名稱、至少一種分類及供應商");
    return;
  }

  if (existingProductByName(name)) {
    alert("已有相同名稱的商品，請到商品資料頁編輯");
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
  event.target.reset();

  $("#vendorInputs").innerHTML = `
    <input
      class="vendor"
      required
      placeholder="供應商名稱"
    >
  `;

  addPicker.innerHTML = typePickerHTML([]);
  bindPicker(addPicker);

  renderProducts();
  renderOrders();

  alert("商品新增成功");
};

// ================================
// 第二頁：商品搜尋及編輯
// ================================

function renderProducts() {
  const container = $("#productList");

  const keyword = (
    $("#searchProduct").value || ""
  ).trim().toLowerCase();

  const filter = $("#filterType").value;

  if (!keyword && !filter) {
    container.innerHTML = `
      <p>
        請輸入商品名稱、供應商，
        或選擇商品種類後搜尋。
      </p>
    `;
    return;
  }

  const products = data.products.filter(product =>
    product.active !== false &&
    (!filter || hasType(product, filter)) &&
    (
      String(product.name || "")
        .toLowerCase()
        .includes(keyword) ||

      (product.vendors || []).some(vendor =>
        String(vendor)
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

  container.innerHTML = products.map(product => `
    <div class="card"
      data-abv-product="${safe(product.id)}">

      <h3>${safe(product.name)}</h3>

      <div>
        ${badgeHTML(getTypes(product))}
      </div>

      <p>
        供應商：
        ${safe((product.vendors || []).join("、"))}
      </p>

      <label>是否有貨</label>

      <select class="abv-location">
        <option value="none"
          ${product.location === "none" ? "selected" : ""}>
          無
        </option>

        <option value="fridge"
          ${product.location === "fridge" ? "selected" : ""}>
          冰箱
        </option>

        <option value="cabinet"
          ${product.location === "cabinet" ? "selected" : ""}>
          櫃子
        </option>
      </select>

      <div style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:12px;
      ">
        <button type="button" class="abv-edit-button">
          ✏️ 編輯商品
        </button>

        <button type="button" class="abv-disable-button">
          停用商品
        </button>
      </div>

      <div class="abv-editor" hidden
        style="
          border:1px solid #ccc;
          border-radius:10px;
          padding:12px;
          margin-top:12px;
        ">

        <h4>編輯商品資料</h4>

        <label>商品名稱</label>

        <input
          class="abv-edit-name"
          value="${safe(product.name)}"
          style="
            width:100%;
            box-sizing:border-box;
            margin:6px 0 12px;
          "
        >

        ${typePickerHTML(getTypes(product))}

        <label>供應商</label>

        <textarea
          class="abv-edit-vendors"
          rows="2"
          style="
            width:100%;
            box-sizing:border-box;
            margin:6px 0;
          "
        >${safe((product.vendors || []).join("、"))}</textarea>

        <p style="font-size:12px;opacity:.7">
          多個供應商可用逗號、頓號或換行分隔
        </p>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        ">
          <button type="button" class="abv-save-button">
            儲存修改
          </button>

          <button type="button" class="abv-cancel-button">
            取消
          </button>
        </div>
      </div>
    </div>
  `).join("");

  container.querySelectorAll(
    "[data-abv-product]"
  ).forEach(card => {
    const product = data.products.find(p =>
      String(p.id) === card.dataset.abvProduct
    );

    if (!product) return;

    const editor = card.querySelector(".abv-editor");
    const picker = editor.querySelector(".abv-type-picker");

    bindPicker(picker);

    card.querySelector(".abv-location").onchange = event => {
      product.location = event.target.value;

      save();
      renderProducts();
      renderOrders();
    };

    card.querySelector(".abv-edit-button").onclick = () => {
      editor.hidden = !editor.hidden;
    };

    card.querySelector(".abv-cancel-button").onclick = () => {
      renderProducts();
    };

    card.querySelector(".abv-disable-button").onclick = () => {
      if (!confirm(`確定停用「${product.name}」？`)) {
        return;
      }

      product.active = false;

      save();
      renderProducts();
      renderOrders();
    };

    card.querySelector(".abv-save-button").onclick = () => {
      const name = editor.querySelector(
        ".abv-edit-name"
      ).value.trim();

      const types = selectedTypes(picker);

      const vendors = vendorsFromText(
        editor.querySelector(".abv-edit-vendors").value
      );

      if (!name || !types.length || !vendors.length) {
        alert("名稱、分類及供應商都不能空白");
        return;
      }

      const duplicate = existingProductByName(name);

      if (
        duplicate &&
        String(duplicate.id) !== String(product.id)
      ) {
        alert(`已有相同名稱的商品：${duplicate.name}`);
        return;
      }

      const oldKey = normalizeProductName(product.name);
      const newKey = normalizeProductName(name);

      if (oldKey !== newKey) {
        delete data.importNameRules[oldKey];
      }

      Object.assign(product, {
        name,
        type: types[0],
        types,
        vendors,
        _abvPrimary: types[0]
      });

      data.importNameRules[newKey] = types[0];

      save();
      renderProducts();
      renderOrders();

      alert("商品資料已更新！");
    };
  });
}

$("#searchProduct").oninput = () => renderProducts();
$("#filterType").onchange = () => renderProducts();

window.addEventListener("pageshow", () => {
  renderProducts();
});

// ================================
// 第三頁：叫貨建議
// ================================

function getAvailableProducts() {
  return data.products.filter(product =>
    product.active !== false &&
    (product.location || "none") === "none"
  );
}

function getOrderDeficit(
  type,
  fridgeTarget,
  cabinetTarget
) {
  const stock = data.stock[type] || {};

  return Math.max(
    0,
    fridgeTarget + cabinetTarget -
    num(stock.fridge) -
    num(stock.cabinet)
  );
}

function orderRows() {
  const available = getAvailableProducts();

  return TYPES.map(([type, fridge, cabinet]) => ({
    type,
    deficit: getOrderDeficit(type, fridge, cabinet),
    products: available.filter(product =>
      hasType(product, type)
    )
  })).filter(row =>
    row.deficit > 0 &&
    row.products.length
  );
}

function renderOrders() {
  const container = $("#orderList");
  if (!container) return;

  const html = orderRows().map(({
    type,
    deficit,
    products
  }) => {
    const vendors = new Map();

    products.forEach(product => {
      unique(product.vendors || []).forEach(vendor => {
        if (!vendors.has(vendor)) {
          vendors.set(vendor, new Set());
        }

        vendors.get(vendor).add(product.name);
      });
    });

    const vendorHTML = [...vendors.entries()]
      .sort((a, b) =>
        a[0].localeCompare(b[0], "zh-Hant")
      )
      .map(([vendor, names]) => `
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
              （${names.size} 款）
            </span>
          </summary>

          <div style="
            padding:10px 4px 2px;
            line-height:1.9;
          ">
            ${[...names].map(name => `
              <div>・${safe(name)}</div>
            `).join("")}
          </div>
        </details>
      `).join("");

    return `
      <div class="card">
        <h3>${safe(type)}</h3>
        <p><strong>需叫 ${deficit} 排</strong></p>
        ${vendorHTML}
      </div>
    `;
  });

  container.innerHTML = html.length
    ? html.join("")
    : "<p>目前沒有需要補貨且有可叫商品的類型。</p>";
}

// ================================
// 檔案下載共用功能
// ================================

function downloadBlob(content, filename, mime) {
  const url = URL.createObjectURL(
    new Blob([content], { type: mime })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ================================
// 匯出叫貨建議 CSV
// ================================

$("#exportOrders").onclick = () => {
  const rows = [[
    "啤酒類型",
    "建議叫貨排數",
    "供應商",
    "商品名稱"
  ]];

  orderRows().forEach(({type, deficit, products}) => {
    products.forEach(product => {
      unique(product.vendors || []).forEach(vendor => {
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
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  downloadBlob(
    csv,
    "可叫貨品項清單.csv",
    "text/csv;charset=utf-8"
  );
};

// ================================
// 匯出商品清單 JSON
// ================================

$("#exportProducts").onclick = () => {
  downloadBlob(
    JSON.stringify({
      format: "abv-product-list",
      version: 3,
      products: data.products,
      classificationRules: data.importNameRules,
      styleRules: data.importStyleRules
    }, null, 2),
    "ABV商品清單.json",
    "application/json"
  );
};

// ================================
// 選擇 JSON 檔案
// ================================

function chooseJSONFile(callback) {
  const input = document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";

  document.body.append(input);

  input.onchange = async () => {
    try {
      if (input.files?.[0]) {
        await callback(
          JSON.parse(await input.files[0].text())
        );
      }
    } catch (error) {
      alert("檔案讀取或匯入失敗，請確認 JSON 格式。");
    } finally {
      input.remove();
    }
  };

  input.click();
}

// ================================
// 匯入商品清單 JSON
// ================================

$("#importProducts").onclick = () => {
  chooseJSONFile(parsed => {
    const products = Array.isArray(parsed)
      ? parsed
      : parsed?.products;

    if (
      !Array.isArray(products) ||
      !products.every(product =>
        product &&
        typeof product.name === "string" &&
        typeof product.type === "string" &&
        Array.isArray(product.vendors) &&
        product.vendors.every(v =>
          typeof v === "string"
        )
      )
    ) {
      alert("商品清單格式不正確，無法匯入。");
      return;
    }

    if (!confirm(
      `即將匯入 ${products.length} 項商品並取代目前商品清單。\n` +
      "庫存數量不受影響，是否有貨重設為「無」。\n" +
      "確定繼續嗎？"
    )) {
      return;
    }

    const imported = products.map(product =>
      normalizeProduct({
        id: product.id || id(),
        name: product.name,
        type: product.type,
        types: Array.isArray(product.types)
          ? product.types
          : [product.type],
        vendors: unique(
          product.vendors
            .map(v => v.trim())
            .filter(Boolean)
        ),
        active: product.active !== false,
        location: "none"
      })
    );

    data.products = imported;

    const rules = Array.isArray(parsed)
      ? null
      : parsed?.classificationRules;

    if (rules && typeof rules === "object") {
      Object.entries(rules).forEach(([key, type]) => {
        if (VALID_TYPES.includes(type)) {
          data.importNameRules[key] = type;
        }
      });
    }

    const styles = Array.isArray(parsed)
      ? null
      : parsed?.styleRules;

    if (styles && typeof styles === "object") {
      Object.entries(styles).forEach(([key, type]) => {
        if (VALID_TYPES.includes(type)) {
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

// ================================
// 智慧分類規則
// ================================

const STYLE_RULES = [
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
    /比利時.{0,8}(金黃強|黃金強)|金黃強.{0,6}(愛爾|艾爾)|belgian.{0,12}strong golden/i,
    "金黃強"
  ],
  [
    /比利時.{0,8}(黃金|金色).{0,5}(愛爾|艾爾)|比利時黃金|belgian golden ale/i,
    "黃金"
  ],
  [
    /比利時.{0,8}(雙倍|dubbel)|belgian dubbel/i,
    "雙倍"
  ],
  [
    /比利時.{0,8}(三倍|tripel)|belgian tripel/i,
    "三倍"
  ],
  [
    /比利時.{0,8}(四倍|quadrupel|quad)|belgian quadrupel/i,
    "四倍"
  ],
  [
    /比利時.{0,8}(強黑|深色烈性)|belgian dark strong|belgian strong dark/i,
    "強黑"
  ],
  [
    /西打酒|蘋果酒|\bcider\b|水果白啤酒|水果白啤/i,
    "水果"
  ],
  [
    /勃克|博克|\bbock\b|doppelbock|eisbock|蘇格蘭|scottish|scotch ale|wee heavy|\bscotch\b/i,
    "勃克&蘇格蘭"
  ],
  [
    /慕尼黑|munich|德式|德國|german|巴伐利亞|bavarian/i,
    "德式"
  ],
  [
    /英式|英國|british|english/i,
    "英式"
  ],
  [
    /捷克皮爾森|皮爾森|pilsner|pilsener/i,
    "皮爾森"
  ],
  [
    /酸啤|酸艾爾|\bsour\b|\bgose\b/i,
    "酸"
  ],
  [
    /斯陶特|司陶特|世濤|stout/i,
    "司陶特"
  ],
  [
    /波特|porter/i,
    "波特"
  ],
  [
    /淡愛爾|淡艾爾|美式淡愛爾|美式淡艾爾|pale ale|\bipa\b|neipa|dipa/i,
    "IPA&PA"
  ],
  [
    /小麥|白啤|weizen|witbier|wheat/i,
    "白"
  ],
  [
    /拉格|lager/i,
    "拉格"
  ],
  [
    /比利時|belgian|修道院|trappist/i,
    "比利時"
  ],
  [
    /水果|fruit|果啤/i,
    "水果"
  ],
  [
    /無酒精|0度|non.?alcohol|alcohol.?free/i,
    "其他"
  ]
];

// ================================
// 依風格判斷分類
// ================================

function inferStyleFromText(name, sourceType) {
  // 優先使用供應商原始風格，
  // 避免商品名稱中的文字干擾分類。

  for (const text of [
    String(sourceType || ""),
    String(name || "")
  ]) {
    for (const [regex, type] of STYLE_RULES) {
      if (regex.test(text)) {
        return type;
      }
    }
  }

  return null;
}

function inferType(
  productName,
  sourceType,
  supplier,
  volume,
  canNote
) {
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

  const learned = data.importNameRules[
    normalizeProductName(productName)
  ];

  if (VALID_TYPES.includes(learned)) {
    return {
      type: learned,
      reason: "曾人工確認的商品分類"
    };
  }

  const learnedStyle = data.importStyleRules[
    styleRuleKey(supplier, sourceType)
  ];

  if (
    sourceType &&
    VALID_TYPES.includes(learnedStyle)
  ) {
    return {
      type: learnedStyle,
      reason: "已學習此供應商的風格分類"
    };
  }

  const style = inferStyleFromText(
    productName,
    sourceType
  );

  return style
    ? {
        type: style,
        reason: `風格關鍵字推測：${style}（可修改）`
      }
    : {
        type: "其他",
        reason: "無明確分類線索，請人工確認"
      };
}

// ================================
// 鋁罐自動判斷第二分類
// ================================

function inferCanSecondType(item, supplier) {
  const learned = data.importStyleRules[
    styleRuleKey(supplier, item.sourceType)
  ];

  if (
    VALID_TYPES.includes(learned) &&
    !["鋁罐", "其他"].includes(learned)
  ) {
    return learned;
  }

  // 不再讓已學習的「鋁罐」主分類
  // 阻擋第二分類的風格判斷。

  const style = inferStyleFromText(
    item.name,
    item.sourceType
  );

  return (
    style &&
    !["鋁罐", "其他"].includes(style)
  ) ? style : null;
}

// ================================
// 解析供應商文字
// ================================

function splitSupplierLine(line) {
  const text = String(line || "").trim();

  if (!text) return null;

  let columns = text
    .split(/\t+/)
    .map(value => value.trim())
    .filter(Boolean);

  if (columns.length < 2) {
    columns = text
      .split(/\s{2,}/)
      .map(value => value.trim())
      .filter(Boolean);
  }

  if (!columns.length) return null;

  const name = columns[0];
  const sourceType = columns[1] || "";

  const volumeMatch = columns.join(" ").match(
    /(?:^|[^\d])(\d{2,4})\s*(?:ml|毫升|㏄|cc)(?![a-z])/i
  );

  const volume = volumeMatch
    ? Number(volumeMatch[1])
    : null;

  const canNote = columns.slice(1).some(column =>
    /罐|can(?:ned)?/i.test(column)
  );

  return {
    name,
    sourceType,
    volume,
    canNote
  };
}

// ================================
// 批次匯入草稿暫存
// ================================

const BULK_KEY = "abvBulkDraftV1";

let pendingBulk = [];

try {
  const draft = JSON.parse(
    localStorage.getItem(BULK_KEY) || "null"
  );

  if (Array.isArray(draft?.items)) {
    pendingBulk = draft.items;
  }
} catch {}

function persistBulk() {
  try {
    localStorage.setItem(
      BULK_KEY,
      JSON.stringify({
        items: pendingBulk,
        supplier: $("#bulkSupplier").value,
        raw: $("#bulkText").value
      })
    );
  } catch (error) {
    console.warn("批次草稿暫存失敗", error);
  }
}

function clearBulkDraft() {
  localStorage.removeItem(BULK_KEY);
}

function updateBulkCount() {
  const count = pendingBulk.filter(item =>
    item.include &&
    item.name.trim()
  ).length;

  $("#bulkCount").textContent =
    `已勾選 ${count} 筆商品；匯入前會再次檢查重複商品。`;
}

// ================================
// 找出重複商品及實際編號
// ================================

function findBulkDuplicates() {
  const groups = new Map();

  pendingBulk.forEach((item, index) => {
    if (!item.include || !item.name.trim()) {
      return;
    }

    const key = normalizeProductName(item.name);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push({
      index,
      name: item.name
    });
  });

  return [...groups.values()].filter(group =>
    group.length > 1
  );
}

function showDuplicatePanel(groups) {
  $("#abv-duplicate-panel")?.remove();

  const panel = document.createElement("div");

  panel.id = "abv-duplicate-panel";

  panel.style.cssText = `
    padding:16px;
    margin:12px 0 20px;
    border:2px solid #dc3545;
    border-radius:12px;
    background:#fff4f4;
    color:#333;
  `;

  panel.innerHTML = `
    <h3 style="margin:0 0 10px;color:#b42318">
      發現 ${groups.length} 組重複商品
    </h3>

    <p>
      點擊編號跳到對應商品，
      修改名稱或取消勾選後再確認匯入。
    </p>

    ${groups.map(group => `
      <div style="
        padding:10px 0;
        border-bottom:1px solid #e5b5b5;
      ">
        <strong>${safe(group[0].name)}</strong>

        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:8px;
        ">
          ${group.map(entry => `
            <button
              type="button"
              class="abv-jump-duplicate"
              data-jump-index="${entry.index}"
              style="
                padding:8px 12px;
                border:1px solid #b42318;
                border-radius:8px;
                background:white;
                color:#b42318;
              "
            >
              第 ${entry.index + 1} 筆
            </button>
          `).join("")}
        </div>
      </div>
    `).join("")}
  `;

  $("#bulkReview").prepend(panel);

  panel.querySelectorAll(
    ".abv-jump-duplicate"
  ).forEach(button => {
    button.onclick = () => {
      const card = $(
        `#bulkReview [data-bulk-index="${button.dataset.jumpIndex}"]`
      );

      if (!card) return;

      card.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      card.style.outline = "3px solid #dc3545";

      card.querySelector(".bulk-name")
        ?.focus({ preventScroll: true });
    };
  });

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ================================
// 批次匯入檢視卡片
// ================================

function renderBulkReview() {
  const review = $("#bulkReview");
  const confirmArea = $("#bulkConfirmArea");

  if (!pendingBulk.length) {
    review.innerHTML = "";
    confirmArea.hidden = true;
    return;
  }

  review.innerHTML = `
    <h3>
      請逐筆檢視（${pendingBulk.length} 筆）
    </h3>
  ` + pendingBulk.map((item, index) => {
    const duplicate = existingProductByName(item.name);

    if (!Array.isArray(item.types)) {
      item.types = unique([
        item.type,
        ...(duplicate ? getTypes(duplicate) : [])
      ].filter(type => VALID_TYPES.includes(type)));
    }

    if (!item.types.length) {
      item.types = ["其他"];
    }

    const action = item.action ||
      (duplicate ? "merge" : "new");

    return `
      <article
        class="bulk-review-card"
        data-bulk-index="${index}"
      >
        <div class="bulk-card-top">
          <span class="bulk-index">
            商品 ${index + 1} / ${pendingBulk.length}
          </span>

          <span class="muted">
            ${safe(item.reason || "請確認分類")}
          </span>
        </div>

        <div class="bulk-select-row">
          <input
            type="checkbox"
            class="bulk-include"
            ${item.include ? "checked" : ""}
            aria-label="選擇匯入此商品"
          >

          <strong>納入本次匯入</strong>
        </div>

        <label>商品名稱（可編輯）</label>

        <input
          class="bulk-name"
          value="${safe(item.name)}"
          autocomplete="off"
        >

        <div class="raw-type">
          供應商原始種類：
          ${safe(item.sourceType || "未提供")}

          ｜容量：
          ${item.volume
            ? safe(item.volume + "ml")
            : "未標示"}

          ${item.canNote
            ? "｜供應商註明罐裝"
            : ""}
        </div>

        <label>網站分類（可複選）</label>

        ${typePickerHTML(item.types, "abv-bulk-type")}

        <div class="bulk-select-row"
          style="margin:12px 0">

          <input
            type="checkbox"
            class="bulk-learn-style"
            ${item.learnStyle ? "checked" : ""}
            ${!item.sourceType ? "disabled" : ""}
          >

          <span>
            記住此供應商的
            「${safe(item.sourceType || "未提供風格")}」
            分類（選填）
          </span>
        </div>

        <div class="bulk-action">
          <label>匯入方式</label>

          <div class="muted">
            ${duplicate
              ? `找到既有商品：${safe(duplicate.name)}（合併保留原類型）`
              : "尚未找到完全相同的商品"}
          </div>

          <select
            class="bulk-action-select"
            ${duplicate ? "" : "disabled"}
          >
            <option value="new"
              ${action === "new" ? "selected" : ""}>
              建立新商品
            </option>

            <option value="merge"
              ${action === "merge" ? "selected" : ""}>
              併入既有商品並加入供應商
            </option>
          </select>
        </div>
      </article>
    `;
  }).join("");

  confirmArea.hidden = false;

  review.querySelectorAll(
    ".bulk-review-card"
  ).forEach(card => {
    const item = pendingBulk[
      Number(card.dataset.bulkIndex)
    ];

    card.querySelector(".bulk-include").onchange = event => {
      item.include = event.target.checked;
      updateBulkCount();
      persistBulk();
    };

    card.querySelector(".bulk-name").oninput = event => {
      item.name = event.target.value;
      persistBulk();
    };

    bindPicker(
      card.querySelector(".abv-type-picker"),
      ".abv-bulk-type",
      types => {
        item.types = types;
        item.type = types[0] || "";
        persistBulk();
      }
    );

    card.querySelector(
      ".bulk-learn-style"
    ).onchange = event => {
      item.learnStyle = event.target.checked;
      persistBulk();
    };

    card.querySelector(
      ".bulk-action-select"
    ).onchange = event => {
      item.action = event.target.value;
      persistBulk();
    };
  });

  updateBulkCount();
}

// ================================
// 整理並檢視供應商商品
// ================================

$("#parseBulk").onclick = () => {
  const supplier = $("#bulkSupplier").value.trim();
  const raw = $("#bulkText").value;

  if (!supplier || !raw.trim()) {
    alert("請先填寫供應商並貼上商品清單。");
    return;
  }

  if (
    pendingBulk.length &&
    !confirm(
      "目前已有尚未匯入的檢視草稿。" +
      "重新整理清單會取代草稿，確定嗎？"
    )
  ) {
    return;
  }

  const parsed = raw
    .split(/\r?\n/)
    .map(splitSupplierLine)
    .filter(item => item?.name)
    .map(item => {
      const prefix =
        item.volume === 500 ? "50" :
        item.volume === 750 ? "75" : "";

      return {
        ...item,
        name:
          prefix && !item.name.startsWith(prefix)
            ? prefix + item.name
            : item.name
      };
    });

  if (!parsed.length) {
    alert("沒有辨識到商品資料。");
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

    const types = [suggestion.type];

    // 主要分類是鋁罐時，自動尋找第二分類
    if (suggestion.type === "鋁罐") {
      const second = inferCanSecondType(
        item,
        supplier
      );

      if (second && !types.includes(second)) {
        types.push(second);
      }
    }

    const existing = existingProductByName(item.name);

    if (existing) {
      getTypes(existing).forEach(type => {
        if (!types.includes(type)) {
          types.push(type);
        }
      });
    }

    return {
      ...item,
      type: types[0],
      types,
      reason: suggestion.reason,
      include: true,
      learnStyle: false,
      action: existing ? "merge" : "new"
    };
  });

  persistBulk();
  renderBulkReview();

  $("#bulkReview").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
};

// ================================
// 取消批次匯入
// ================================

$("#cancelBulk").onclick = () => {
  if (
    pendingBulk.length &&
    !confirm(
      "確定取消這次檢視？尚未匯入的草稿會清除。"
    )
  ) {
    return;
  }

  pendingBulk = [];
  clearBulkDraft();
  renderBulkReview();
};

// ================================
// 確認批次匯入
// ================================

$("#confirmBulk").onclick = () => {
  const supplier = $("#bulkSupplier").value.trim();

  const selected = pendingBulk.filter(item =>
    item.include &&
    item.name.trim()
  );

  if (!supplier || !selected.length) {
    alert("請填寫供應商並至少勾選一筆商品。");
    return;
  }

  // 檢查分類
  for (const item of selected) {
    if (
      !Array.isArray(item.types) ||
      !item.types.length ||
      item.types.some(type =>
        !VALID_TYPES.includes(type)
      )
    ) {
      alert(`「${item.name}」尚未選擇有效分類。`);
      return;
    }
  }

  // 檢查同批重複名稱
  const duplicates = findBulkDuplicates();

  if (duplicates.length) {
    showDuplicatePanel(duplicates);

    alert(
      `發現 ${duplicates.length} 組重複商品，` +
      "已列出可點擊的商品編號。"
    );

    return;
  }

  $("#abv-duplicate-panel")?.remove();

  // 檢查供應商風格學習
  const newStyleRules = {};

  for (const item of selected) {
    if (!item.learnStyle || !item.sourceType) {
      continue;
    }

    const key = styleRuleKey(
      supplier,
      item.sourceType
    );

    const primary = item.types[0];

    if (
      newStyleRules[key] &&
      newStyleRules[key] !== primary
    ) {
      alert(
        `「${item.sourceType}」本批次設定不同主要分類，` +
        "請取消部分風格學習勾選。"
      );
      return;
    }

    newStyleRules[key] = primary;
  }

  // 檢查是否刻意建立既有同名商品
  for (const item of selected) {
    if (
      existingProductByName(item.name) &&
      item.action === "new" &&
      !confirm(
        `「${item.name}」已存在。仍要新增同名商品嗎？`
      )
    ) {
      return;
    }
  }

  if (!confirm(
    `即將匯入 ${selected.length} 筆商品。\n` +
    "合併時保留既有類型與庫存位置。\n" +
    "確定繼續嗎？"
  )) {
    return;
  }

  // 先在資料副本處理，成功寫入後才替換正式資料
  const next = JSON.parse(JSON.stringify(data));

  let added = 0;
  let merged = 0;

  for (const item of selected) {
    const name = item.name.trim();
    const types = unique(item.types);
    const primary = types[0];

    const existing = item.action === "merge"
      ? next.products.find(product =>
          product.active !== false &&
          normalizeProductName(product.name) ===
          normalizeProductName(name)
        )
      : null;

    if (existing) {
      existing.types = unique([
        ...getTypes(existing),
        ...types
      ]);

      existing.type = VALID_TYPES.includes(existing.type)
        ? existing.type
        : primary;

      existing.vendors = unique([
        ...(existing.vendors || []),
        supplier
      ].filter(Boolean));

      next.importNameRules[
        normalizeProductName(existing.name)
      ] = existing.type;

      merged++;
    } else {
      next.products.push({
        id: id(),
        name,
        type: primary,
        types,
        vendors: [supplier],
        active: true,
        location: "none"
      });

      next.importNameRules[
        normalizeProductName(name)
      ] = primary;

      added++;
    }
  }

  Object.assign(
    next.importStyleRules,
    newStyleRules
  );

  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(next)
    );
  } catch {
    alert(
      "商品儲存失敗。檢視草稿仍保留，" +
      "請檢查瀏覽器儲存空間。"
    );
    return;
  }

  // 寫入成功後，才清除草稿
  data = next;
  pendingBulk = [];

  clearBulkDraft();

  $("#bulkText").value = "";

  renderBulkReview();
  renderProducts();
  renderOrders();

  alert(
    `批次匯入完成！\n` +
    `新增商品：${added} 筆\n` +
    `合併供應商：${merged} 筆`
  );
};

// ================================
// 網站啟動
// ================================

renderStock();
renderProducts();
renderOrders();

// 恢復新版暫存的批次匯入草稿
try {
  const draft = JSON.parse(
    localStorage.getItem(BULK_KEY) || "null"
  );

  if (pendingBulk.length && draft) {
    if (draft.supplier) {
      $("#bulkSupplier").value = draft.supplier;
    }

    if (draft.raw) {
      $("#bulkText").value = draft.raw;
    }

    renderBulkReview();
  }
} catch {}


/*
 ABV 智慧分類升級
 適用：目前已正常運作的整合版 app.js
 使用方式：直接貼在 app.js 最底下

 規則：
 1. 750ml 只歸大瓶
 2. 500ml 瓶裝：德國製造歸德式，其他歸大瓶
 3. 500ml 罐裝：鋁罐優先，可加風格及台灣
 4. 黃金、雙倍、三倍、四倍、強黑可辨識簡寫
 5. 英式 IPA = 英式 + IPA&PA
 6. 指定 12 家供應商自動加入台灣
*/

(() => {
  "use strict";

  const TAIWAN_SUPPLIERS = new Set([
    "啤酒頭",
    "醉精釀",
    "紅點",
    "酉鬼",
    "德意",
    "吉姆老爹",
    "巨人",
    "福爾摩沙",
    "金門",
    "挪亞",
    "令和",
    "英和記"
  ]);

  const STYLES = [
    [/金黃強|黃金強|strong[\s-]*golden|golden[\s-]*strong/i, "金黃強"],
    [/黃金|golden[\s-]*ale|blonde[\s-]*ale/i, "黃金"],
    [/雙倍|dubbel|double[\s-]*abbey/i, "雙倍"],
    [/三倍|tripel|triple[\s-]*abbey/i, "三倍"],
    [/四倍|quadrupel|quad(?:ruple)?[\s-]*abbey/i, "四倍"],
    [/強黑|深色烈性|dark[\s-]*strong|strong[\s-]*dark/i, "強黑"],
    [/琥珀|amber/i, "琥珀"],
    [/維也納|vienna/i, "維也納"],
    [/柏林小麥|berliner[\s-]*weisse|鹽小麥|gose|農舍愛爾|農舍艾爾|farmhouse|季節啤酒|saison|法蘭德斯|酸愛爾|酸艾爾|酸啤|sour/i, "酸"],
    [/西打酒|蘋果酒|cider|水果白啤/i, "水果"],
    [/勃克|博克|bock|蘇格蘭|scottish|scotch[\s-]*ale|wee[\s-]*heavy/i, "勃克&蘇格蘭"],
    [/英式|英國風格|british[\s-]*(?:style|ale|ipa)|english[\s-]*(?:style|ale|ipa)/i, "英式"],
    [/皮爾森|pilsner|pilsener/i, "皮爾森"],
    [/斯陶特|司陶特|世濤|stout/i, "司陶特"],
    [/波特|porter/i, "波特"],
    [/淡愛爾|淡艾爾|pale[\s-]*ale|\bipa\b|neipa|dipa/i, "IPA&PA"],
    [/小麥|白啤|weizen|witbier|wheat/i, "白"],
    [/拉格|lager/i, "拉格"],
    [/比利時|belgian|修道院|trappist/i, "比利時"],
    [/水果|fruit|果啤/i, "水果"]
  ];

  const GERMAN_ORIGIN =
    /德國製造|德國生產|德國原產|德製|產地\s*[:：]?\s*德國|原產地\s*[:：]?\s*德國|made\s+in\s+germany|brewed\s+in\s+germany|product\s+of\s+germany/i;

  const TAIWAN_ORIGIN =
    /台灣製造|臺灣製造|台灣生產|臺灣生產|台灣釀造|臺灣釀造|產地\s*[:：]?\s*(?:台灣|臺灣)|原產地\s*[:：]?\s*(?:台灣|臺灣)|made\s+in\s+taiwan|brewed\s+in\s+taiwan|product\s+of\s+taiwan/i;

  const isTaiwanSupplier = supplier =>
    TAIWAN_SUPPLIERS.has(
      String(supplier || "")
        .replace(/[\s　]+/g, "")
        .trim()
    );

  function getOrigin(item, supplier) {
    const text = [
      item.name,
      item.sourceType,
      item.originNote
    ].join(" ");

    if (GERMAN_ORIGIN.test(text)) {
      return "germany";
    }

    if (
      TAIWAN_ORIGIN.test(text) ||
      isTaiwanSupplier(supplier)
    ) {
      return "taiwan";
    }

    return null;
  }

  function getStyles(item, supplier) {
    const result = [];

    const add = type => {
      if (
        VALID_TYPES.includes(type) &&
        !["鋁罐", "大瓶", "德式", "台灣", "其他"].includes(type) &&
        !result.includes(type)
      ) {
        result.push(type);
      }
    };

    let matched = false;

    for (const text of [
      String(item.sourceType || ""),
      String(item.name || "")
    ]) {
      for (const [regex, type] of STYLES) {
        if (regex.test(text)) {
          add(type);
          matched = true;
          break;
        }
      }

      if (matched) break;
    }

    if (!matched) {
      add(data.importStyleRules[
        styleRuleKey(supplier, item.sourceType)
      ]);

      if (!result.length) {
        add(data.importNameRules[
          normalizeProductName(item.name)
        ]);
      }
    }

    const combined = [
      item.name,
      item.sourceType
    ].join(" ");

    const english =
      /英式|英國風格|british[\s-]*(?:style|ale|ipa)|english[\s-]*(?:style|ale|ipa)/i
        .test(combined);

    const ipa =
      /\bipa\b|淡愛爾|淡艾爾|pale[\s-]*ale/i
        .test(combined);

    if (english && ipa) {
      if (!result.includes("英式")) {
        result.unshift("英式");
      }

      add("IPA&PA");
    }

    return result;
  }

  function classify(item, supplier) {
    const volume = item.volume;
    const isCan = !!item.canNote;
    const origin = getOrigin(item, supplier);

    // 750ml 永遠只有大瓶
    if (volume === 750) {
      return {
        types: ["大瓶"],
        reason: "750ml 固定只歸大瓶"
      };
    }

    // 500ml 非罐裝
    if (volume === 500 && !isCan) {
      if (origin === "germany") {
        return {
          types: ["德式"],
          reason: "500ml 德國製造瓶裝"
        };
      }

      return {
        types: origin === "taiwan"
          ? ["大瓶", "台灣"]
          : ["大瓶"],
        reason: origin === "taiwan"
          ? "500ml 瓶裝＋台灣供應商"
          : "500ml 瓶裝，非已確認德製"
      };
    }

    const types = isCan ? ["鋁罐"] : [];

    getStyles(item, supplier).forEach(type => {
      if (!types.includes(type)) {
        types.push(type);
      }
    });

    // 德式分類只限 500ml
    if (
      volume === 500 &&
      origin === "germany" &&
      !types.includes("德式")
    ) {
      types.push("德式");
    }

    if (
      origin === "taiwan" &&
      !types.includes("台灣")
    ) {
      types.push("台灣");
    }

    if (!types.length) {
      types.push("其他");
    }

    return {
      types,
      reason: "新版智慧風格、容量及供應商分類"
    };
  }

  function parseLine(line) {
    const text = String(line || "").trim();
    if (!text) return null;

    let columns = text
      .split(/\t+/)
      .map(x => x.trim())
      .filter(Boolean);

    if (columns.length < 2) {
      columns = text
        .split(/\s{2,}/)
        .map(x => x.trim())
        .filter(Boolean);
    }

    if (!columns.length) return null;

    const fullText = columns.join(" ");

    const match = fullText.match(
      /(?:^|[^\d])(\d{2,4})\s*(?:ml|毫升|㏄|cc)(?![a-z])/i
    );

    return {
      name: columns[0],
      sourceType: columns[1] || "",
      volume: match ? Number(match[1]) : null,
      canNote: columns.slice(1).some(x =>
        /罐|can(?:ned)?/i.test(x)
      ),
      originNote: columns.slice(2).join(" ")
    };
  }

  const button = document.querySelector("#parseBulk");

  if (!button) {
    console.error("ABV：找不到批次匯入按鈕");
    return;
  }

  button.onclick = () => {
    const supplier =
      document.querySelector("#bulkSupplier").value.trim();

    const raw =
      document.querySelector("#bulkText").value;

    if (!supplier || !raw.trim()) {
      alert("請先填寫供應商並貼上商品清單。");
      return;
    }

    if (
      pendingBulk.length &&
      !confirm(
        "目前有尚未匯入的草稿，確定重新整理？"
      )
    ) {
      return;
    }

    const parsed = raw
      .split(/\r?\n/)
      .map(parseLine)
      .filter(item => item?.name)
      .map(item => {
        const prefix =
          item.volume === 500 ? "50" :
          item.volume === 750 ? "75" : "";

        return {
          ...item,
          name:
            prefix && !item.name.startsWith(prefix)
              ? prefix + item.name
              : item.name
        };
      });

    if (!parsed.length) {
      alert("沒有辨識到商品資料。");
      return;
    }

    pendingBulk = parsed.map(item => {
      const suggestion = classify(item, supplier);
      const types = [...suggestion.types];

      const existing = existingProductByName(item.name);

      // 一般商品合併時保留既有分類。
      // 750ml、500ml 瓶裝則不在檢視階段
      // 自動追加違反容量規則的舊分類。
      if (
        existing &&
        item.volume !== 750 &&
        !(item.volume === 500 && !item.canNote)
      ) {
        getTypes(existing).forEach(type => {
          if (
            (type !== "德式" || item.volume === 500) &&
            !types.includes(type)
          ) {
            types.push(type);
          }
        });
      }

      return {
        ...item,
        type: types[0],
        types,
        reason: suggestion.reason,
        include: true,
        learnStyle: false,
        action: existing ? "merge" : "new"
      };
    });

    persistBulk();
    renderBulkReview();

    document.querySelector("#bulkReview")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
  };

  console.log("ABV 台灣供應商智慧分類已啟用");
})();
