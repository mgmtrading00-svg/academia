# Plantilla del correo de acceso (Supabase → Authentication → Emails → Magic Link)

**Asunto:**

Tu código para entrar: {{ .Token }}

**Cuerpo (pegar tal cual en «Source»):**

```html
<h2>Entra en tu oficina</h2>
<p>Tu código para entrar es:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:16px 0">{{ .Token }}</p>
<p>Escríbelo en la página donde lo pediste. También puedes pulsar este botón:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;background:#101C2E;color:#F7F3EC;padding:12px 22px;border-radius:8px;text-decoration:none">Entrar en mi oficina</a></p>
<p style="color:#666">El código y el botón caducan en una hora. Si no has pedido entrar, ignora este correo.</p>
```
