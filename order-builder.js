/* ABV 建立叫貨單 — 獨立擴充模組，不修改既有商品與庫存資料 */
(() => {
  'use strict';

  const HISTORY_KEY = 'abvOrderHistoryV1';
  const DRAFT_KEY = 'abvOrderDraftV1';

  const $ = selector => document.querySelector(selector);

  const escapeHTML = value =>
    String(value ?? '').replace(/[&<>"']/g, c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

  const load = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      alert('無法儲存：瀏覽器儲存空間不足或目前不允許儲存。');
      return false;
    }
  };

  const makeId = () =>
    Date.now().toString(36) +
    Math.random().toString(36).slice(2);

  let draft = Array.isArray(load(DRAFT_KEY, []))
    ? load(DRAFT_KEY, [])
    : [];

  let history = Array.isArray(load(HISTORY_KEY, []))
    ? load(HISTORY_KEY, [])
    : [];

  let lastConfirmed = null;

  const types = () => TYPES.map(row => row[0]);

  const productTypes = product =>
    [...new Set(
      (
        Array.isArray(product.types) && product.types.length
          ? product.types
          : [product.type]
      ).filter(t => types().includes(t))
    )];

  const products = () =>
    data.products.filter(p =>
      p.active !== false &&
      (p.location || 'none') === 'none'
    );

  const vendorsOf = p =>
    [...new Set(
      (Array.isArray(p.vendors) ? p.vendors : [])
        .map(v => String(v).trim())
        .filter(Boolean)
    )];

  const getProduct = productId =>
    data.products.find(p =>
      String(p.id) === String(productId)
    );

  const deficit = type => {
    const row = TYPES.find(t => t[0] === type);
    if (!row) return 0;

    const stock = data.stock[type] || {};

    return Math.max(
      0,
      Number(row[1]) +
      Number(row[2]) -
      Math.max(0, Number(stock.fridge) || 0) -
      Math.max(0, Number(stock.cabinet) || 0)
    );
  };

  const orderQty = item =>
    Math.max(1, Math.floor(Number(item.qty) || 1));

  const saveDraft = () => write(DRAFT_KEY, draft);

  const selectHTML = (options, current) =>
    options.map(value => `
      <option
        value="${escapeHTML(value)}"
        ${value === current ? 'selected' : ''}
      >
        ${escapeHTML(value)}
      </option>
    `).join('');

  const searchType = $('#buildSearchType');
  const searchVendor = $('#buildSearchVendor');
  const searchName = $('#buildSearchName');
  const results = $('#buildResults');
  const cart = $('#buildCart');
  const missing = $('#buildMissing');
  const historyNode = $('#buildHistory');
  const status = $('#buildStatus');

  if (
    !searchType ||
    !searchVendor ||
    !searchName ||
    !results ||
    !cart ||
    !missing ||
    !historyNode
  ) return;

  // ============================
  // 畫面樣式
  // ============================

  const style = document.createElement('style');

  style.textContent = `
    #orderBuilder .ob-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }

    #orderBuilder .ob-grid>div {
      min-width:0;
    }

    #orderBuilder .ob-grid label {
      display:block;
      font-weight:600;
      font-size:13px;
    }

    #orderBuilder .ob-card {
      background:#fff;
      border:1px solid #dce3e8;
      border-radius:10px;
      padding:12px;
      margin:10px 0;
    }

    #orderBuilder .ob-row {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:9px;
      flex-wrap:wrap;
    }

    #orderBuilder .ob-row button {
      flex-shrink:0;
    }

    #orderBuilder .ob-muted {
      font-size:12px;
      color:#637580;
      margin:5px 0;
    }

    #orderBuilder .ob-badge {
      display:inline-block;
      background:#e9f0f4;
      border-radius:15px;
      padding:3px 8px;
      margin:2px;
      font-size:12px;
    }

    #orderBuilder .ob-fields {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:7px;
      margin-top:10px;
    }

    #orderBuilder .ob-fields label {
      font-size:12px;
      display:block;
    }

    #orderBuilder .ob-fields select,
    #orderBuilder .ob-fields input {
      min-width:0;
      margin:3px 0;
      padding:8px 4px;
      font-size:13px;
    }

    #orderBuilder .ob-secondary {
      background:#e5ebef;
      color:#263238;
    }

    #orderBuilder .ob-danger {
      background:#a83f3f;
    }

    #orderBuilder .ob-actions {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }

    #orderBuilder .ob-actions button {
      flex:1;
    }

    #orderBuilder .ob-alert {
      background:#fff6e9;
      border:1px solid #f0d5aa;
      border-radius:9px;
      padding:12px;
      margin:10px 0;
    }

    #orderBuilder .ob-ok {
      background:#edf6ef;
      border:1px solid #b8d8c0;
      border-radius:9px;
      padding:12px;
      margin:10px 0;
    }

    #orderBuilder .ob-list {
      margin:8px 0;
      padding-left:22px;
    }

    #orderBuilder .ob-list li {
      margin:6px 0;
    }

    @media(max-width:430px) {
      #orderBuilder .ob-fields {
        grid-template-columns:1fr 1fr;
      }

      #orderBuilder .ob-fields>div:last-child {
        grid-column:1/-1;
      }
    }
  `;

  document.head.appendChild(style);

  // ============================
  // 搜尋供應商
  // ============================

  function refreshVendors() {
    const previous = searchVendor.value;

    const values = [...new Set(
      products().flatMap(vendorsOf)
    )].sort((a, b) =>
      a.localeCompare(b, 'zh-Hant')
    );

    searchVendor.innerHTML =
      '<option value="">全部廠商</option>' +
      selectHTML(values, previous);
  }

  searchType.innerHTML =
    '<option value="">全部類型</option>' +
    selectHTML(types(), '');

  // ============================
  // 搜尋商品
  // 任一條件符合就顯示
  // ============================

  function renderResults() {
    const q = searchName.value
      .trim()
      .toLocaleLowerCase();

    const t = searchType.value;
    const v = searchVendor.value;

    if (!q && !t && !v) {
      results.innerHTML =
        '<p class="ob-muted">輸入商品名稱，或選擇類型／廠商後顯示商品。</p>';
      return;
    }

const matched = products().filter(p =>
  (!q ||
    String(p.name)
      .toLocaleLowerCase()
      .includes(q)
  ) &&
  (!t ||
    productTypes(p).includes(t)
  ) &&
  (!v ||
    vendorsOf(p).includes(v)
  )
);
    results.innerHTML = `
      <p class="ob-muted">
        找到 ${matched.length} 款可叫商品
        （任一條件符合即顯示）
      </p>
    ` + matched.slice(0, 100).map(p => {
      const exists = draft.some(item =>
        String(item.productId) === String(p.id)
      );

      return `
        <div class="ob-card ob-row">
          <div style="flex:1;min-width:0">
            <strong>
              ${escapeHTML(p.name)}
            </strong>

            <div class="ob-muted">
              ${escapeHTML(
                vendorsOf(p).join('、') ||
                '未設定廠商'
              )}
            </div>

            <div>
              ${productTypes(p).map(t => `
                <span class="ob-badge">
                  ${escapeHTML(t)}
                </span>
              `).join('')}
            </div>
          </div>

          <button
            type="button"
            data-add="${escapeHTML(p.id)}"
            ${
              exists ||
              !vendorsOf(p).length ||
              !productTypes(p).length
                ? 'disabled'
                : ''
            }
          >
            ${exists ? '已加入' : '加入叫貨單'}
          </button>
        </div>
      `;
    }).join('') + (
      matched.length > 100
        ? '<p class="ob-muted">結果超過 100 款，請縮小搜尋範圍。</p>'
        : ''
    );

    results.querySelectorAll(
      '[data-add]'
    ).forEach(button => {
      button.onclick = () => {
        const p = getProduct(
          button.dataset.add
        );

        if (
          !p ||
          draft.some(i =>
            String(i.productId) === String(p.id)
          )
        ) return;

        const availableTypes =
          productTypes(p);

        const preferred =
          availableTypes.find(t =>
            deficit(t) > 0
          ) || availableTypes[0];

        draft.push({
          productId: String(p.id),
          name: p.name,
          vendor: vendorsOf(p)[0],
          type: preferred,
          qty: 1
        });

        saveDraft();
        lastConfirmed = null;
        renderAll();
      };
    });
  }

  // ============================
  // 叫貨單明細
  // ============================

  function renderCart() {
    cart.innerHTML = !draft.length
      ? '<p class="ob-muted">尚未加入商品。</p>'
      : draft.map((item, index) => {
        const p = getProduct(item.productId);

        const pTypes = p
          ? productTypes(p)
          : [item.type];

        const pVendors = p
          ? vendorsOf(p)
          : [item.vendor];

        return `
          <div class="ob-card">
            <div class="ob-row">
              <strong>
                ${escapeHTML(
                  p ? p.name : item.name
                )}
              </strong>

              <button
                class="ob-danger"
                type="button"
                data-remove="${index}"
              >
                移除
              </button>
            </div>

            <div class="ob-fields">
              <div>
                <label>供應商</label>
                <select data-vendor="${index}">
                  ${selectHTML(
                    pVendors.length
                      ? pVendors
                      : [item.vendor],
                    item.vendor
                  )}
                </select>
              </div>

              <div>
                <label>計入類型</label>
                <select data-type="${index}">
                  ${selectHTML(
                    pTypes.length
                      ? pTypes
                      : [item.type],
                    item.type
                  )}
                </select>
              </div>

              <div>
                <label>叫貨排數</label>
                <input
                  data-qty="${index}"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  value="${orderQty(item)}"
                >
              </div>
            </div>
          </div>
        `;
      }).join('');

    $('#buildCartCount').textContent =
      `${draft.length} 款／${
        draft.reduce(
          (sum, item) =>
            sum + orderQty(item),
          0
        )
      } 排`;

    cart.querySelectorAll(
      '[data-remove]'
    ).forEach(b => {
      b.onclick = () => {
        draft.splice(
          Number(b.dataset.remove),
          1
        );

        saveDraft();
        lastConfirmed = null;
        renderAll();
      };
    });

    cart.querySelectorAll(
      '[data-vendor]'
    ).forEach(s => {
      s.onchange = () => {
        draft[
          Number(s.dataset.vendor)
        ].vendor = s.value;

        saveDraft();
        lastConfirmed = null;
        renderMissing();
      };
    });

    cart.querySelectorAll(
      '[data-type]'
    ).forEach(s => {
      s.onchange = () => {
        draft[
          Number(s.dataset.type)
        ].type = s.value;

        saveDraft();
        lastConfirmed = null;
        renderMissing();
      };
    });

    cart.querySelectorAll(
      '[data-qty]'
    ).forEach(i => {
      i.onchange = () => {
        const item = draft[
          Number(i.dataset.qty)
        ];

        item.qty = Math.max(
          1,
          Math.floor(Number(i.value) || 1)
        );

        i.value = item.qty;

        saveDraft();
        lastConfirmed = null;
        renderMissing();

        $('#buildCartCount').textContent =
          `${draft.length} 款／${
            draft.reduce(
              (sum, x) =>
                sum + orderQty(x),
              0
            )
          } 排`;
      };
    });
  }

  // ============================
  // 缺口計算
  // ============================

  function gapsFor(items) {
    const ordered = {};

    items.forEach(item => {
      ordered[item.type] =
        (ordered[item.type] || 0) +
        orderQty(item);
    });

    return TYPES.map(([type]) => ({
      type,
      remaining: Math.max(
        0,
        deficit(type) -
        (ordered[type] || 0)
      )
    })).filter(row =>
      row.remaining > 0
    );
  }

  function renderMissing() {
    const gaps = gapsFor(draft);

    missing.innerHTML = gaps.length
      ? `
        <div class="ob-alert">
          <strong>
            尚有 ${gaps.length} 種類型未補足
          </strong>

          <ul class="ob-list">
            ${gaps.map(g => `
              <li>
                ${escapeHTML(g.type)}：
                還缺
                <strong>
                  ${g.remaining} 排
                </strong>
              </li>
            `).join('')}
          </ul>

          <div class="ob-muted">
            仍可確認叫貨，系統不會強制補滿。
          </div>
        </div>
      `
      : `
        <div class="ob-ok">
          目前沒有未補足的類型缺口。
        </div>
      `;

    if (!lastConfirmed) {
      status.innerHTML = '';
    }
  }

  // ============================
  // 歷史叫貨紀錄
  // ============================

  function renderHistory() {
    historyNode.innerHTML = !history.length
      ? '<p class="ob-muted">尚無歷史叫貨紀錄。</p>'
      : history.map(record => `
        <details class="ob-card">
          <summary>
            <strong>
              ${escapeHTML(
                record.createdAt || ''
              )}
            </strong>

            ${Number(
              record.items?.length || 0
            )} 款／${
              (record.items || []).reduce(
                (s, i) =>
                  s + orderQty(i),
                0
              )
            } 排
          </summary>

          <div style="padding-top:10px">
            ${(record.items || []).map(item => `
              <div style="
                padding:6px 0;
                border-bottom:1px solid #eee
              ">
                <strong>
                  ${escapeHTML(item.name)}
                </strong>

                <div class="ob-muted">
                  ${escapeHTML(item.vendor)}
                  ｜
                  ${escapeHTML(item.type)}
                  ｜
                  ${orderQty(item)} 排
                </div>
              </div>
            `).join('')}

            ${
              Array.isArray(record.gaps) &&
              record.gaps.length
                ? `
                  <p class="ob-muted">
                    當時未補足：
                    ${record.gaps.map(g => `
                      ${escapeHTML(g.type)}
                      ${Number(g.remaining)} 排
                    `).join('、')}
                  </p>
                `
                : ''
            }

            <button
              class="ob-danger"
              type="button"
              data-delete="${escapeHTML(record.id)}"
            >
              刪除這筆紀錄
            </button>
          </div>
        </details>
      `).join('');

    historyNode.querySelectorAll(
      '[data-delete]'
    ).forEach(b => {
      b.onclick = () => {
        if (!confirm(
          '確定永久刪除這筆歷史叫貨紀錄？此操作無法復原。'
        )) return;

        const next = history.filter(h =>
          String(h.id) !== b.dataset.delete
        );

        if (!write(HISTORY_KEY, next)) {
          return;
        }

        history = next;
        renderHistory();
      };
    });
  }

  // ============================
  // 更新全部畫面
  // ============================

  function renderAll() {
    refreshVendors();
    renderResults();
    renderCart();
    renderMissing();
    renderHistory();
  }

  [
    searchName,
    searchType,
    searchVendor
  ].forEach(el => {
    el.addEventListener(
      el === searchName
        ? 'input'
        : 'change',
      renderResults
    );
  });

  // ============================
  // 確認叫貨
  // ============================

  $('#buildConfirm').onclick = () => {
    if (!draft.length) {
      alert('請先加入至少一款商品。');
      return;
    }

    for (const item of draft) {
      const p = getProduct(
        item.productId
      );

      if (
        !p ||
        p.active === false ||
        (p.location || 'none') !== 'none'
      ) {
        alert(
          `商品「${item.name}」目前不可叫貨，請先移除或更新商品資料。`
        );
        return;
      }

      if (
        !productTypes(p).includes(item.type) ||
        !vendorsOf(p).includes(item.vendor)
      ) {
        alert(
          `商品「${p.name}」的供應商或分類已變更，請重新選擇。`
        );
        return;
      }

      if (
        !Number.isInteger(Number(item.qty)) ||
        Number(item.qty) < 1
      ) {
        alert('叫貨排數必須是正整數。');
        return;
      }
    }

    const gaps = gapsFor(draft);

    const message = gaps.length
      ? `
仍有 ${gaps.length} 種類型尚未補足：

${gaps.map(g =>
  `${g.type}：缺 ${g.remaining} 排`
).join('\n')}

仍要確認這張叫貨單嗎？
      `
      : '目前沒有未補足的類型缺口。確定完成叫貨嗎？';

    if (!confirm(message)) {
      return;
    }

    const record = {
      id: makeId(),

      createdAt: new Date().toLocaleString(
        'zh-TW',
        { hour12: false }
      ),

      items: draft.map(item => ({
        productId: item.productId,
        name:
          getProduct(item.productId)?.name ||
          item.name,
        vendor: item.vendor,
        type: item.type,
        qty: orderQty(item)
      })),

      gaps
    };

    const next = [
      record,
      ...history
    ];

    if (!write(HISTORY_KEY, next)) {
      return;
    }

    history = next;
    draft = [];
    saveDraft();
    lastConfirmed = record;

    renderAll();

    status.innerHTML = `
      <div class="ob-ok">
        <strong>
          叫貨單已確認並儲存歷史紀錄
        </strong>

        <p>
          ${record.items.length} 款／${
            record.items.reduce(
              (s, i) =>
                s + i.qty,
              0
            )
          } 排
        </p>

        ${
          record.gaps.length
            ? `
              <div class="ob-alert">
                <strong>仍有缺口</strong>

                <ul class="ob-list">
                  ${record.gaps.map(g => `
                    <li>
                      ${escapeHTML(g.type)}：
                      缺 ${g.remaining} 排
                    </li>
                  `).join('')}
                </ul>
              </div>
            `
            : `
              <p>
                沒有未補足的類型缺口。
              </p>
            `
        }

        <p class="ob-muted">
          確認叫貨不會增加現有庫存。
        </p>
      </div>
    `;
  };

  // ============================
  // 清空叫貨單
  // ============================

  $('#buildClear').onclick = () => {
    if (
      !draft.length ||
      confirm(
        '確定清空目前尚未確認的叫貨單？'
      )
    ) {
      draft = [];
      saveDraft();
      lastConfirmed = null;
      renderAll();
    }
  };

  // ============================
  // 切換頁面時重新整理資料
  // ============================

  document.querySelectorAll(
    '.tab'
  ).forEach(button => {
    button.addEventListener(
      'click',
      () => {
        if (
          button.dataset.page ===
          'orderBuilder'
        ) {
          renderAll();
        }
      }
    );
  });

  $('#saveStock')?.addEventListener(
    'click',
    () => {
      if (
        $('#orderBuilder')
          .classList.contains('active')
      ) {
        renderAll();
      }
    }
  );

  renderAll();
})();
