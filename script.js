/* ==========================================================================
   Body Scent — script.js (ใช้ร่วมกันทุกหน้า)
   ทำงานตาม element ที่พบในหน้านั้นๆ:
   - #product-list  → product.html
   - #orderForm     → order.html
   - #ordersTable   → admin.html
   ========================================================================== */

var ORDER_API_URL =
  'https://script.google.com/macros/s/AKfycbwQBkb-Pt5ZR6gx0Si4T5637bN7xFTA3SZdRLT-QAclPSx2UfAcndo-Yyi96E1S3mJ1gw/exec';

var ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTwimPyE_ZIKtOs3EWGtWQxRYbC275qfJe7vqrAJ5YU4ZGnT5dl-8KN85QrsfzHwWWGla_l1OU3Y2pc/pub?gid=0&single=true&output=csv';

var MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* ---------- helpers ---------- */

function formatPrice(n) {
  var num = Number(n);
  return (isNaN(num) ? n : num.toLocaleString('th-TH')) + ' บาท';
}

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* ==========================================================================
   1) หน้า product.html
   ========================================================================== */

function initProductPage() {
  var filterBar = document.getElementById('filter-bar');
  var list = document.getElementById('product-list');
  var products = [];

  var params = new URLSearchParams(window.location.search);
  var initial = (params.get('mood') || 'all').toLowerCase();
  var valid = MOODS.some(function (m) { return m.key === initial; });
  var current = valid ? initial : 'all';

  function renderFilters() {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    MOODS.forEach(function (m) {
      var btn = el('button', 'filter' + (m.key === current ? ' is-active' : ''));
      btn.type = 'button';
      btn.dataset.mood = m.key;
      btn.setAttribute('aria-pressed', m.key === current ? 'true' : 'false');
      if (m.key !== 'all') btn.appendChild(el('span', 'mood-dot mood-' + m.key));
      btn.appendChild(document.createTextNode(m.label));
      filterBar.appendChild(btn);
    });
  }

  function buildCard(p) {
    var itemName = p.name + (p.size ? ' ' + p.size : '');
    var orderUrl =
      'order.html?item=' + encodeURIComponent(itemName) +
      '&price=' + encodeURIComponent(p.price);

    var card = el('article', 'product-card mood-' + p.mood);

    var imgWrap = el('div', 'product-card__image');
    var img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    img.addEventListener('error', function () { img.remove(); });
    imgWrap.appendChild(img);

    var body = el('div', 'product-card__body');
    body.appendChild(el('h3', 'product-card__name', p.name));

    var meta = el('div', 'product-card__meta');
    meta.appendChild(el('span', 'mood-dot'));
    meta.appendChild(el('span', '', p.size || 'โรลออน'));
    body.appendChild(meta);

    var foot = el('div', 'product-card__foot');
    foot.appendChild(el('span', 'price', formatPrice(p.price)));
    var buy = el('a', 'btn btn--small', 'สั่งซื้อ');
    buy.href = orderUrl;
    foot.appendChild(buy);
    body.appendChild(foot);

    card.appendChild(imgWrap);
    card.appendChild(body);
    return card;
  }

  function renderProducts() {
    list.innerHTML = '';
    var shown = products.filter(function (p) {
      return current === 'all' || p.mood === current;
    });
    if (shown.length === 0) {
      list.appendChild(el('p', 'form-note', 'ไม่พบสินค้าในหมวดนี้'));
      return;
    }
    shown.forEach(function (p) { list.appendChild(buildCard(p)); });
  }

  if (filterBar) {
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      current = btn.dataset.mood;
      renderFilters();
      renderProducts();
    });
  }

  renderFilters();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      renderProducts();
    })
    .catch(function (error) {
      console.error(error);
      list.innerHTML = '';
      list.appendChild(el('p', 'form-status is-error', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'));
    });
}

/* ==========================================================================
   2) หน้า order.html
   ========================================================================== */

function initOrderPage() {
  var form = document.getElementById('orderForm');
  var params = new URLSearchParams(window.location.search);

  // เติมชื่อสินค้าและราคาอัตโนมัติ (ทั้ง #items และ #total)
  var item = params.get('item');
  var price = params.get('price');
  if (item) document.getElementById('items').value = item;
  if (price) document.getElementById('total').value = price;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.reportValidity && !form.reportValidity()) return;

    var payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    fetch(ORDER_API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      if (submitBtn) submitBtn.disabled = false;
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ==========================================================================
   3) หน้า admin.html
   ========================================================================== */

// parse CSV เอง: รองรับ "…" ครอบค่า, "" แทนเครื่องหมายคำพูด, และขึ้นบรรทัดใหม่ในช่อง
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // ตัด BOM

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // ตัดแถวว่าง
  return rows.filter(function (r) {
    return r.some(function (cell) { return cell.trim() !== ''; });
  });
}

function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');

  function showMessage(text, isError) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = el('td', isError ? 'form-status is-error' : 'form-note', text);
    td.colSpan = 6;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...', false);

  fetch(ORDERS_CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text);

      // ถ้าแถวแรกเป็นหัวตาราง (ช่องวันเวลาไม่มีตัวเลข) ให้ข้าม
      if (rows.length && !/\d/.test(rows[0][0] || '')) rows.shift();

      if (rows.length === 0) {
        showMessage('ยังไม่มีรายการสั่งซื้อ', false);
        return;
      }

      // แถวใหม่ถูกต่อท้ายชีตเสมอ จึงกลับลำดับให้รายการล่าสุดขึ้นก่อน
      rows.reverse();

      tbody.innerHTML = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var i = 0; i < 6; i++) {
          tr.appendChild(el('td', '', r[i] !== undefined ? r[i] : ''));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', true);
    });
}
