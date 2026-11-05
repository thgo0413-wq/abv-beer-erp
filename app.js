
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

data.stock ||= {};
data.products ||= [];
data.orders ||= {};

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function id() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#39;"
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

document.querySelector("#productType").innerHTML =
  typeOptions();

document.querySelector("#filterType").innerHTML +=
  typeOptions();

// 頁面切換
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

// 庫存盤點
function renderStock() {
  const tbody = document.querySelector("#stockTable");

  tbody.innerHTML = TYPES.map(([type, fridge, cabinet]) => {
    const stock = data.stock[type] || {
      fridge: 0,
      cabinet: 0
    };

    return `
      <tr data-type="${safe(type)}">
        <td>${safe(type)}</td>
        <td><input class="fridge" type="number" min="0"
          value="${num(stock.fridge)}"></td>
        <td>${fridge}</td>
        <td><input class="cabinet" type="number" min="0"
          value="${num(stock.cabinet)}"></td>
        <td>${cabinet}</td>
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

// 新增供應商欄位
document.querySelector("#addVendor").onclick = () => {
  const input = document.createElement("input");
  input.className = "vendor";
  input.placeholder = "供應商名稱";
  input.required = true;

  document.querySelector("#vendorInputs").append(input);
};

// 新增商品
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
    vendors,
    active: true
  });

  save();
  event.target.reset();

  document.querySelector("#vendorInputs").innerHTML =
    '<input class="vendor" required placeholder="供應商名稱">';

  renderProducts();
  renderOrders();

  alert("商品新增成功");
};

// 商品清單
function renderProducts() {
  const keyword = (
    document.querySelector("#searchProduct").value || ""
  ).toLowerCase();

  const filter = document.querySelector("#filterType").value;

  const products = data.products.filter(p =>
    p.active !== false &&
    (!filter || p.type === filter) &&
    (p.name + p.vendors.join(" ")).toLowerCase().includes(keyword)
  );

  const container = document.querySelector("#productList");

  if (!products.length) {
    container.innerHTML = "<p>目前沒有符合條件的商品。</p>";
    return;
  }

  container.innerHTML = products.map(p => `
    <div class="card">
      <h3>${safe(p.name)}</h3>
      <p>類型：${safe(p.type)}</p>
      <p>供應商：${safe(p.vendors.join("、"))}</p>
      <button onclick="editVendors('${p.id}')">編輯供應商</button>
      <button onclick="disableProduct('${p.id}')">停用商品</button>
    </div>
  `).join("");
}

document.querySelector("#searchProduct").oninput =
  renderProducts;

document.querySelector("#filterType").onchange =
  renderProducts;

function editVendors(productId) {
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  const result = prompt(
    "輸入供應商，以逗號分隔",
    product.vendors.join(", ")
  );

  if (result === null) return;

  product.vendors = result.split(/[,，]/)
    .map(v => v.trim()).filter(Boolean);

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

// 叫貨建議
function renderOrders() {
  const container = document.querySelector("#orderList");
  if (!container) return;

  const html = [];

  TYPES.forEach(([type, fridgeTarget, cabinetTarget]) => {
    const stock = data.stock[type] || {
      fridge: 0,
      cabinet: 0
    };

    const fridgeDeficit = Math.max(
      0, fridgeTarget - num(stock.fridge)
    );

    const cabinetDeficit = Math.max(
      0, cabinetTarget - num(stock.cabinet)
    );

    const total = fridgeDeficit + cabinetDeficit;

    if (total <= 0) return;

    const products = data.products.filter(p =>
      p.active !== false && p.type === type
    );

    const previous = data.orders[type] || {};

    const productOptions = products.map(p =>
      `<option value="${p.id}"
        ${p.id === previous.productId ? "selected" : ""}>
        ${safe(p.name)}
      </option>`
    ).join("");

    const selected = products.find(
      p => p.id === previous.productId
    );

    const vendors = selected ? selected.vendors : [];

    html.push(`
      <div class="card" data-order="${safe(type)}">
        <h3>${safe(type)}</h3>
        <p>冰箱缺少：${fridgeDeficit} ｜ 櫃子缺少：${cabinetDeficit}</p>
        <h3>總缺口：${total}</h3>

        ${
          products.length
          ? `
            <label>選擇商品</label>
            <select class="orderProduct">
              <option value="">請選擇商品</option>
              ${productOptions}
            </select>

            <label>選擇供應商</label>
            <select class="orderVendor">
              <option value="">請選擇供應商</option>
              ${vendors.map(v =>
                `<option value="${safe(v)}"
                  ${v === previous.vendor ? "selected" : ""}>
                  ${safe(v)}
                </option>`
              ).join("")}
            </select>

            <label>叫貨數量</label>
            <input class="orderQty" type="number"
              min="0" value="${previous.qty ?? total}">
          `
          : "<p>尚未建立此類型的商品。</p>"
        }
      </div>
    `);
  });

  container.innerHTML = html.length
    ? html.join("")
    : "<p>目前庫存已達目標，無需叫貨。</p>";

  container.querySelectorAll("[data-order]").forEach(card => {
    const type = card.dataset.order;
    const productSelect = card.querySelector(".orderProduct");
    const vendorSelect = card.querySelector(".orderVendor");
    const qtyInput = card.querySelector(".orderQty");

    if (!productSelect) return;

    productSelect.onchange = () => {
      const product = data.products.find(
        p => p.id === productSelect.value
      );

      vendorSelect.innerHTML =
        '<option value="">請選擇供應商</option>' +
        (product ? product.vendors : []).map(v =>
          `<option value="${safe(v)}">${safe(v)}</option>`
        ).join("");

      saveOrder(type, productSelect.value, "", qtyInput.value);
    };

    vendorSelect.onchange = () => {
      saveOrder(type, productSelect.value,
        vendorSelect.value, qtyInput.value);
    };

    qtyInput.onchange = () => {
      saveOrder(type, productSelect.value,
        vendorSelect.value, qtyInput.value);
    };
  });
}

function saveOrder(type, productId, vendor, qty) {
  data.orders[type] = {
    productId,
    vendor,
    qty: num(qty)
  };

  save();
}

// 匯出叫貨清單
document.querySelector("#exportOrders").onclick = () => {
  const rows = [
    ["啤酒類型", "商品名稱", "供應商", "叫貨數量"]
  ];

  TYPES.forEach(([type, ft, ct]) => {
    const stock = data.stock[type] || {
      fridge: 0,
      cabinet: 0
    };

    const deficit =
      Math.max(0, ft - num(stock.fridge)) +
      Math.max(0, ct - num(stock.cabinet));

    if (!deficit) return;

    const order = data.orders[type] || {};

    const product = data.products.find(
      p => p.id === order.productId
    );

    rows.push([
      type,
      product?.name || "",
      order.vendor || "",
      order.qty ?? deficit
    ]);
  });

  const csv = "\uFEFF" + rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "啤酒叫貨清單.csv";
  link.click();
  URL.revokeObjectURL(link.href);
};

// 匯出備份
document.querySelector("#backup").onclick = () => {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {type: "application/json"}
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "啤酒系統備份.json";
  link.click();
  URL.revokeObjectURL(link.href);
};

// 啟動網站
renderStock();
renderProducts();
renderOrders();
