import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA_DIR = join(ROOT, 'server', 'data');
const UPLOAD_DIR = join(ROOT, 'uploads');
const PRODUCTS_FILE = join(DATA_DIR, 'products.json');
const CONFIG_FILE = join(DATA_DIR, 'config.json');

export const CATEGORIES = ['cakes', 'petit-gateaux', 'tarts', 'viennoiserie', 'savory', 'jars'];
const TOKEN_TTL = 1000 * 60 * 60 * 12;
const MAX_BODY = 12 * 1024 * 1024;
const IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- config: admin password + signing secret ---------- */
function loadConfig() {
  if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  const config = { password: randomBytes(9).toString('base64url'), secret: randomBytes(32).toString('hex') };
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  console.log(`\n  🐝 Admin password created in server/data/config.json\n`);
  return config;
}
const config = loadConfig();
const adminPassword = process.env.ADMIN_PASSWORD || config.password;

const sign = (payload) => createHmac('sha256', config.secret).update(payload).digest('base64url');
const issueToken = () => {
  const payload = String(Date.now() + TOKEN_TTL);
  return `${payload}.${sign(payload)}`;
};
const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const validToken = (header = '') => {
  const [payload, sig] = header.replace(/^Bearer /, '').split('.');
  return !!payload && !!sig && safeEqual(sig, sign(payload)) && Number(payload) > Date.now();
};

/* ---------- storage ---------- */
const readProducts = () => JSON.parse(readFileSync(PRODUCTS_FILE, 'utf8'));
function writeProducts(list) {
  const tmp = `${PRODUCTS_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(list, null, 2));
  renameSync(tmp, PRODUCTS_FILE);
}

function saveImage(dataUrl) {
  const m = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw new HttpError(400, 'صيغة الصورة غير مدعومة');
  const name = `${randomUUID()}.${IMAGE_TYPES[m[1]]}`;
  writeFileSync(join(UPLOAD_DIR, name), Buffer.from(m[2], 'base64'));
  return `/uploads/${name}`;
}
function removeImage(url) {
  const m = /^\/uploads\/([a-f0-9-]+\.(?:webp|jpg|png))$/.exec(url || '');
  if (m && existsSync(join(UPLOAD_DIR, m[1]))) unlinkSync(join(UPLOAD_DIR, m[1]));
}

/* ---------- helpers ---------- */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const send = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};
function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        fail(new HttpError(413, 'حجم الصورة كبير جداً'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { fail(new HttpError(400, 'بيانات غير صالحة')); }
    });
    req.on('error', fail);
  });
}

const text = (v, max = 400) => String(v ?? '').trim().slice(0, max);
const pair = (v, max) => ({ ar: text(v?.ar, max), en: text(v?.en, max) });

function clean(input, existing = {}) {
  const p = {
    ...existing,
    name: pair(input.name, 80),
    tagline: pair(input.tagline, 80),
    description: pair(input.description, 400),
    category: CATEGORIES.includes(input.category) ? input.category : null,
    price: input.price === '' || input.price == null ? null : Math.max(0, Math.round(Number(input.price)) || 0),
    available: input.available !== false,
    featured: !!input.featured,
    updatedAt: new Date().toISOString(),
  };
  if (!p.name.ar && !p.name.en) throw new HttpError(400, 'اسم الصنف مطلوب');
  if (!p.category) throw new HttpError(400, 'اختر الفئة');
  return p;
}

/* ---------- middleware ---------- */
export function api(req, res, next) {
  const url = new URL(req.url, 'http://x');

  if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
    const m = /^\/uploads\/([a-f0-9-]+)\.(webp|jpg|png)$/.exec(url.pathname);
    const file = m && join(UPLOAD_DIR, `${m[1]}.${m[2]}`);
    if (!file || !existsSync(file)) return send(res, 404, { error: 'not found' });
    res.setHeader('Content-Type', { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png' }[m[2]]);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return createReadStream(file).pipe(res);
  }

  if (!url.pathname.startsWith('/api/')) return next();

  handle(req, url).then(
    ([status, body]) => send(res, status, body),
    (err) => send(res, err.status || 500, { error: err.status ? err.message : 'خطأ في الخادم' }),
  );
}

async function handle(req, url) {
  const { pathname } = url;
  const method = req.method;

  if (method === 'GET' && pathname === '/api/products') {
    const all = readProducts();
    return [200, validToken(req.headers.authorization) ? all : all.filter((p) => p.available)];
  }

  if (method === 'POST' && pathname === '/api/login') {
    const { password } = await readBody(req);
    if (!password || !safeEqual(String(password), adminPassword)) throw new HttpError(401, 'كلمة المرور غير صحيحة');
    return [200, { token: issueToken() }];
  }

  if (!validToken(req.headers.authorization)) throw new HttpError(401, 'انتهت الجلسة، سجّل الدخول مجدداً');

  const idMatch = /^\/api\/products\/([\w-]+)$/.exec(pathname);

  if (method === 'POST' && pathname === '/api/products') {
    const body = await readBody(req);
    if (!body.image) throw new HttpError(400, 'أضف صورة للصنف');
    const product = clean(body, { id: randomUUID(), createdAt: new Date().toISOString() });
    product.image = saveImage(body.image);
    writeProducts([product, ...readProducts()]);
    return [201, product];
  }

  if (method === 'PUT' && idMatch) {
    const body = await readBody(req);
    const list = readProducts();
    const i = list.findIndex((p) => p.id === idMatch[1]);
    if (i < 0) throw new HttpError(404, 'الصنف غير موجود');
    const product = clean(body, list[i]);
    if (body.image?.startsWith('data:')) {
      product.image = saveImage(body.image);
      removeImage(list[i].image);
    }
    list[i] = product;
    writeProducts(list);
    return [200, product];
  }

  if (method === 'DELETE' && idMatch) {
    const list = readProducts();
    const product = list.find((p) => p.id === idMatch[1]);
    if (!product) throw new HttpError(404, 'الصنف غير موجود');
    removeImage(product.image);
    writeProducts(list.filter((p) => p !== product));
    return [200, { ok: true }];
  }

  throw new HttpError(404, 'not found');
}
