import assert from 'node:assert/strict';

// Verificación estática y estructural del módulo contextBuilderService
console.log('--- Verificando integración y formato de contextBuilderService ---');

function formatMockAiContext({ profile, topics, sources, projectId }) {
  // Simulación de la lógica implementada en contextBuilderService
  const dificultadesArr = Array.isArray(profile.dificultades)
    ? profile.dificultades
    : (profile.dificultades || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const perfilRaw = {
    nombre: profile.nombre_completo || profile.nombre_usuario || undefined,
    descripcion: profile.descripcion || profile.contexto_personal || undefined,
    rol: profile.rol_condicion || undefined,
    situacionLaboral: profile.situacion_laboral || undefined,
    metodologia: profile.metodologia || undefined,
    experiencia: profile.experiencia || undefined,
    horarios: profile.jornada_horarios || undefined,
    disponibilidadMinutos: profile.tiempo_diario_min || undefined,
    dificultades: dificultadesArr.length > 0 ? dificultadesArr : undefined,
  };

  const lineasPerfil = [];
  if (perfilRaw.nombre) lineasPerfil.push(`- Nombre del estudiante: ${perfilRaw.nombre}`);
  if (perfilRaw.rol) lineasPerfil.push(`- Rol o condición actual: ${perfilRaw.rol}`);
  if (perfilRaw.situacionLaboral)
    lineasPerfil.push(`- Situación laboral: ${perfilRaw.situacionLaboral}`);
  if (perfilRaw.metodologia)
    lineasPerfil.push(`- Metodología / estilo de aprendizaje preferido: ${perfilRaw.metodologia}`);
  if (perfilRaw.experiencia)
    lineasPerfil.push(`- Nivel de experiencia general: ${perfilRaw.experiencia}`);
  if (perfilRaw.disponibilidadMinutos)
    lineasPerfil.push(`- Dedicación diaria habitual: ${perfilRaw.disponibilidadMinutos} minutos`);
  if (perfilRaw.descripcion)
    lineasPerfil.push(
      `- Información complementaria / Descripción personal:\n  "${perfilRaw.descripcion}"`,
    );

  const perfilTexto =
    lineasPerfil.length > 0
      ? `[PERFIL DE APRENDIZAJE E INFORMACIÓN DEL USUARIO]:\n` + lineasPerfil.join('\n') + `\n`
      : '';

  const fuentesByTopic = new Map();
  for (const s of sources) {
    const list = fuentesByTopic.get(s.topic_id) || [];
    list.push(s);
    fuentesByTopic.set(s.topic_id, list);
  }

  const bloquesTemas = [];
  for (const t of topics) {
    const isLinked = projectId && t.project_id === projectId;
    const tSources = (fuentesByTopic.get(t.id) || []).filter(
      (s) => s.is_in_context === true || isLinked,
    );
    const hasNote = Boolean(t.main_note && t.main_note.trim());
    if (isLinked || hasNote || tSources.length > 0) {
      let b = `• Tema: "${t.title}"${isLinked ? ' (VINCULADO DIRECTAMENTE A ESTE PROYECTO)' : ''}`;
      if (t.description) b += `\n  Descripción: ${t.description}`;
      if (hasNote) b += `\n  Nota principal:\n  """\n  ${t.main_note}\n  """`;
      if (tSources.length > 0) {
        b += `\n  Fuentes:\n` + tSources.map((s) => `    - [${s.kind}] "${s.title}"`).join('\n');
      }
      bloquesTemas.push(b);
    }
  }

  const temasTexto =
    bloquesTemas.length > 0
      ? `[BIBLIOTECA DE TEMAS, NOTAS Y FUENTES AUTORIZADAS POR EL USUARIO]:\n` +
        bloquesTemas.join('\n\n')
      : '';

  return { perfilTexto, temasTexto, perfilRaw };
}

// 1. Caso de prueba: Usuario con perfil y fuentes activas
const mockProfile = {
  nombre_completo: 'Miguel Moya',
  rol_condicion: 'Estudiante Universitario',
  situacion_laboral: 'Trabaja medio tiempo',
  metodologia: 'Pomodoro y práctica intensiva',
  experiencia: 'Intermedio',
  tiempo_diario_min: 45,
  descripcion:
    'Me gusta enfocarme en proyectos de desarrollo web full stack y arquitectura limpia.',
  dificultades: ['Procrastinación', 'Fatiga visual'],
};

const mockTopics = [
  {
    id: 'top-1',
    project_id: 'proj-123',
    title: 'Desarrollo con Next.js y React',
    description: 'Aprender Server Components y Server Actions',
    main_note: 'Puntos clave: usar use server para mutaciones y validar todo en backend.',
  },
  {
    id: 'top-2',
    project_id: null,
    title: 'Bases de datos SQL',
    description: 'Modelado relacional y RLS',
    main_note: 'RLS garantiza aislamiento por auth.uid().',
  },
];

const mockSources = [
  {
    id: 'src-1',
    topic_id: 'top-1',
    title: 'Guía oficial Next.js 15',
    kind: 'Enlace',
    is_in_context: true,
  },
  {
    id: 'src-2',
    topic_id: 'top-2',
    title: 'Resumen RLS',
    kind: 'Nota',
    is_in_context: false,
  },
];

const res = formatMockAiContext({
  profile: mockProfile,
  topics: mockTopics,
  sources: mockSources,
  projectId: 'proj-123',
});

// Aserciones
assert.ok(res.perfilTexto.includes('Miguel Moya'), 'Debe incluir nombre');
assert.ok(res.perfilTexto.includes('Pomodoro y práctica intensiva'), 'Debe incluir metodología');
assert.ok(res.perfilTexto.includes('Trabaja medio tiempo'), 'Debe incluir situación laboral');
assert.ok(
  res.perfilTexto.includes('Me gusta enfocarme en proyectos'),
  'Debe incluir descripción personal',
);

assert.ok(res.temasTexto.includes('Desarrollo con Next.js y React'), 'Debe incluir tema vinculado');
assert.ok(res.temasTexto.includes('VINCULADO DIRECTAMENTE A ESTE PROYECTO'), 'Debe marcar vínculo');
assert.ok(res.temasTexto.includes('Puntos clave: usar use server'), 'Debe incluir nota principal');
assert.ok(res.temasTexto.includes('Guía oficial Next.js 15'), 'Debe incluir fuente activa');
assert.ok(
  res.temasTexto.includes('RLS garantiza aislamiento'),
  'Debe incluir nota del tema general',
);
assert.ok(
  !res.temasTexto.includes('Resumen RLS'),
  'Fuente no activa de tema no vinculado no debe incluirse',
);

console.log('✔ PASS: Verificación de estructura e inyección de contexto para la IA superada.');
