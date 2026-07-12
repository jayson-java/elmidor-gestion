/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Conector Google Apps Script
   ────────────────────────────────────────────────────────
   Este script convierte tu Google Sheet en una base de datos
   que la app web puede leer y escribir.

   INSTALACIÓN (ver GUIA-INSTALACION.md para el paso a paso):
   1. Crea el Google Sheet con las 5 hojas (ver guía)
   2. Extensiones → Apps Script
   3. Borra el contenido y pega TODO este archivo
   4. Implementar → Nueva implementación → Aplicación web
   5. Ejecutar como: Yo · Acceso: Cualquier usuario
   6. Copia la URL que te entrega y pégala en js/config.js
   ════════════════════════════════════════════════════════ */

// Nombres exactos de las hojas dentro del Google Sheet
const HOJAS = {
  PRODUCCION: "Produccion",
  STOCK:      "Stock",
  GASTOS:     "Gastos",
  VENTAS:     "Ventas",
  RESUMEN:    "Resumen"
};

// Encabezados esperados de cada hoja (en este orden exacto)
const COLUMNAS = {
  Produccion: ["id","fecha","cantidad","talla","quebrados","observacion","timestamp"],
  Stock:      ["id","fecha","formato","cantidadHuevos","tipoMovimiento","motivo","timestamp"],
  Gastos:     ["id","fecha","categoria","descripcion","monto","timestamp"],
  Ventas:     ["id","fecha","cliente","formato","talla","cantidad","montoTotal","metodoPago","timestamp"]
};

/* ════════ PUNTO DE ENTRADA: recibe peticiones de la app ════════ */
function doGet(e){
  return manejar(e);
}
function doPost(e){
  return manejar(e);
}

function manejar(e){
  try {
    var params = e.parameter || {};
    // Si viene un body JSON (POST), lo combinamos
    if(e.postData && e.postData.contents){
      try {
        var body = JSON.parse(e.postData.contents);
        for(var k in body) params[k] = body[k];
      } catch(err){ /* no era JSON, seguimos con parameter */ }
    }

    var accion = params.accion;
    var resultado;

    switch(accion){
      case "leer":
        resultado = leerHoja(params.hoja);
        break;
      case "agregar":
        resultado = agregarFila(params.hoja, JSON.parse(params.datos));
        break;
      case "editar":
        resultado = editarFila(params.hoja, params.id, JSON.parse(params.datos));
        break;
      case "eliminar":
        resultado = eliminarFila(params.hoja, params.id);
        break;
      case "resumen":
        resultado = calcularResumen();
        break;
      default:
        resultado = { error: "Acción no reconocida: " + accion };
    }

    return respuesta(resultado);

  } catch(err){
    return respuesta({ error: String(err) });
  }
}

/* ════════ RESPUESTA JSON con CORS abierto ════════ */
function respuesta(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ════════ LEER una hoja completa → array de objetos ════════ */
function leerHoja(nombreHoja){
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if(!hoja) return { error: "No existe la hoja: " + nombreHoja };

  var datos = hoja.getDataRange().getValues();
  if(datos.length < 2) return { filas: [] };

  var encabezados = datos[0];
  var filas = [];
  for(var i=1; i<datos.length; i++){
    var fila = {};
    for(var j=0; j<encabezados.length; j++){
      var valor = datos[i][j];
      // formatear fechas a YYYY-MM-DD para que JS las lea bien
      if(valor instanceof Date){
        valor = Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      fila[encabezados[i] !== undefined ? encabezados[j] : j] = valor;
    }
    // saltar filas completamente vacías
    if(fila.id !== "" && fila.id !== undefined){
      filas.push(fila);
    }
  }
  return { filas: filas };
}

/* ════════ AGREGAR una fila nueva ════════ */
function agregarFila(nombreHoja, datos){
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if(!hoja) return { error: "No existe la hoja: " + nombreHoja };

  var encabezados = hoja.getRange(1,1,1,hoja.getLastColumn()).getValues()[0];
  datos.id = "id_" + new Date().getTime() + "_" + Math.floor(Math.random()*1000);
  datos.timestamp = new Date().toISOString();

  var fila = encabezados.map(function(col){
    return datos[col] !== undefined ? datos[col] : "";
  });
  hoja.appendRow(fila);

  return { ok: true, id: datos.id };
}

/* ════════ EDITAR una fila existente por id ════════ */
function editarFila(nombreHoja, id, datos){
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if(!hoja) return { error: "No existe la hoja: " + nombreHoja };

  var rango = hoja.getDataRange();
  var valores = rango.getValues();
  var encabezados = valores[0];
  var colId = encabezados.indexOf("id");

  for(var i=1; i<valores.length; i++){
    if(valores[i][colId] === id){
      for(var j=0; j<encabezados.length; j++){
        var col = encabezados[j];
        if(datos[col] !== undefined){
          hoja.getRange(i+1, j+1).setValue(datos[col]);
        }
      }
      return { ok: true };
    }
  }
  return { error: "No se encontró el id: " + id };
}

/* ════════ ELIMINAR una fila por id ════════ */
function eliminarFila(nombreHoja, id){
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  if(!hoja) return { error: "No existe la hoja: " + nombreHoja };

  var valores = hoja.getDataRange().getValues();
  var colId = valores[0].indexOf("id");

  for(var i=1; i<valores.length; i++){
    if(valores[i][colId] === id){
      hoja.deleteRow(i+1);
      return { ok: true };
    }
  }
  return { error: "No se encontró el id: " + id };
}

/* ════════ RESUMEN: calcula los indicadores del dashboard ════════ */
function calcularResumen(){
  var hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var hoyDate = new Date();
  var inicioMes = Utilities.formatDate(new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1), Session.getScriptTimeZone(), "yyyy-MM-dd");

  var produccion = leerHoja(HOJAS.PRODUCCION).filas || [];
  var stock      = leerHoja(HOJAS.STOCK).filas || [];
  var gastos     = leerHoja(HOJAS.GASTOS).filas || [];
  var ventas     = leerHoja(HOJAS.VENTAS).filas || [];

  // Producción de hoy
  var produccionHoy = produccion
    .filter(function(p){ return p.fecha === hoy; })
    .reduce(function(s,p){ return s + (Number(p.cantidad)||0); }, 0);

  // Producción del mes
  var produccionMes = produccion
    .filter(function(p){ return p.fecha >= inicioMes; })
    .reduce(function(s,p){ return s + (Number(p.cantidad)||0); }, 0);

  // Quebrados del mes (para % de pérdida)
  var quebradosMes = produccion
    .filter(function(p){ return p.fecha >= inicioMes; })
    .reduce(function(s,p){ return s + (Number(p.quebrados)||0); }, 0);

  // Stock actual: entradas - salidas, acumulado histórico
  var stockActual = stock.reduce(function(s,m){
    var cant = Number(m.cantidadHuevos)||0;
    return m.tipoMovimiento === "entrada" ? s + cant : s - cant;
  }, 0);

  // Gastos del mes
  var gastosMes = gastos
    .filter(function(g){ return g.fecha >= inicioMes; })
    .reduce(function(s,g){ return s + (Number(g.monto)||0); }, 0);

  // Gastos por categoría (del mes)
  var gastosPorCategoria = {};
  gastos.filter(function(g){ return g.fecha >= inicioMes; }).forEach(function(g){
    var cat = g.categoria || "Otros";
    gastosPorCategoria[cat] = (gastosPorCategoria[cat]||0) + (Number(g.monto)||0);
  });

  // Ventas del mes
  var ventasMes = ventas
    .filter(function(v){ return v.fecha >= inicioMes; })
    .reduce(function(s,v){ return s + (Number(v.montoTotal)||0); }, 0);

  // Ventas del mes anterior (para comparar variación %)
  var hoyD = new Date();
  var inicioMesAnt = Utilities.formatDate(new Date(hoyD.getFullYear(), hoyD.getMonth()-1, 1), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var finMesAnt     = Utilities.formatDate(new Date(hoyD.getFullYear(), hoyD.getMonth(), 0), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var ventasMesAnt = ventas
    .filter(function(v){ return v.fecha >= inicioMesAnt && v.fecha <= finMesAnt; })
    .reduce(function(s,v){ return s + (Number(v.montoTotal)||0); }, 0);
  var variacionVentas = ventasMesAnt > 0 ? Math.round(((ventasMes - ventasMesAnt)/ventasMesAnt)*100) : null;

  // Costo por huevo (gastos del mes / producción del mes)
  var costoPorHuevo = produccionMes > 0 ? Math.round(gastosMes / produccionMes) : 0;

  // Margen del mes (ventas - gastos)
  var margenMes = ventasMes - gastosMes;

  // % de quiebre
  var pctQuiebre = produccionMes > 0 ? Math.round((quebradosMes/produccionMes)*1000)/10 : 0;

  return {
    produccionHoy: produccionHoy,
    produccionMes: produccionMes,
    stockActual: stockActual,
    gastosMes: gastosMes,
    gastosPorCategoria: gastosPorCategoria,
    ventasMes: ventasMes,
    variacionVentas: variacionVentas,
    costoPorHuevo: costoPorHuevo,
    margenMes: margenMes,
    pctQuiebre: pctQuiebre,
    fechaCalculo: new Date().toISOString()
  };
}

/* ════════ FUNCIÓN DE PRUEBA (ejecutar manualmente para verificar) ════════ */
function probarConexion(){
  Logger.log("Hojas encontradas:");
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  libro.getSheets().forEach(function(h){ Logger.log("- " + h.getName()); });
  Logger.log("Resumen:");
  Logger.log(JSON.stringify(calcularResumen(), null, 2));
}
