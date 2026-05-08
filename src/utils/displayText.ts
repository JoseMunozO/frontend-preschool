const backendSeedTranslations: Record<string, string> = {
  'A4 drawing paper': 'Papel de dibujo A4',
  Archived: 'Archivado',
  'Arts and crafts': 'Arte y manualidades',
  'Building blocks': 'Bloques de construccion',
  book: 'Libro',
  box: 'Caja',
  bucket: 'Cubeta',
  'Daily drawing and painting': 'Dibujo y pintura diaria',
  'Demo Group': 'Grupo Demo',
  'Demo Teacher': 'Docente Demo',
  'Field trip': 'Excursion',
  'First aid bandages': 'Vendas de primeros auxilios',
  'Forest Room': 'Aula Bosque',
  'Glue sticks': 'Barras de pegamento',
  'Health and safety': 'Salud y seguridad',
  Library: 'Biblioteca',
  'Learning toys': 'Juguetes educativos',
  'May meal plan': 'Comedor de mayo',
  'May tuition': 'Cuota de mayo',
  'Meal plan': 'Comedor',
  'Monthly fee': 'Cuota mensual',
  'Morning circle': 'Asamblea matutina',
  'Museum field trip': 'Excursion al museo',
  'Nap mats': 'Colchonetas para siesta',
  'Old sensory bins': 'Cajas sensoriales archivadas',
  'Outdoor chalk': 'Tiza para exterior',
  'Outdoor play': 'Juego exterior',
  pack: 'Paquete',
  'Picture books': 'Libros ilustrados',
  'Pre-K literacy': 'Lectoescritura preescolar',
  'Rainbow Room': 'Aula Arcoiris',
  'Rest time': 'Hora de descanso',
  'Sara Assistant': 'Sara Asistente',
  set: 'Set',
  'Sunflower Room': 'Aula Girasol',
  'Tablet protectors': 'Protectores de tablet',
  Technology: 'Tecnologia',
  'Toddler morning circle': 'Asamblea matutina infantil',
  unit: 'Unidad',
  'Washable paint set': 'Set de pintura lavable',
}

export function translateBackendSeed(value?: string | null) {
  if (!value) {
    return value
  }

  return backendSeedTranslations[value.trim()] ?? value
}
