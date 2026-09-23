import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export interface BuildUserAiContextParams {
  userId: string;
  projectId?: string | null;
}

export interface UserAiContext {
  perfilTexto: string;
  temasTexto: string;
  promptContextoCompleto: string;
  perfilRaw: {
    nombre?: string;
    descripcion?: string;
    rol?: string;
    situacionLaboral?: string;
    metodologia?: string;
    experiencia?: string;
    horarios?: string;
    disponibilidadMinutos?: string | number;
    dificultades?: string[];
    areasPrioritarias?: string[];
    ritmo?: string;
  } | null;
  temasRaw: Array<{
    id: string;
    titulo: string;
    descripcion?: string;
    notaPrincipal?: string;
    esTemaDelProyecto: boolean;
    fuentes: Array<{
      id: string;
      titulo: string;
      tipo: string;
      contenido?: string;
      url?: string;
      habilitadaParaIa: boolean;
    }>;
  }>;
  fuentesActivasCount: number;
}

/**
 * Recopila y estructura el contexto pedagógico y personal del usuario:
 * 1. Información del Perfil (descripción, preferencias de aprendizaje, rol, situación laboral, experiencia).
 * 2. Temas de estudio y fuentes activadas para la IA (notas principales y recursos de la biblioteca).
 */
export async function getUserAiContext({
  userId,
  projectId,
}: BuildUserAiContextParams): Promise<UserAiContext> {
  let dbClient;
  try {
    const supabase = await createClient();
    const adminDb = getAdminClient();
    dbClient = adminDb || supabase;
  } catch {
    dbClient = getAdminClient();
  }

  if (!dbClient || !userId) {
    return {
      perfilTexto: '',
      temasTexto: '',
      promptContextoCompleto: '',
      perfilRaw: null,
      temasRaw: [],
      fuentesActivasCount: 0,
    };
  }

  // 1. Obtener perfil de usuario
  let perfilRaw: UserAiContext['perfilRaw'] = null;
  let perfilTexto = '';

  try {
    const { data: profile } = await dbClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      const dificultadesArr: string[] = Array.isArray(profile.dificultades)
        ? profile.dificultades
        : typeof profile.dificultades === 'string' && profile.dificultades.trim()
          ? profile.dificultades
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

      const areasArr: string[] = Array.isArray(profile.area_prioritaria)
        ? profile.area_prioritaria
        : typeof profile.area_prioritaria === 'string' && profile.area_prioritaria.trim()
          ? profile.area_prioritaria
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];

      perfilRaw = {
        nombre: profile.nombre_completo || profile.nombre_usuario || undefined,
        descripcion: profile.descripcion || profile.contexto_personal || undefined,
        rol: profile.rol_condicion || undefined,
        situacionLaboral: profile.situacion_laboral || undefined,
        metodologia: profile.metodologia || undefined,
        experiencia: profile.experiencia || undefined,
        horarios: profile.jornada_horarios || undefined,
        disponibilidadMinutos: profile.tiempo_diario_min || undefined,
        dificultades: dificultadesArr.length > 0 ? dificultadesArr : undefined,
        areasPrioritarias: areasArr.length > 0 ? areasArr : undefined,
        ritmo: profile.ritmo || undefined,
      };

      const lineasPerfil: string[] = [];
      if (perfilRaw.nombre) lineasPerfil.push(`- Nombre del estudiante: ${perfilRaw.nombre}`);
      if (perfilRaw.rol) lineasPerfil.push(`- Rol o condición actual: ${perfilRaw.rol}`);
      if (perfilRaw.situacionLaboral)
        lineasPerfil.push(`- Situación laboral: ${perfilRaw.situacionLaboral}`);
      if (perfilRaw.metodologia)
        lineasPerfil.push(
          `- Metodología / estilo de aprendizaje preferido: ${perfilRaw.metodologia}`,
        );
      if (perfilRaw.experiencia)
        lineasPerfil.push(`- Nivel de experiencia general: ${perfilRaw.experiencia}`);
      if (perfilRaw.disponibilidadMinutos)
        lineasPerfil.push(
          `- Dedicación diaria habitual: ${perfilRaw.disponibilidadMinutos} minutos`,
        );
      if (perfilRaw.horarios)
        lineasPerfil.push(`- Franjas horarias preferidas: ${perfilRaw.horarios}`);
      if (perfilRaw.ritmo) lineasPerfil.push(`- Ritmo de estudio: ${perfilRaw.ritmo}`);
      if (perfilRaw.dificultades && perfilRaw.dificultades.length > 0) {
        lineasPerfil.push(
          `- Retos o dificultades declaradas: ${perfilRaw.dificultades.join(', ')}`,
        );
      }
      if (perfilRaw.areasPrioritarias && perfilRaw.areasPrioritarias.length > 0) {
        lineasPerfil.push(
          `- Áreas prioritarias de interés: ${perfilRaw.areasPrioritarias.join(', ')}`,
        );
      }
      if (perfilRaw.descripcion) {
        lineasPerfil.push(
          `- Información complementaria / Descripción personal:\n  "${perfilRaw.descripcion}"`,
        );
      }

      if (lineasPerfil.length > 0) {
        perfilTexto =
          `[PERFIL DE APRENDIZAJE E INFORMACIÓN DEL USUARIO]:\n` +
          lineasPerfil.join('\n') +
          `\n\nDirectriz pedagógica: Adapta la formulación de tareas, el ritmo, el tono y la estructura para que sean armónicos con su metodología preferida, su disponibilidad real y su nivel de experiencia.\n`;
      }
    }
  } catch (err) {
    console.warn('Error al obtener perfil para contexto de IA:', err);
  }

  // 2. Obtener temas y fuentes
  const temasRaw: UserAiContext['temasRaw'] = [];
  let temasTexto = '';
  let fuentesActivasCount = 0;

  try {
    // Consultar temas del usuario
    const { data: topicsData } = await dbClient
      .from('topics')
      .select('id, title, description, main_note, project_id, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (topicsData && topicsData.length > 0) {
      const topicIds = topicsData.map((t) => t.id);

      // Consultar fuentes de esos temas
      const { data: sourcesData } = await dbClient
        .from('sources')
        .select('id, topic_id, title, kind, content, file_url, is_in_context')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: true });

      interface RawSourceRow {
        id: string;
        topic_id: string;
        title: string;
        kind: string;
        content?: string | null;
        file_url?: string | null;
        is_in_context?: boolean | null;
      }

      const sourcesByTopic = new Map<string, RawSourceRow[]>();
      if (sourcesData) {
        for (const s of sourcesData as unknown as RawSourceRow[]) {
          const list = sourcesByTopic.get(s.topic_id) || [];
          list.push(s);
          sourcesByTopic.set(s.topic_id, list);
        }
      }

      const bloquesTemas: string[] = [];

      for (const t of topicsData) {
        const isLinkedToCurrentProject = Boolean(projectId && t.project_id === projectId);
        const topicSources = sourcesByTopic.get(t.id) || [];

        // Filtrar fuentes que están habilitadas para contexto (is_in_context === true)
        // o si este tema está directamente vinculado al proyecto en cuestión
        const relevantSources = topicSources.filter(
          (s) => s.is_in_context === true || isLinkedToCurrentProject,
        );

        if (relevantSources.some((s) => s.is_in_context)) {
          fuentesActivasCount += relevantSources.filter((s) => s.is_in_context).length;
        }

        const formattedSources = relevantSources.map((s) => ({
          id: s.id,
          titulo: s.title,
          tipo: s.kind,
          contenido: s.content ? s.content.slice(0, 3000) : undefined,
          url: s.file_url || undefined,
          habilitadaParaIa: Boolean(s.is_in_context),
        }));

        temasRaw.push({
          id: t.id,
          titulo: t.title,
          descripcion: t.description || undefined,
          notaPrincipal: t.main_note || undefined,
          esTemaDelProyecto: isLinkedToCurrentProject,
          fuentes: formattedSources,
        });

        // Formatear texto si tiene contenido relevante para la IA
        const tieneNotaPrincipal = Boolean(t.main_note && t.main_note.trim().length > 0);
        const tieneFuentesRelevantes = formattedSources.length > 0;

        // Si es el tema vinculado al proyecto o tiene notas/fuentes activas, se incluye
        if (isLinkedToCurrentProject || tieneNotaPrincipal || tieneFuentesRelevantes) {
          let temaDesc = `• Tema: "${t.title}"${isLinkedToCurrentProject ? ' (VINCULADO DIRECTAMENTE A ESTE PROYECTO)' : ''}`;
          if (t.description) {
            temaDesc += `\n  Descripción del tema: ${t.description}`;
          }
          if (tieneNotaPrincipal) {
            const notaCorta = (t.main_note || '').slice(0, 2500);
            temaDesc += `\n  Nota principal / Cuaderno de apuntes:\n  """\n  ${notaCorta}\n  """`;
          }
          if (tieneFuentesRelevantes) {
            const fuentesDesc = formattedSources
              .map((s) => {
                let fStr = `    - [${s.tipo}] "${s.titulo}"`;
                if (s.contenido) {
                  fStr += `: ${s.contenido.slice(0, 1000)}`;
                }
                if (s.url) {
                  fStr += ` (Enlace: ${s.url})`;
                }
                return fStr;
              })
              .join('\n');
            temaDesc += `\n  Fuentes y material de estudio habilitados:\n${fuentesDesc}`;
          }
          bloquesTemas.push(temaDesc);
        }
      }

      if (bloquesTemas.length > 0) {
        temasTexto =
          `[BIBLIOTECA DE TEMAS, NOTAS Y FUENTES AUTORIZADAS POR EL USUARIO]:\n` +
          `El usuario ha recopilado el siguiente material en su biblioteca de Temas. Utiliza estos conceptos, apuntes y recursos como base sustancial para orientar las tareas o responder sus consultas:\n\n` +
          bloquesTemas.join('\n\n') +
          `\n\n`;
      }
    }
  } catch (err) {
    console.warn('Error al obtener temas y fuentes para contexto de IA:', err);
  }

  const promptContextoCompleto = [perfilTexto, temasTexto].filter(Boolean).join('\n');

  return {
    perfilTexto,
    temasTexto,
    promptContextoCompleto,
    perfilRaw,
    temasRaw,
    fuentesActivasCount,
  };
}
