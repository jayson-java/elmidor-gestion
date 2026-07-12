# 🐔 Elmidor Gestión — Guía de instalación completa

App para gestionar **Producción, Stock, Gastos y Ventas** de tu avícola.
Los datos se guardan en una Google Sheet propia — sin servidores, sin costos.

Tiempo estimado: **15-20 minutos**, se hace una sola vez.

---

## PASO 1 — Crear el Google Sheet con las 5 hojas

1. Ve a **[sheets.google.com](https://sheets.google.com)** → Hoja en blanco
2. Nómbrala: **Elmidor Gestión - Base de Datos**
3. Crea **5 pestañas** (clic derecho en la pestaña inferior → Insertar hoja). Déjalas con estos nombres **exactos**:

```
Produccion   Stock   Gastos   Ventas   Resumen
```

> ⚠️ Sin tildes, sin espacios, exactamente así (mayúscula inicial).

4. En cada hoja, pega estos encabezados en la **fila 1**:

**Hoja "Produccion"**
```
id	fecha	cantidad	talla	quebrados	observacion	timestamp
```

**Hoja "Stock"**
```
id	fecha	formato	cantidadHuevos	tipoMovimiento	motivo	timestamp
```

**Hoja "Gastos"**
```
id	fecha	categoria	descripcion	monto	timestamp
```

**Hoja "Ventas"**
```
id	fecha	cliente	formato	talla	cantidad	montoTotal	metodoPago	timestamp
```

**Hoja "Resumen"** — déjala vacía, el sistema la usa automáticamente.

💡 Tip: pega cada fila de encabezados directo en la celda A1 — Sheets separa las columnas solo si copias el texto con tabulaciones (cópialo tal cual desde aquí).

---

## PASO 2 — Instalar el conector (Apps Script)

Este script es el "traductor" entre tu app y la planilla.

1. En tu Google Sheet, ve a **Extensiones → Apps Script**
2. Se abre un editor de código con un archivo `Code.gs` vacío
3. **Borra todo** el contenido que aparece por defecto
4. Abre el archivo **`AppsScript.gs`** (incluido en esta carpeta), copia **todo** su contenido
5. Pégalo en el editor de Apps Script
6. Arriba, donde dice "Proyecto sin título", ponle nombre: **Elmidor Conector**
7. Clic en el ícono de **Guardar** (💾)

---

## PASO 3 — Publicar el script como aplicación web

1. En Apps Script, arriba a la derecha, clic en **Implementar → Nueva implementación**
2. Clic en el ícono de engranaje ⚙️ junto a "Seleccionar tipo" → elige **Aplicación web**
3. Completa así:
   - **Descripción:** Elmidor Gestión v1
   - **Ejecutar como:** Yo (tu correo)
   - **Quién puede acceder:** **Cualquier usuario**
4. Clic en **Implementar**
5. Google te pedirá **autorizar permisos**:
   - Clic en "Autorizar acceso"
   - Elige tu cuenta de Google
   - Puede aparecer una advertencia "Google no verificó esta app" → clic en **Configuración avanzada** → **Ir a Elmidor Conector (no seguro)** → Permitir
   - (Esto es normal y seguro: es tu propio script, en tu propia cuenta)
6. Te entrega una **URL** parecida a esta:
```
https://script.google.com/macros/s/AKfycbz.../exec
```
7. **Cópiala completa** — la necesitas en el siguiente paso

> 🔁 Cada vez que vuelvas a editar el script y quieras que los cambios se apliquen, debes hacer **Implementar → Administrar implementaciones → ✏️ Editar → Nueva versión → Implementar**.

---

## PASO 4 — Probar el conector (opcional pero recomendado)

1. En el editor de Apps Script, arriba selecciona la función **`probarConexion`** en el menú desplegable
2. Clic en **Ejecutar** (▶️)
3. Ve a **Ver → Registro** (o Ctrl+Enter)
4. Deberías ver listadas las 5 hojas y un resumen en ceros — eso confirma que el script lee tu planilla correctamente

---

## PASO 5 — Conectar la app

1. Abre el archivo **`index.html`** de esta carpeta (ver "Cómo ejecutar la app" más abajo)
2. La primera vez verás una pantalla de **"Conecta tu Google Sheet"**
3. Pega la URL que copiaste en el Paso 3
4. Clic en **Conectar y empezar**

¡Listo! Ya puedes registrar producción, stock, gastos y ventas, y todo se guarda en tu Google Sheet.

---

## 📱 Cómo ejecutar la app

### Para probarla en tu computador
```bash
cd elmidor-gestion
python3 -m http.server 8000
```
Abre `http://localhost:8000` en el navegador.

### Para publicarla y usarla desde el celular
1. Sube toda la carpeta `elmidor-gestion` a **Netlify Drop** (igual que el sitio web)
2. Te da una URL pública, ej: `elmidor-gestion.netlify.app`
3. Ábrela desde el navegador del celular
4. En el celular puedes **"Agregar a pantalla de inicio"** (Chrome/Safari) para que se vea como una app

---

## 🔌 Funciona sin internet

Si estás en el campo sin señal:
- Puedes seguir **registrando** producción, stock, gastos y ventas
- Los datos se guardan en tu celular temporalmente
- Apenas vuelve la conexión, se **sincronizan solos** con Google Sheets
- Verás un aviso amarillo arriba indicando cuántos registros están pendientes

---

## 🛠️ Personalizar

Abre **`js/config.js`** para:
- Cambiar los formatos de productos (cajas, bandejas, estuches)
- Cambiar las categorías de gastos
- Cambiar los métodos de pago
- Cambiar las tallas de huevo

No necesitas tocar ningún otro archivo.

---

## ❓ Problemas comunes

**"No se pudo actualizar" al abrir la app**
→ Revisa que la URL en Ajustes (ícono ⚙️) sea exactamente la que copiaste de Apps Script, terminada en `/exec`

**Los datos no aparecen aunque los guardé**
→ Verifica que los nombres de las hojas sean exactamente: `Produccion`, `Stock`, `Gastos`, `Ventas` (sin tildes)

**Aparece "Script function not found"**
→ Volviste a implementar pero elegiste "Nueva implementación" en vez de actualizar la existente. Usa **Administrar implementaciones → Editar → Nueva versión**

**Cambié el config.js pero no veo el cambio**
→ Borra caché del navegador (Ctrl+F5) o vuelve a subir la carpeta a Netlify
