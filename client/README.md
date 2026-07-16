## B2B Marketplace Frontend (Vite + React)

This frontend is set up for a production-style B2B ecommerce UI:

- **Routing**: React Router with **lazy-loaded** route chunks (`src/routes/AppRoutes.jsx`)
- **API integration**: Axios client with `baseURL`, auth header injection, and 401 handling (`src/services/api.js`)
- **Global state**: Redux Toolkit (`src/app/store.js`, `src/store/slices/authSlice.js`)
- **Auth flow**: Login/Register pages with **Formik + Yup**, JWT persisted in localStorage (`src/pages/auth/*`, `src/lib/authStorage.js`)
- **Role-based access**: Protected routes for `BUYER`, `SELLER`, `ADMIN` (`ProtectedRoute`, `RequireAdminAuth`)
- **Toasts**: `react-hot-toast` globally configured (`src/app/providers.jsx`)
- **Build optimization**: manual vendor chunks in `vite.config.js`

### Environment variables

Create a `.env` in this folder (or use the example):

```bash
cp .env.example .env
```

Required:

- **`VITE_API_URL`**: backend base URL (must include `/api` if your server mounts routes under `/api`)

Example:

```env
VITE_API_URL=http://localhost:3001/api
```

### Run locally

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
npm run preview
```

### Deployment notes

- Set `VITE_API_URL` in your deployment environment (Vercel/Netlify/etc).
- Ensure your backend CORS allows the deployed frontend origin.

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
