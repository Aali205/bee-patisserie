import './admin.css';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const CATEGORIES = {
  cakes: 'كيك',
  'petit-gateaux': 'بوتي جاتو',
  tarts: 'تارت',
  viennoiserie: 'كرواسان ومعجنات',
  savory: 'مالحات',
  jars: 'حلويات البرطمان',
};
const SORTS = {
  newest: 'الأحدث أولاً',
  oldest: 'الأقدم أولاً',
  name: 'الاسم (أ ← ي)',
  priceAsc: 'السعر: الأقل أولاً',
  priceDesc: 'السعر: الأعلى أولاً',
};

const state = {
  products: [],
  filters: { q: '', category: 'all', status: 'all', featured: false, sort: 'newest' },
  editing: null,
  image: null,
};

/* ---------------- session ---------------- */
const session = {
  get: () => { try { return sessionStorage.getItem('bee-admin') || ''; } catch { return ''; } },
  set: (t) => { try { sessionStorage.setItem('bee-admin', t); } catch { /* ignore */ } },
  clear: () => { try { sessionStorage.removeItem('bee-admin'); } catch { /* ignore */ } },
};

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.get()}` },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') {
    showLogin();
    throw new Error(data.error || 'انتهت الجلسة');
  }
  if (!res.ok) throw new Error(data.error || 'حدث خطأ غير متوقع');
  return data;
}

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg, type = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast is-on toast--${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 2800);
}

/* ---------------- auth ---------------- */
function showLogin() {
  session.clear();
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#password').focus();
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  $('#loginError').textContent = '';
  try {
    const { token } = await request('/api/login', { method: 'POST', body: { password: $('#password').value } });
    session.set(token);
    $('#password').value = '';
    await startApp();
  } catch (err) {
    $('#loginError').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$('#logout').addEventListener('click', showLogin);

async function startApp() {
  $('#login').hidden = true;
  $('#app').hidden = false;
  state.products = await request('/api/products');
  route();
}

/* ---------------- routing ---------------- */
const routes = { overview: renderOverview, products: renderProducts };
function route() {
  const name = location.hash.startsWith('#/products') ? 'products' : 'overview';
  $$('.side__nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.route === name));
  $('#addBtn').hidden = name !== 'products';
  document.body.classList.remove('side-open');
  routes[name]();
}
addEventListener('hashchange', route);
$('#menuBtn').addEventListener('click', () => document.body.classList.toggle('side-open'));

const name = (p) => p.name.ar || p.name.en;
const price = (p) => (p.price ? `${p.price.toLocaleString('ar-SY')} ل.س` : '—');

/* ---------------- overview ---------------- */
function renderOverview() {
  $('#pageTitle').textContent = 'نظرة عامة';
  $('#crumb').textContent = 'لوحة التحكم';
  const list = state.products;
  const stats = [
    ['كل الاصناف', list.length, 'honey'],
    ['متاح للبيع', list.filter((p) => p.available).length, 'green'],
    ['في التشكيلة المميزة', list.filter((p) => p.featured).length, 'gold'],
    ['غير متاح', list.filter((p) => !p.available).length, 'muted'],
  ];
  const byCat = Object.entries(CATEGORIES).map(([k, v]) => [v, list.filter((p) => p.category === k).length]);
  const max = Math.max(1, ...byCat.map(([, n]) => n));

  $('#view').innerHTML = `
    <div class="stats">${stats.map(([l, n, c]) => `<div class="stat stat--${c}"><span>${l}</span><strong>${n.toLocaleString('ar-SY')}</strong></div>`).join('')}</div>
    <div class="panels">
      <section class="panel">
        <h2>الاصناف حسب الفئة</h2>
        <ul class="bars">${byCat.map(([l, n]) => `<li><span>${l}</span><i style="--w:${(n / max) * 100}%"></i><b>${n.toLocaleString('ar-SY')}</b></li>`).join('')}</ul>
      </section>
      <section class="panel">
        <div class="panel__head"><h2>آخر الاصناف المضافة</h2><a href="#/products">عرض الكل ←</a></div>
        <ul class="recent">${list.slice(0, 5).map((p) => `
          <li><img src="${esc(p.image)}" alt="" /><div><strong>${esc(name(p))}</strong><small>${CATEGORIES[p.category]}</small></div><span>${price(p)}</span></li>`).join('')}
        </ul>
      </section>
    </div>`;
}

/* ---------------- products (الاصناف) ---------------- */
function filtered() {
  const { q, category, status, featured, sort } = state.filters;
  const needle = q.trim().toLowerCase();
  const list = state.products.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    if (status === 'available' && !p.available) return false;
    if (status === 'hidden' && p.available) return false;
    if (featured && !p.featured) return false;
    if (!needle) return true;
    return [p.name.ar, p.name.en, p.tagline.ar, p.tagline.en, p.description.ar, p.description.en, CATEGORIES[p.category]]
      .some((v) => v?.toLowerCase().includes(needle));
  });
  const byPrice = (dir) => (a, b) => (a.price == null) - (b.price == null) || (a.price - b.price) * dir;
  const sorters = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    name: (a, b) => name(a).localeCompare(name(b), 'ar'),
    priceAsc: byPrice(1),
    priceDesc: byPrice(-1),
  };
  return list.sort(sorters[sort]);
}

function renderProducts() {
  $('#pageTitle').textContent = 'الاصناف';
  $('#crumb').textContent = `لوحة التحكم / ${state.products.length.toLocaleString('ar-SY')} صنف`;
  const f = state.filters;
  const counts = (k) => state.products.filter((p) => k === 'all' || p.category === k).length.toLocaleString('ar-SY');

  $('#view').innerHTML = `
    <div class="filters">
      <label class="search">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input id="q" type="search" placeholder="ابحث باسم الصنف أو الوصف أو الفئة…" value="${esc(f.q)}" />
      </label>
      <select id="status" aria-label="الحالة">
        <option value="all">كل الحالات</option>
        <option value="available">متاح</option>
        <option value="hidden">غير متاح</option>
      </select>
      <select id="sort" aria-label="الترتيب">${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <label class="chip-toggle"><input type="checkbox" id="featuredOnly" ${f.featured ? 'checked' : ''} /><span>★ المميزة فقط</span></label>
    </div>
    <div class="chips" id="chips">
      ${[['all', 'الكل'], ...Object.entries(CATEGORIES)].map(([k, v]) => `<button type="button" class="chip ${f.category === k ? 'is-active' : ''}" data-cat="${k}">${v}<b>${counts(k)}</b></button>`).join('')}
    </div>
    <div class="results-bar"><span id="resultCount"></span><button type="button" class="link" id="clearFilters" hidden>مسح الفلاتر</button></div>
    <div class="products" id="grid"></div>`;

  $('#status').value = f.status;
  $('#sort').value = f.sort;
  $('#q').addEventListener('input', (e) => { f.q = e.target.value; renderGrid(); });
  $('#status').addEventListener('change', (e) => { f.status = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', (e) => { f.sort = e.target.value; renderGrid(); });
  $('#featuredOnly').addEventListener('change', (e) => { f.featured = e.target.checked; renderGrid(); });
  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    f.category = chip.dataset.cat;
    $$('.chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    renderGrid();
  });
  $('#clearFilters').addEventListener('click', () => {
    state.filters = { q: '', category: 'all', status: 'all', featured: false, sort: 'newest' };
    renderProducts();
  });
  renderGrid();
}

function renderGrid() {
  const list = filtered();
  const f = state.filters;
  $('#resultCount').textContent = `${list.length.toLocaleString('ar-SY')} نتيجة`;
  $('#clearFilters').hidden = !(f.q || f.category !== 'all' || f.status !== 'all' || f.featured);

  if (!list.length) {
    $('#grid').innerHTML = `<div class="empty"><img src="/images/bee-mark.png" alt="" /><h3>لا توجد أصناف مطابقة</h3><p>جرّب كلمة بحث أخرى أو امسح الفلاتر.</p></div>`;
    return;
  }
  $('#grid').innerHTML = list.map((p) => `
    <article class="product ${p.available ? '' : 'is-hidden'}" data-id="${p.id}">
      <div class="product__img">
        <img src="${esc(p.image)}" alt="" loading="lazy" />
        <span class="badge">${CATEGORIES[p.category]}</span>
        <button type="button" class="star ${p.featured ? 'is-on' : ''}" data-act="featured" title="${p.featured ? 'إزالة من التشكيلة المميزة' : 'إضافة إلى التشكيلة المميزة'}">★</button>
        ${p.available ? '' : '<span class="badge badge--off">غير متاح</span>'}
      </div>
      <div class="product__body">
        <h3>${esc(name(p))}</h3>
        ${p.name.en && p.name.ar ? `<p class="product__en" dir="ltr">${esc(p.name.en)}</p>` : ''}
        ${p.tagline.ar ? `<p class="product__tag">${esc(p.tagline.ar)}</p>` : ''}
        <div class="product__row">
          <strong>${price(p)}</strong>
          <label class="mini-switch" title="متاح للبيع"><input type="checkbox" data-act="available" ${p.available ? 'checked' : ''} /><i></i></label>
        </div>
      </div>
      <div class="product__actions">
        <button type="button" class="btn btn--soft" data-act="edit">تعديل</button>
        <button type="button" class="icon-btn icon-btn--danger" data-act="delete" aria-label="حذف"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>
      </div>
    </article>`).join('');
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  const card = btn?.closest('.product');
  if (!card || btn.type === 'checkbox') return;
  const p = state.products.find((x) => x.id === card.dataset.id);
  if (btn.dataset.act === 'edit') openForm(p);
  if (btn.dataset.act === 'delete') askDelete(p);
  if (btn.dataset.act === 'featured') await quickUpdate(p, { featured: !p.featured }, p.featured ? 'أُزيل من التشكيلة المميزة' : 'أُضيف إلى التشكيلة المميزة');
});
document.addEventListener('change', async (e) => {
  if (e.target.dataset.act !== 'available') return;
  const p = state.products.find((x) => x.id === e.target.closest('.product').dataset.id);
  await quickUpdate(p, { available: e.target.checked }, e.target.checked ? 'الصنف متاح الآن' : 'تم إخفاء الصنف من الموقع');
});

async function quickUpdate(p, patch, msg) {
  try {
    const updated = await request(`/api/products/${p.id}`, { method: 'PUT', body: { ...p, ...patch } });
    state.products = state.products.map((x) => (x.id === p.id ? updated : x));
    renderGrid();
    toast(msg);
  } catch (err) {
    toast(err.message, 'err');
    renderGrid();
  }
}

/* ---------------- form ---------------- */
const drawer = $('#drawer');
const form = $('#productForm');
$('#categorySelect').innerHTML = `<option value="">اختر الفئة</option>${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}`;
$$('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
$('#addBtn').addEventListener('click', () => openForm(null));

function openForm(p) {
  state.editing = p;
  state.image = null;
  form.reset();
  $('#formError').textContent = '';
  $('#formTitle').textContent = p ? 'تعديل الصنف' : 'إضافة صنف';
  $('#saveBtn').textContent = p ? 'حفظ التعديلات' : 'حفظ الصنف';
  if (p) {
    ['name', 'tagline', 'description'].forEach((k) => ['ar', 'en'].forEach((l) => (form.elements[`${k}.${l}`].value = p[k][l] || '')));
    form.elements.category.value = p.category;
    form.elements.price.value = p.price ?? '';
    form.elements.available.checked = p.available;
    form.elements.featured.checked = p.featured;
  }
  setPreview(p?.image);
  drawer.showModal();
}

function setPreview(src) {
  const img = $('#preview');
  img.hidden = !src;
  if (src) img.src = src;
  $('#drop').classList.toggle('has-image', !!src);
}

// downscale + convert to webp in the browser so uploads stay small and fast
function compress(file) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/webp', 0.85));
    };
    img.onerror = () => fail(new Error('تعذّر قراءة الصورة'));
    img.src = URL.createObjectURL(file);
  });
}

async function takeFile(file) {
  if (!file?.type.startsWith('image/')) return toast('الملف ليس صورة', 'err');
  try {
    state.image = await compress(file);
    setPreview(state.image);
  } catch (err) {
    toast(err.message, 'err');
  }
}
$('#imageInput').addEventListener('change', (e) => takeFile(e.target.files[0]));
const drop = $('#drop');
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', (e) => takeFile(e.dataTransfer.files[0]));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const el = form.elements;
  const body = {
    name: { ar: el['name.ar'].value, en: el['name.en'].value },
    tagline: { ar: el['tagline.ar'].value, en: el['tagline.en'].value },
    description: { ar: el['description.ar'].value, en: el['description.en'].value },
    category: el.category.value,
    price: el.price.value,
    available: el.available.checked,
    featured: el.featured.checked,
    image: state.image || undefined,
  };
  if (!state.editing && !state.image) return ($('#formError').textContent = 'أضف صورة للصنف');

  const save = $('#saveBtn');
  save.disabled = true;
  save.classList.add('is-loading');
  try {
    const { editing } = state;
    const saved = await request(editing ? `/api/products/${editing.id}` : '/api/products', { method: editing ? 'PUT' : 'POST', body });
    state.products = editing ? state.products.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...state.products];
    drawer.close();
    renderProducts();
    toast(editing ? 'تم حفظ التعديلات' : 'تمت إضافة الصنف');
  } catch (err) {
    $('#formError').textContent = err.message;
  } finally {
    save.disabled = false;
    save.classList.remove('is-loading');
  }
});

/* ---------------- delete ---------------- */
function askDelete(p) {
  const dlg = $('#confirm');
  $('#confirmText').textContent = `سيتم حذف «${name(p)}» وصورته نهائياً.`;
  $('#confirmYes').onclick = async () => {
    try {
      await request(`/api/products/${p.id}`, { method: 'DELETE' });
      state.products = state.products.filter((x) => x.id !== p.id);
      dlg.close();
      renderProducts();
      toast('تم حذف الصنف');
    } catch (err) {
      toast(err.message, 'err');
    }
  };
  dlg.showModal();
}

/* ---------------- boot ---------------- */
if (session.get()) startApp().catch(() => {});
else showLogin();
