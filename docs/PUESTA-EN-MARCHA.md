# Poner la web en marcha (gratis)

Son cuatro cuentas gratuitas. Ninguna pide tarjeta para lo que vamos a usar.
Tardas unos 20 minutos. Las claves las pegas tú directamente en Vercel: no hace falta mandárselas a nadie.

| Servicio | Para qué | Coste |
|---|---|---|
| GitHub | Guardar el código de la web | Gratis |
| Supabase | Base de datos, acceso por correo y fotos | Gratis (plan Free) |
| Gemini (Google AI Studio) | El cerebro de Teo y Nuria | Gratis (nivel gratuito) |
| Vercel | Publicar la web con su dirección | Gratis (plan Hobby) |

---

## 1. GitHub: un sitio para el código

1. Entra en github.com con tu cuenta.
2. Arriba a la derecha, **+** → **New repository**.
3. Nombre: `oficina-virtual`. Marca **Private**. No marques nada más.
4. Pulsa **Create repository** y avísame. Yo subo el código.

## 2. Supabase: la base de datos

1. Entra en supabase.com → **Start your project** → entra con tu cuenta de GitHub.
2. **New project**:
   - Name: `oficina-virtual`
   - Database password: pulsa **Generate a password** (no la vas a necesitar).
   - Region: **Central EU (Frankfurt)**.
   - Pulsa **Create new project** y espera un par de minutos.
3. Menú de la izquierda → **SQL Editor** → **New query**. Abre el archivo `instalar.sql` (te lo he adjuntado; también está en tu repositorio, carpeta `supabase`),
   copia todo, pégalo y pulsa **Run**. Debe decir «Success».
4. Menú → **Authentication** → **Users** → **Add user** → **Create new user**:
   pon tu correo, una contraseña cualquiera y marca **Auto Confirm User**.
5. Otra vez **SQL Editor** → **New query**. Pega el archivo `alta-tienda.sql` (también adjunto), cambia el
   nombre de tu tienda, tu nombre y tu correo (el mismo del paso 4), y pulsa **Run**.
   Abajo debe salir una fila con tu tienda y tu correo.
6. Menú → **Project Settings** → **API**. Deja esta página abierta: vas a copiar tres datos
   en el paso 4 (Project URL, `anon public` y `service_role`).

## 3. Gemini: la clave de los empleados

1. Entra en aistudio.google.com con tu cuenta de Google.
2. **Get API key** → **Create API key**. Copia la clave.

## 4. Vercel: publicar la web

1. Entra en vercel.com → **Sign Up** → **Continue with GitHub**. Elige el plan **Hobby**.
2. **Add New…** → **Project** → al lado de `oficina-virtual` pulsa **Import**.
3. Abre **Environment Variables** y añade estas cinco (nombre a la izquierda, valor a la derecha):

   | Nombre | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave `anon public` de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clave `service_role` de Supabase (secreta) |
   | `GEMINI_API_KEY` | Tu clave de Gemini |
   | `GEMINI_FOTOS_MODELO` | `no` |

4. Pulsa **Deploy**. Al terminar te da una dirección, por ejemplo `https://oficina-virtual-xxxx.vercel.app`.

## 5. Último ajuste en Supabase

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: pega la dirección de Vercel.
3. **Redirect URLs** → **Add URL**: la dirección de Vercel seguida de `/auth/callback`,
   por ejemplo `https://oficina-virtual-xxxx.vercel.app/auth/callback`. Guarda.

## Ya está

Abre la dirección de Vercel → **Acceso clientes** → pon tu correo → abre el enlace que te llega
→ estás en el panel de tu tienda. Rellena la encuesta y sube tus fotos en **Enviar fotos**.

### Límites de lo gratuito
- El correo de acceso de Supabase gratis admite pocos envíos por hora. Para pruebas sobra.
- El nivel gratuito de Gemini tiene un límite de usos al día y Google puede usar las fotos para mejorar sus productos.
- La foto en modelo está apagada (`GEMINI_FOTOS_MODELO=no`) porque Google la cobra. Teo mejora la luz y el encuadre gratis.
- El acceso por WhatsApp está oculto: necesita un proveedor de mensajes de pago. Se activa más adelante.

## Cómo está montado ahora (25-11-2026)
- Código: repositorio `mgmtrading00-svg/academia`, rama `oficina-virtual` (la rama `main` es la web de academia y no se toca).
- Vercel: proyecto «academia» del equipo moralagencyai, conectado a ese repositorio, con la rama `oficina-virtual` como producción.
- Supabase: proyecto `oficina-virtual` en Frankfurt.
