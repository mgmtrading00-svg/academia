# Oficina Virtual (nombre provisional)

Web pública y área de clientes de la oficina de empleados digitales para tiendas de ropa.

## Qué hay

- **Portada** (`/`): oficina isométrica con los 8 puestos, cómo funciona, equipo y precios.
- **Acceso** (`/acceso`): sin contraseña, con enlace mágico por correo (Supabase Auth).
- **Panel** (`/panel`): la oficina de la tienda. Cada puesto muestra su estado; la tienda aprueba o pide cambios.
- **Enviar fotos** (`/panel/fotos`): sube hasta 20 fotos; cada foto crea una tarea en la cola de Teo.
- **Encuesta de alta** (`/panel/encuesta`): 5 pasos que configuran la oficina de cada tienda.

## Arrancar en local

```bash
npm install
npm run dev   # http://localhost:3000
```

Sin variables de entorno arranca en **modo demostración**: entra con "Entrar con la tienda de ejemplo".
Los datos viven en memoria y se reinician al reiniciar el servidor.

## Conectar la base de datos (Supabase)

1. Crear un proyecto en Supabase (región UE).
2. Ejecutar `supabase/migrations/0001_init.sql` en el editor SQL.
3. Copiar `.env.example` a `.env.local` y rellenar URL y clave anónima.
4. En Auth → URL Configuration, añadir `https://<dominio>/auth/callback`.
5. Dar de alta una tienda: insertar en `shops` y enlazar el usuario en `shop_members`.

Las tiendas solo ven sus datos (Row Level Security). Los agentes escriben con la clave de servicio.

## Cómo encajan los agentes

La tabla `tasks` es la cola de trabajo. Cada agente (proceso en servidor) coge tareas `pendiente` de su
`agent_id`, las pasa a `en_curso`, y al terminar las deja en `espera_aprobacion` (o `hecha`), actualiza
`agent_states` y escribe en `activity`. La tienda decide con la función `decide_task`.

## Estructura

```
src/app            páginas y acciones de servidor
src/components     oficina, panel, subida de fotos, encuesta
src/lib            catálogo de agentes, acceso a datos, modo demo, dibujo de la oficina
supabase/          esquema SQL
```
