# Variables de Entorno para Render (Production)

Copia y pega estos valores EXACTAMENTE como están en el panel de **Environment Variables** de Render.

| Key (Clave) | Value (Valor) |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `FRONTEND_URL` | `*` |
| `SUPABASE_URL` | `https://dxekhdiomzpfcwitzhbj.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZWtoZGlvbXpwZmN3aXR6aGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDQ5NjMsImV4cCI6MjA4MzkyMDk2M30.n1iw7HYvjst941mzlm4dKP3XmOcsFo8g8p_QV4ERywQ` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZWtoZGlvbXpwZmN3aXR6aGJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODM0NDk2MywiZXhwIjoyMDgzOTIwOTYzfQ.TCIEyfWfXjI91AiuZXhE0Ge0iggbCjY1Oyilct1Y42M` |
| `JWT_SECRET` | `your-jwt-secret-for-additional-tokens` |
| `RATE_LIMIT_MAX_REQUESTS` | `1000` |
| `RESEND_API_KEY` | `re_WeAZwZSE_FiFEx6wwxhbME1ek1gren4KF` |
| `STRIPE_SECRET_KEY` | `sk_live_... (Copiado en tus notas personales)` |
| `STRIPE_PUBLIC_KEY` | `pk_live_... (Copiado en tus notas personales)` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_... (Placeholder)` |

**Nota Importante Seguridad:**
He copiado literalmente tus llaves actuales para que funcione. En el futuro, considera cambiar `JWT_SECRET` por una cadena aleatoria larga para mayor seguridad en producción.
