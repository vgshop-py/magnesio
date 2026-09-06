/* ============================================================
   CONFIGURACIÓN DE LA LANDING
   ------------------------------------------------------------
   Acá van los NÚMEROS y los DATOS. Los textos están en
   contenido.js. Entre estos dos archivos se cambia todo:
   no hace falta abrir el HTML (salvo las 8 líneas del <head>).
   ============================================================ */

const PRODUCT_CONFIG = {

  /* ---------- IDENTIDAD DEL PRODUCTO ---------- */
  name: "Magnesium Complex 8 en 1 - 60 cápsulas",   // se guarda en cada pedido
  shortName: "Magnesium Complex",     // nombre corto para los mensajes
  sku: "MAG-COMPLEX-8X1",
  brand: "Toplux Nutrition",
  category: "Suplementos alimentarios",
  currency: "PYG",

  // Cómo se llama UNA unidad de tu producto: "unidad", "frasco",
  // "par", "kit", "botella"… Se usa en "Gs. 120.000 por frasco".
  unitWord: "frasco",

  // Descripción de UNA unidad. Aparece en el resumen del checkout:
  // "2 × 60 cápsulas de 500 mg · Gs. 105.000 c/u"
  // Poné "" (vacío) si no aplica.
  unitDescription: "frasco original sellado · 60 cápsulas",

  /* ---------- ⚠️ IDENTIFICADOR ÚNICO ---------- */
  // Distingue esta landing de todas las demás en el panel.
  // Formato: landing_nombre_del_producto (sin espacios ni tildes).
  // NUNCA repitas el de otra landing.
  origin: "landing_magnesium_complex",

  // Dirección pública final. También hay que ponerla en el <head>
  // del index.html (Facebook y WhatsApp la leen desde ahí).
  siteUrl: "https://vgshop-py.github.io/magnesio/",

  /* ---------- CONTACTO ---------- */
  whatsapp: "595972738779",   // con código de país, sin + ni espacios

  /* ---------- ANALÍTICA (compartida de VG Shop) ---------- */
  metaPixelId: "2412226475899711",
  ga4Id: "G-8WM6CYEB73",
  gtmId: "GTM-MWP3LRKX",
  loadGa4Directly: true,

  /* ---------- BACKEND (compartido, NO tocar) ---------- */
  supabaseUrl: "https://roruinqorwgolcrhhmpm.supabase.co",
  supabaseAnonKey: "sb_publishable_aRPb1yNunMEheat00BxwtQ_Uft732KJ",
  supabaseTable: "pedidos_web",
  useEdgeFunction: false,
  edgeFunctionUrl: "",

  /* ---------- ENVÍO ---------- */
  // true  = el cliente no paga envío (se muestra GRATIS)
  // false = se cobra la tarifa de SHIPPING_RATES según la ciudad
  freeShipping: true,

  /* ---------- DATOS DE COBRO ---------- */
  // Solo se muestran en pedidos por transportadora (pago anticipado).
  paymentInfo: {
    bank: "Banco Familiar",
    holder: "Victor Daniel Garcia Duarte",
    aliasLabel: "Alias / N° de cédula",
    alias: "5978515",
  },

  /* ---------- COLORES DE LA MARCA ---------- */
  // Cambiá estos 4 valores y toda la landing cambia de color.
  // Ejemplos: naranja "#E8451F" · azul "#1F63E8" · verde "#12915A"
  //           violeta "#7B2FF7" · rojo "#D62828" · celeste "#00A3E0"
  theme: {
    "moro": "#0FA8B5",        // turquesa mineral
    "moro-dark": "#073B66",   // azul profundo
    "moro-soft": "#51D5D0",   // aqua luminoso
    "bg-warm": "#EAF9F8",     // fondo mineral claro
  },
};

/* ------------------------------------------------------------
   COMBOS
   Podés dejar 1, 2 o 3. El marcado como `featured: true`
   aparece seleccionado cuando alguien entra a la página.
   Opcional: agregá  imagen: "img/galeria-2-640.webp"  para
   fijar qué foto muestra cada combo.
   ------------------------------------------------------------ */
const COMBOS = [
  { id: "combo-1", qty: 1, label: "1 frasco",  sublabel: "Para empezar",         price: 169000, badge: "",              featured: false, imagen: "img/hero-real-1-640.webp" },
  { id: "combo-2", qty: 2, label: "2 frascos", sublabel: "Ahorrás Gs. 49.000", price: 289000, badge: "MÁS ELEGIDO",   featured: true,  imagen: "img/hero-real-1-640.webp" },
  { id: "combo-3", qty: 3, label: "3 frascos", sublabel: "Ahorrás Gs. 108.000", price: 399000, badge: "MÁXIMO AHORRO", featured: false, imagen: "img/hero-real-1-640.webp" },
];

/* ------------------------------------------------------------
   TARIFAS Y COBERTURA DE ENVÍO
   zone: "metro"    → delivery propio (Asunción y Central)
         "interior" → cobertura fuera del área metropolitana
   prepay: false    → pedido normal, delivery y pago al recibir
   prepay: true     → transportadora + pago anticipado
   Cualquier ciudad que NO figure acá va por transportadora
   (TSI o Multienvíos) con pago anticipado obligatorio.
   ------------------------------------------------------------ */
const SHIPPING_RATES = [
  { city: "Asunción",              department: "Asunción",     cost: 20000, zone: "metro",    prepay: false },
  { city: "Capiatá",               department: "Central",      cost: 35000, zone: "metro",    prepay: false },
  { city: "Fernando de la Mora",   department: "Central",      cost: 20000, zone: "metro",    prepay: false },
  { city: "Lambaré",               department: "Central",      cost: 20000, zone: "metro",    prepay: false },
  { city: "Limpio",                department: "Central",      cost: 35000, zone: "metro",    prepay: false },
  { city: "Luque",                 department: "Central",      cost: 30000, zone: "metro",    prepay: false },
  { city: "Mariano Roque Alonso",  department: "Central",      cost: 30000, zone: "metro",    prepay: false },
  { city: "Ñemby",                 department: "Central",      cost: 35000, zone: "metro",    prepay: false },
  { city: "San Lorenzo",           department: "Central",      cost: 25000, zone: "metro",    prepay: false },
  { city: "Villa Elisa",           department: "Central",      cost: 25000, zone: "metro",    prepay: false },
  { city: "Ypané",                 department: "Central",      cost: 40000, zone: "metro",    prepay: false },
  { city: "Ciudad del Este",       department: "Alto Paraná",  cost: 25000, zone: "interior", prepay: false },
  { city: "Hernandarias",          department: "Alto Paraná",  cost: 30000, zone: "interior", prepay: false },
  { city: "Minga Guazú",           department: "Alto Paraná",  cost: 35000, zone: "interior", prepay: false },
  { city: "Presidente Franco",     department: "Alto Paraná",  cost: 30000, zone: "interior", prepay: false },
  { city: "Carapeguá",             department: "Paraguarí",    cost: 30000, zone: "interior", prepay: true  },
  { city: "Concepción",            department: "Concepción",   cost: 40000, zone: "interior", prepay: true  },
  { city: "Encarnación",           department: "Itapúa",       cost: 40000, zone: "interior", prepay: true  },
  { city: "Pilar",                 department: "Ñeembucú",     cost: 45000, zone: "interior", prepay: true  },
];

const CARRIERS = [
  { id: "TSI", name: "TSI", note: "Retiro en agencia o entrega según cobertura" },
  { id: "Multienvíos", name: "Multienvíos", note: "Cobertura nacional, retiro en sucursal" },
];

/* ------------------------------------------------------------
   ZONAS DE ENTREGA DETECTADAS POR DIRECCIÓN / GPS
   `polygon` queda preparado para agregar límites Leaflet más adelante.
   ------------------------------------------------------------ */
const DELIVERY_ZONES = {
  ASUNCION_CENTRAL: {
    cities: [
      "Asunción", "Areguá", "Capiatá", "Fernando de la Mora", "Guarambaré",
      "Itá", "Itauguá", "J. Augusto Saldívar", "Lambaré", "Limpio", "Luque",
      "Mariano Roque Alonso", "Nueva Italia", "Ñemby", "San Antonio",
      "San Lorenzo", "Villa Elisa", "Villeta", "Ypacaraí", "Ypané",
    ],
    departments: ["Asunción", "Central"],
    tipoEntrega: "DELIVERY",
    formaPago: "CONTRA_ENTREGA",
    polygon: null,
  },
  INTERIOR: {
    tipoEntrega: "TRANSPORTADORA",
    formaPago: "PAGO_PREVIO",
    polygon: null,
  },
  SIN_DETERMINAR: {
    tipoEntrega: "SIN_DETERMINAR",
    formaPago: "A_CONFIRMAR",
    polygon: null,
  },
};

/* ------------------------------------------------------------
   DEPARTAMENTOS Y CIUDADES (no hace falta tocar)
   ------------------------------------------------------------ */
const CITIES_BY_DEPARTMENT = {
  "Asunción": ["Asunción"],
  "Central": [
    "Areguá", "Capiatá", "Fernando de la Mora", "Guarambaré", "Itá", "Itauguá",
    "J. Augusto Saldívar", "Lambaré", "Limpio", "Luque", "Mariano Roque Alonso",
    "Nueva Italia", "Ñemby", "San Antonio", "San Lorenzo", "Villa Elisa",
    "Villeta", "Ypacaraí", "Ypané",
  ],
  "Alto Paraná": [
    "Ciudad del Este", "Hernandarias", "Minga Guazú", "Presidente Franco",
    "Santa Rita", "Juan León Mallorquín",
  ],
  "Alto Paraguay": ["Fuerte Olimpo", "Puerto Casado"],
  "Amambay": ["Pedro Juan Caballero", "Capitán Bado", "Bella Vista Norte"],
  "Boquerón": ["Filadelfia", "Loma Plata", "Mariscal Estigarribia"],
  "Caaguazú": ["Coronel Oviedo", "Caaguazú", "Doctor Juan Eulogio Estigarribia", "Repatriación"],
  "Caazapá": ["Caazapá", "San Juan Nepomuceno", "Yuty"],
  "Canindeyú": ["Salto del Guairá", "Curuguaty", "Katueté"],
  "Concepción": ["Concepción", "Horqueta", "Yby Yaú", "Loreto"],
  "Cordillera": ["Caacupé", "San Bernardino", "Tobatí", "Eusebio Ayala", "Piribebuy", "Atyrá"],
  "Guairá": ["Villarrica", "Independencia", "Coronel Martínez"],
  "Itapúa": ["Encarnación", "Cambyretá", "Hohenau", "Obligado", "Bella Vista Sur", "Coronel Bogado"],
  "Misiones": ["San Juan Bautista", "San Ignacio", "Ayolas", "Santa Rosa"],
  "Ñeembucú": ["Pilar", "Alberdi", "Cerrito"],
  "Paraguarí": ["Paraguarí", "Carapeguá", "Yaguarón", "Ybycuí", "Quiindy", "Pirayú"],
  "Presidente Hayes": ["Villa Hayes", "Benjamín Aceval", "Nanawa"],
  "San Pedro": ["San Estanislao", "Santa Rosa del Aguaray", "San Pedro del Ycuamandiyú", "Chore"],
};

const DEPARTMENTS = Object.keys(CITIES_BY_DEPARTMENT);

/* ------------------------------------------------------------
   IMÁGENES
   Los nombres ya están fijados: si corrés `npm run imagenes`
   se generan solos con estos nombres desde img-originales/.
   Solo cambiá los textos alternativos (alt) y las leyendas
   (caption / cap), que son los que lee Google.
   ------------------------------------------------------------ */
/* El carrusel quedó en dos fotos a propósito: la pieza principal, que resume
   toda la oferta, y la foto limpia del frasco. Las dos que estaban antes
   (hero-2 y hero-3) mostraban exactamente las mismas imágenes que las piezas 2
   y 3 del bloque de venta, así que quien bajaba veía el contenido repetido.
   Los archivos siguen en img/ y sus entradas quedaron comentadas abajo.

   ⚠️ hero-principal.webp lo genera `npm run hero`, NO `npm run imagenes`. */
const HERO_SLIDES = [
  {
    src: "img/hero-principal.webp", srcSmall: "img/hero-principal-640.webp", w: 1024, h: 1536,
    alt: "Complejo de Magnesio 8 en 1 de Toplux Nutrición: óxido, glicinato, taurato, carbonato, aspartato y orotato, frasco de 60 cápsulas por Gs. 169.000",
    caption: "8 formas de magnesio en una cápsula vegetal",
  },
  {
    src: "img/hero-real-1.webp", srcSmall: "img/hero-real-1-640.webp", w: 720, h: 1280,
    alt: "Primer plano del frasco real sellado de Magnesium Complex de Toplux Nutrition",
    caption: "Frasco real · Vista frontal",
  },
  {
    src: "img/hero-real-2.webp", srcSmall: "img/hero-real-2-640.webp", w: 720, h: 1280,
    alt: "Frasco real de Magnesium Complex sostenido en la mano, con su etiqueta frontal visible",
    caption: "El producto que recibís",
  },
  {
    src: "img/hero-real-3.webp", srcSmall: "img/hero-real-3-640.webp", w: 720, h: 1280,
    alt: "Vista lateral del frasco real sellado de Magnesium Complex",
    caption: "Envase original sellado",
  },
  {
    src: "img/hero-real-4.webp", srcSmall: "img/hero-real-4-640.webp", w: 720, h: 1280,
    alt: "Parte posterior del frasco real de Magnesium Complex con la tabla de suplemento visible",
    caption: "Etiqueta y composición del envase",
  },
];

/* La galería quedó vacía a propósito: repetía lo que ya muestran el bloque de
   venta y la sección explicativa. Con la lista vacía, la sección entera
   desaparece sola de la página. Para traerla de vuelta, descomentá las fotos.
   Ninguna imagen fue borrada del disco. */
const GALLERY = [
  // { src: "img/galeria-1.webp", srcSmall: "img/galeria-1-640.webp", w: 639, h: 634, alt: "Información complementaria de Magnesium Complex: fuentes de magnesio y otros ingredientes declarados", cap: "Composición declarada en la etiqueta" },
  // { src: "img/galeria-4.webp", srcSmall: "img/galeria-4-640.webp", w: 800, h: 800, alt: "Frasco de Magnesium Complex 8 en 1 de Toplux Nutrition con 60 cápsulas", cap: "El frasco que recibís" },

  /* --- Retirada el 2026-08-03: img/galeria-3.webp (06-guia-completa) ---
     Es una tira de 2048×10240 con seis paneles. Se sacó porque contradice
     la propia página en cuatro puntos:
       · precios viejos: 180.000 / 324.000 / 459.000 (los reales son
         169.000 / 289.000 / 399.000, ver COMBOS arriba)
       · "más de 100.000 personas satisfechas" y "más de 10.000 clientes",
         sin respaldo
       · cuatro testimonios inventados que prometen efectos sobre el sueño,
         justo lo que el FAQ de la página desmiente
       · varios frascos siguen mostrando 90 cápsulas
     El archivo NO se borró: sigue en img-originales/ y en img/.
     Para reemplazarla, ver PROMPTS-IMAGENES.md.
  { src: "img/galeria-3.webp", srcSmall: "img/galeria-3-640.webp", w: 1024, h: 5120, alt: "Guía visual completa de Magnesium Complex", cap: "Conocé el producto y sus indicaciones" },
  --- */
];

/* ------------------------------------------------------------
   BLOQUE DE VENTA VISUAL
   Piezas verticales que se muestran una debajo de otra, a lo
   ancho de la pantalla, después de los combos. Es el formato
   que usan las landings que venden por imagen: todo el mensaje
   vive dentro de la pieza y el texto de la página no compite.

   Para agregar una pieza:
     1. Guardala en  img-venta-originales/  numerada (4-envio.png)
     2. Corré  npm run venta
     3. Agregá su entrada acá abajo

   Campos:
     src / srcSmall  archivos generados por `npm run venta`
     w / h           medidas reales (evitan que la página salte al cargar)
     alt             descripción para Google y lectores de pantalla
     checkout        true = tocar la imagen abre el checkout
   ------------------------------------------------------------ */
const SALES_STACK = [
  {
    // Apertura: frena el scroll de quien llega desde el anuncio.
    src: "img/venta-1.webp", srcSmall: "img/venta-1-640.webp", w: 1024, h: 1280,
    alt: "No todos los magnesios son iguales: Magnesium Complex combina óxido, glicinato, taurato, carbonato, aspartato y orotato en una cápsula vegetal",
    checkout: true,
  },
  {
    src: "img/venta-2.webp", srcSmall: "img/venta-2-640.webp", w: 1024, h: 1024,
    alt: "Áreas de apoyo del complejo de magnesio según la información del fabricante",
    checkout: true,
  },
  {
    src: "img/venta-3.webp", srcSmall: "img/venta-3-640.webp", w: 1024, h: 1024,
    alt: "Cómo tomar Magnesium Complex: una cápsula al día con agua y preferentemente con una comida",
    checkout: true,
  },
  {
    // Respaldo de procedencia: refuerza la confianza antes del cierre de venta.
    src: "img/confianza.webp", srcSmall: "img/confianza-640.webp", w: 1024, h: 1536,
    alt: "Magnesium Complex elaborado en Paraguay por un laboratorio especializado, envasado y sellado bajo procesos de control de calidad",
    checkout: true,
  },
  {
    // Cierre: última pieza del bloque, para quien bajó todo y no compró.
    // ⚠️ Lleva el precio adentro. Si cambiás COMBOS, regenerá esta imagen.
    src: "img/venta-6.webp", srcSmall: "img/venta-6-640.webp", w: 1024, h: 1536,
    alt: "Llevá tu Magnesium Complex por Gs. 169.000, frasco de 60 cápsulas con envío gratis y pago al recibir",
    checkout: true,
  },
];

window.PRODUCT_CONFIG = PRODUCT_CONFIG;
window.COMBOS = COMBOS;
window.SHIPPING_RATES = SHIPPING_RATES;
window.CARRIERS = CARRIERS;
window.DELIVERY_ZONES = DELIVERY_ZONES;
window.CITIES_BY_DEPARTMENT = CITIES_BY_DEPARTMENT;
window.DEPARTMENTS = DEPARTMENTS;
window.HERO_SLIDES = HERO_SLIDES;
window.GALLERY = GALLERY;
window.SALES_STACK = SALES_STACK;
