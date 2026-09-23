import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';

interface AnalyticsReportPayload {
  metricTitle?: string;
  metricKey?: string;
  summary?: {
    activeProjects?: number;
    plannedMinutes?: number;
    completedTasks?: number;
    totalTasks?: number;
    highPriorityProjects?: number;
    upcomingDeadlines?: number;
  };
  seriesData?: unknown[];
}

/**
 * Genera un análisis analítico local como fallback resiliente en caso de
 * que no haya conexión a servicios externos o fallen las APIs.
 */
function generateFallbackAnalysis(payload: AnalyticsReportPayload): string {
  const title = payload.metricTitle || 'Métrica General';
  const summary = payload.summary || {};
  const activeProjects = summary.activeProjects ?? 0;
  const totalTasks = summary.totalTasks ?? 0;
  const completedTasks = summary.completedTasks ?? 0;
  const plannedMinutes = summary.plannedMinutes ?? 0;
  const highPriority = summary.highPriorityProjects ?? 0;
  const upcomingDeadlines = summary.upcomingDeadlines ?? 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const plannedHours = (plannedMinutes / 60).toFixed(1);

  const p1 = `Diagnóstico de ${title}: Actualmente cuentas con ${activeProjects} proyecto(s) activo(s) en tu espacio de trabajo. Has registrado ${plannedMinutes} minutos (~${plannedHours} horas) de trabajo planificado y has completado ${completedTasks} de ${totalTasks} tareas registradas, lo que representa una tasa de avance global del ${completionRate}%.`;

  let p2 = '';
  if (upcomingDeadlines > 0) {
    p2 = `Alertas y Puntos Clave: Tienes ${upcomingDeadlines} entrega(s) próxima(s) o con fecha límite en los siguientes días, y ${highPriority} proyecto(s) catalogado(s) de alta prioridad. Es prioritario evitar la dispersión de esfuerzos y verificar que las tareas más próximas cuenten con tiempo asignado antes de iniciar nuevos compromisos.`;
  } else if (completionRate < 40 && totalTasks > 0) {
    p2 = `Alertas y Puntos Clave: El ritmo de avance se sitúa por debajo del 40%, lo cual es habitual en etapas de investigación o diseño. Identifica si existen tareas con dependencias bloqueadas o si la estimación inicial requiere dividirse en pasos más pequeños.`;
  } else {
    p2 = `Alertas y Puntos Clave: La distribución actual muestra un ritmo estable de ejecución. No se detectan cuellos de botella críticos inmediatos, lo que te ofrece un entorno propicio para profundizar en proyectos clave y afianzar hábitos de estudio sostenible.`;
  }

  const p3 = `Recomendaciones Prácticas:\n1. Aplica sesiones de foco profundo (tipo Pomodoro de 25-45 minutos) para avanzar en los bloques de mayor complejidad.\n2. Prioriza las tareas con impacto directo en entregas antes que las actividades complementarias.\n3. Revisa al final de la jornada las tareas terminadas para recalibrar los minutos estimados de tus próximos días. ¡Sigue avanzando paso a paso con Komorebi!`;

  return `${p1}\n\n${p2}\n\n${p3}`;
}

export async function POST(request: Request) {
  try {
    // 1. Validar autenticación de Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AnalyticsReportPayload;
    const { metricTitle, summary, seriesData } = body;

    // 2. Estrategia 1: Webhook dedicado de n8n (si está configurado)
    const n8nAnalyticsUrl = process.env.N8N_ANALYTICS_WEBHOOK_URL?.trim();
    if (n8nAnalyticsUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const n8nResponse = await fetch(n8nAnalyticsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            metricTitle,
            summary,
            seriesData,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (n8nResponse.ok) {
          const data = await n8nResponse.json().catch(() => null);
          const text = data?.text || data?.[0]?.text || (typeof data === 'string' ? data : null);

          if (text && typeof text === 'string' && text.trim().length > 0) {
            return NextResponse.json({ text: text.trim(), source: 'n8n' });
          }
        } else {
          console.warn(
            `N8N_ANALYTICS_WEBHOOK_URL respondió con status ${n8nResponse.status}. Recurriendo a IA integrada.`,
          );
        }
      } catch (n8nErr) {
        console.warn(
          'Error o timeout al contactar N8N_ANALYTICS_WEBHOOK_URL. Recurriendo a IA integrada:',
          n8nErr instanceof Error ? n8nErr.message : n8nErr,
        );
      }
    }

    // 3. Estrategia 2: Modelo Gemini (@google/genai con gemini-3.6-flash)
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
        const summaryText = summary
          ? `Métricas resumen:
- Proyectos activos: ${summary.activeProjects ?? 0}
- Minutos planificados: ${summary.plannedMinutes ?? 0} min (~${((summary.plannedMinutes ?? 0) / 60).toFixed(1)} h)
- Tareas completadas: ${summary.completedTasks ?? 0} de ${summary.totalTasks ?? 0}
- Proyectos de alta prioridad: ${summary.highPriorityProjects ?? 0}
- Entregas que requieren atención: ${summary.upcomingDeadlines ?? 0}`
          : 'Sin métricas de resumen específicas.';

        const seriesSnippet =
          seriesData && Array.isArray(seriesData) && seriesData.length > 0
            ? `Datos de la serie (${metricTitle || 'Métrica'}): ${JSON.stringify(seriesData.slice(0, 10))}`
            : 'Sin desglose de series.';

        const prompt = `Actúa como Komo, el asistente inteligente de productividad y aprendizaje académico de Komorebi.
Genera un análisis profesional, empático, conciso y motivador para el reporte exportable del estudiante sobre la sección "${metricTitle || 'Analítica Académica'}".

${summaryText}
${seriesSnippet}

INSTRUCCIONES DE FORMATO:
- Genera exactamente 3 párrafos claramente estructurados, separados por un doble salto de línea:
  1. Diagnóstico del Estado Actual: Interpreta con claridad las cifras y el momento académico del usuario.
  2. Puntos Clave y Alertas: Destaca cuellos de botella, riesgos de sobrecarga, tareas pendientes o fechas límite a cuidar.
  3. Recomendaciones Accionables: 2 a 3 consejos prácticos y realistas para optimizar su tiempo hoy y en los próximos días.
- NO uses bloques de código ni markdown complejo. Texto fluido, limpio y directo listo para plasmar en PDF, Excel o imagen.
- Cierra con una breve frase de aliento característica de Komo.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });

        if (response.text && response.text.trim().length > 0) {
          return NextResponse.json({
            text: response.text.trim(),
            source: 'gemini',
          });
        }
      } catch (geminiErr) {
        console.warn(
          'Error al invocar Gemini API. Recurriendo al generador heurístico:',
          geminiErr instanceof Error ? geminiErr.message : geminiErr,
        );
      }
    }

    // 4. Estrategia 3: Fallback heurístico inteligente garantizado
    const fallbackText = generateFallbackAnalysis(body);
    return NextResponse.json({
      text: fallbackText,
      source: 'heuristic_fallback',
    });
  } catch (error) {
    console.error('Error general en /api/ai/analytics-report:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al procesar el reporte analítico.',
      },
      { status: 500 },
    );
  }
}
