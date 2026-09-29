# Bee Patisserie 🐝

A luxury bilingual (English / العربية) website for **Bee Patisserie**, Damascus — with an animated logo intro, a signature "Follow the Bee" scroll animation, and an Arabic admin dashboard for managing products (الاصناف).

## Run it

```bash
npm install
npm run dev
```

- Website: http://localhost:5173
- Dashboard: http://localhost:5173/admin.html

On first run an admin password is generated in `server/data/config.json` (not committed). You can override it with the `ADMIN_PASSWORD` environment variable.

## Production

```bash
npm run build
npm start        # serves the site + API on http://localhost:3000 (PORT to change)
```

## Stack

Vite · GSAP + ScrollTrigger · Lenis smooth scroll · a dependency-free Node API (`server/api.js`) storing products in `server/data/products.json` and photos in `uploads/`.
