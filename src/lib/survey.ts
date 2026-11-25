// Preguntas de la encuesta de alta. Las respuestas configuran la oficina de cada tienda.
export type Field =
  | { kind: 'text'; name: string; label: string; placeholder?: string }
  | { kind: 'textarea'; name: string; label: string; placeholder?: string }
  | { kind: 'select'; name: string; label: string; options: string[] }
  | { kind: 'multi'; name: string; label: string; options: string[] }
  | { kind: 'single'; name: string; label: string; options: string[] };

export const STEPS: { title: string; fields: Field[] }[] = [
  {
    title: 'Tu tienda',
    fields: [
      { kind: 'text', name: 'nombre', label: 'Nombre de la tienda', placeholder: 'Boutique Carmela' },
      { kind: 'text', name: 'ciudad', label: 'Ciudad', placeholder: 'Valencia' },
      { kind: 'multi', name: 'vende', label: 'Qué vendes', options: ['Mujer', 'Hombre', 'Infantil', 'Bebé', 'Calzado', 'Complementos', 'Segunda mano'] },
      { kind: 'select', name: 'empleados', label: 'Personas en la tienda', options: ['Solo yo', '2 a 3', '4 a 5', 'Más de 5'] },
    ],
  },
  {
    title: 'Dónde vendes hoy',
    fields: [
      { kind: 'multi', name: 'canales', label: 'Canales', options: ['Solo tienda física', 'Shopify', 'WooCommerce', 'Otra web', 'Instagram', 'Facebook', 'Vinted', 'Amazon', 'Wallapop'] },
      { kind: 'select', name: 'prendas', label: 'Prendas nuevas al mes, más o menos', options: ['Menos de 30', '30 a 100', '100 a 300', 'Más de 300'] },
      { kind: 'text', name: 'web', label: 'Dirección de tu web (si tienes)', placeholder: 'tutienda.es' },
    ],
  },
  {
    title: 'Qué te quita más tiempo',
    fields: [
      { kind: 'multi', name: 'dolor', label: 'Marca todo lo que aplique', options: ['Hacer fotos', 'Subir prendas a la web', 'Llevar el stock', 'Redes sociales', 'Publicidad', 'Contestar mensajes', 'Amazon / Vinted'] },
      { kind: 'textarea', name: 'sueno', label: 'Si tuvieras una persona más mañana, ¿qué le pedirías?', placeholder: 'Que suba todo lo nuevo a la web y a Vinted el mismo día' },
    ],
  },
  {
    title: 'Cómo habla tu marca',
    fields: [
      { kind: 'single', name: 'tono', label: 'Tono', options: ['Cercana', 'Elegante', 'Divertida', 'Juvenil', 'Clásica', 'Sostenible'] },
      { kind: 'select', name: 'modelo', label: 'Modelos para las fotos', options: ['Variadas en edad y talla', 'Mujer 25 a 40', 'Mujer 40 a 60', 'Bebés', 'Niños y niñas', 'Sin modelo, solo producto'] },
      { kind: 'text', name: 'evitar', label: 'Palabras que nunca usarías (opcional)', placeholder: 'low cost, chollo' },
    ],
  },
  {
    title: 'Cómo quieres que te avisemos',
    fields: [
      { kind: 'single', name: 'aviso', label: 'Avisos', options: ['WhatsApp', 'Correo', 'Solo en el panel'] },
      { kind: 'text', name: 'whatsapp', label: 'Móvil para WhatsApp (opcional)', placeholder: '+34 600 000 000' },
      { kind: 'select', name: 'autonomia', label: 'Qué puede publicar la oficina sin preguntarte', options: ['Nada, quiero aprobar todo', 'Fichas y fotos, pero precios no', 'Todo menos gastar en publicidad', 'Todo, confío en mi equipo'] },
    ],
  },
];
