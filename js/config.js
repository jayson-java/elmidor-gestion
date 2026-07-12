/* ════════════════════════════════════════════════════════
   ELMIDOR GESTIÓN · Configuración
   ────────────────────────────────────────────────────────
   Edita solo este archivo para conectar la app a tu Google Sheet.
   ════════════════════════════════════════════════════════ */

const CFG = {

  /* ── CONEXIÓN A GOOGLE SHEETS ──
     Pega aquí la URL que te entrega Apps Script al implementar
     (ver GUIA-INSTALACION.md paso 5).
     Se ve así: https://script.google.com/macros/s/AKfycb.../exec */
  apiUrl: "",

  /* ── NEGOCIO ── */
  nombreNegocio: "Elmidor",

  /* ── TALLAS DE HUEVO ── */
  tallas: ["XL", "L", "M", "S"],

  /* ── FORMATOS DE VENTA/STOCK (debe calzar con tu catálogo) ── */
  formatos: [
    { id:"caja180",   nombre:"Caja 180 huevos",   unidades:180 },
    { id:"caja120",   nombre:"Caja 120 huevos",   unidades:120 },
    { id:"caja100",   nombre:"Caja 100 huevos",   unidades:100 },
    { id:"bandeja30", nombre:"Bandeja 30 huevos", unidades:30  },
    { id:"est18",     nombre:"Estuche 18 huevos", unidades:18  },
    { id:"est12",     nombre:"Estuche 12 huevos", unidades:12  },
    { id:"est6",      nombre:"Estuche 6 huevos",  unidades:6   }
  ],

  /* ── CATEGORÍAS DE GASTOS ── */
  categoriasGasto: [
    "Alimento / Concentrado",
    "Transporte / Combustible",
    "Mano de obra",
    "Veterinario / Sanidad",
    "Mantenimiento",
    "Servicios (luz, agua)",
    "Embalaje / Insumos",
    "Otros"
  ],

  /* ── MOTIVOS DE MOVIMIENTO DE STOCK ── */
  motivosStock: {
    entrada: ["Producción del día", "Ajuste de inventario", "Devolución"],
    salida:  ["Venta", "Merma / Quiebre", "Autoconsumo", "Ajuste de inventario"]
  },

  /* ── MÉTODOS DE PAGO ── */
  metodosPago: ["Efectivo", "Transferencia", "Flow", "Por cobrar"]
};

/* Formatea precio chileno */
function fmt(n){ return "$" + Math.round(Number(n)||0).toLocaleString("es-CL"); }
function fmtNum(n){ return Math.round(Number(n)||0).toLocaleString("es-CL"); }

/* Fecha de hoy en formato YYYY-MM-DD */
function hoyISO(){
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
