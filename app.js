
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

if (!data || typeof data !== "object") data = {};

data.stock ||= {};
data.products ||= [];
data.orders ||= {};

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
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
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


// ==============================
// 頁面切換
// ==============================

document.querySelectorAll(".tab").forEach(button => {
  button.onclick = () => {
    document.querySelectorAll(".tab").forEach(b =>
      b.classList.remove("active")
    );

    document.querySelectorAll(".page").forEach(p =>
      p.classList.remove("active")
    );

    button.classList.add("active");

    document.getElementById(button.dataset.page)
      .classList.add("active");

    renderOrders();
    renderProducts();
  };
});


// ==============================
// 第一頁：庫存盤點
// ==============================

function renderStock() {
  const tbody = document.querySelector("#stockTable");

  // 隱藏目標欄，只保留類型、冰箱、櫃子
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
          <input class="fridge" type="number" min="0"
            value="${num(stock.fridge)}">
        </td>

        <td>
          <input class="cabinet" type="number" min="0"
            value="${num(stock.cabinet)}">
        </td>
      </tr>
    `;
  }).join("");
}

document.querySelector("#saveStock").onclick = () => {
  document.querySelectorAll("#stockTable tr").forEach(row => {
    const type = row.dataset.type;

    data.stock[type] = {
      fridge: num(row.querySelector(".fridge").value),
      cabinet: num(row.querySelector(".cabinet").value)
    };
  });

  save();
  alert("庫存已儲存");
  renderOrders();
};


// ==============================
// 新增供應商欄位
// ==============================

document.querySelector("#addVendor").onclick = () => {
  const input = document.createElement("input");
  input.className = "vendor";
  input.placeholder = "供應商名稱";
  input.required = true;

  document.querySelector("#vendorInputs").append(input);
};


// ==============================
// 新增商品
// ==============================

document.querySelector("#addForm").onsubmit = event => {
  event.preventDefault();

  const name = document.querySelector("#productName").value.trim();
  const type = document.querySelector("#productType").value;

  const vendors = [
    ...document.querySelectorAll(".vendor")
  ].map(input => input.value.trim()).filter(Boolean);

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


// ==============================
// 第二頁：商品資料搜尋
// ==============================

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
        v.toLowerCase().includes(keyword)
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


// ==============================
// 編輯供應商
// ==============================

function editVendors(productId) {
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  const result = prompt(
    "輸入供應商，以逗號分隔",
    (product.vendors || []).join(", ")
  );

  if (result === null) return;

  product.vendors = [...new Set(
    result.split(/[,，]/).map(v => v.trim()).filter(Boolean)
  )];

  save();
  renderProducts();
  renderOrders();
}


// ==============================
// 停用商品
// ==============================

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


// ==============================
// 可叫貨商品
// ==============================

function getAvailableProducts() {
  return data.products.filter(p =>
    p.active !== false &&
    (p.location || "none") === "none"
  );
}


// ==============================
// 第三頁：可叫貨品項總覽
// ==============================

function renderOrders() {
  const container = document.querySelector("#orderList");
  if (!container) return;

  const available = getAvailableProducts();
  const html = [];

  TYPES.forEach(([type, fridgeTarget, cabinetTarget]) => {
    const stock = data.stock[type] || {
      fridge: 0,
      cabinet: 0
    };

    // 計算冰箱及櫃子的缺口
    const fridgeDeficit = Math.max(
      0,
      fridgeTarget - num(stock.fridge)
    );

    const cabinetDeficit = Math.max(
      0,
      cabinetTarget - num(stock.cabinet)
    );

    // 總建議叫貨排數
    const totalDeficit = fridgeDeficit + cabinetDeficit;

    const products = available.filter(p => p.type === type);

    // 沒有可叫貨商品就不顯示
    if (!products.length) return;

    // 依供應商分組
    const vendorGroups = {};

    products.forEach(product => {
      const vendors = [...new Set(product.vendors || [])];

      vendors.forEach(vendor => {
        if (!vendorGroups[vendor]) {
          vendorGroups[vendor] = [];
        }

        vendorGroups[vendor].push(product.name);
      });
    });

    const vendorHtml = Object.keys(vendorGroups)
      .sort((a, b) => a.localeCompare(b, "zh-Hant"))
      .map(vendor => `
        <div class="vendorGroup">
          <strong>${safe(vendor)}</strong>
          <p>${vendorGroups[vendor].map(name => safe(name)).join("、")}</p>
        </div>
      `).join("");

    html.push(`
      <div class="card">
        <h3>${safe(type)}</h3>

        <p>
          需叫 ${totalDeficit} 排
        </p>

        ${vendorHtml}
      </div>
    `);
  });

  container.innerHTML = html.length
    ? html.join("")
    : "<p>目前沒有可叫貨的商品。</p>";
}


// ==============================
// 匯出可叫貨品項
// ==============================

document.querySelector("#exportOrders").onclick = () => {
  const rows = [
    ["啤酒類型", "建議叫貨排數", "供應商", "商品名稱"]
  ];

  const available = getAvailableProducts();

  TYPES.forEach(([type, fridgeTarget, cabinetTarget]) => {
    const stock = data.stock[type] || {
      fridge: 0,
      cabinet: 0
    };

    const totalDeficit =
      Math.max(0, fridgeTarget - num(stock.fridge)) +
      Math.max(0, cabinetTarget - num(stock.cabinet));

    const products = available.filter(p => p.type === type);

    products.forEach(product => {
      const vendors = [...new Set(product.vendors || [])];

      vendors.forEach(vendor => {
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

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "可叫貨品項清單.csv";
  link.click();

  URL.revokeObjectURL(link.href);
};

// ==============================
// 更新匯出按鈕文字
// ==============================

document.querySelector("#exportOrders").textContent =
  "匯出可叫貨品項";


// ==============================
// 商品清單匯出／匯入
// ==============================

const importButtons = document.createElement("div");
importButtons.style.display = "flex";
importButtons.style.flexWrap = "wrap";
importButtons.style.justifyContent = "center";
importButtons.style.gap = "8px";
importButtons.style.margin = "12px 0";

importButtons.innerHTML = `
  <button id="exportProducts">匯出商品清單</button>
  <button id="importProducts">匯入商品清單</button>
`;

const footer = document.querySelector("footer");
footer.insertBefore(importButtons, footer.querySelector("p"));

function downloadJSON(content, filename) {
  const blob = new Blob(
    [JSON.stringify(content, null, 2)],
    { type: "application/json" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
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
      const parsed = JSON.parse(await file.text());
      callback(parsed);
    } catch (error) {
      alert("檔案讀取失敗，請確認是否為正確的商品清單。");
    } finally {
      input.remove();
    }
  };

  input.click();
}

// 匯出商品清單
document.querySelector("#exportProducts").onclick = () => {
  const productList = {
    format: "abv-product-list",
    version: 1,
    products: data.products
  };

  downloadJSON(productList, "ABV商品清單.json");
};

// 匯入商品清單
document.querySelector("#importProducts").onclick = () => {
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
        Array.isArray(p.vendors)
      )
    ) {
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
      vendors: [...new Set(p.vendors.map(v => String(v).trim()).filter(Boolean))],
      active: p.active !== false,
      location: "none"
    }));

    save();
    renderProducts();
    renderOrders();

    alert(`成功匯入 ${products.length} 項商品！`);
  });
};


// ==============================
// 啟動網站
// ==============================

renderStock();
renderProducts();
renderOrders();
