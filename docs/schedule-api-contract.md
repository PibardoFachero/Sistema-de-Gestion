# Documentación y Ejemplos de Payloads: Cronogramas y Disponibilidad con Gemini AI

Este documento detalla los endpoints, la arquitectura y los contratos de entrada/salida implementados para la generación y gestión automática de cronogramas.

---

## 1. Endpoint: Generación de Cronograma de Proyecto

- **Método y Ruta**: `POST /api/projects/:id/generate-schedule`
- **Autenticación**: Sesión de Supabase requerida (Cookie auth o Bearer token).

### Payload de Entrada (Request Body)

```json
{
  "nombre_proyecto": "Sistema de Gestión con IA",
  "objetivo_final": "Construir una plataforma universitaria de productividad con cronogramas inteligentes y chat con IA.",
  "fecha_limite": "2026-10-30",
  "importancia": "prioritario",
  "nivel_conocimiento": "intermedio",
  "tiempo_diario_disponible": "45 minutos",
  "archivos_adjuntos": [
    {
      "nombre": "horario_universidad.png",
      "tipo": "image/png",
      "contenidoBase64": "iVBORw0KGgoAAAANSUhEUgAA..."
    },
    {
      "nombre": "temario_proyecto.txt",
      "tipo": "text/plain",
      "textoExtraido": "Módulo 1: Setup y Arquitectura. Módulo 2: Modelado DB Postgres. Módulo 3: Integración Gemini AI."
    }
  ],
  "enlaces": ["https://github.com/ingsamuell/Sistema-de-Gestion"]
}
```

### Payload de Salida (Respuesta Exitosa `200 OK`)

```json
{
  "success": true,
  "data": {
    "cronogramaId": "a81dfcb9-317a-4c28-9844-325ea031e5f1",
    "version": 1,
    "cronograma": {
      "resumen": "Plan de trabajo enfocado en 3 hitos principales a lo largo de 4 semanas, con bloques diarios de 45 minutos en días laborales.",
      "hitos": [
        {
          "titulo": "Hito 1: Esquema de base de datos y migraciones",
          "fecha": "2026-10-05"
        },
        {
          "titulo": "Hito 2: Endpoints de generación con Gemini AI",
          "fecha": "2026-10-18"
        },
        {
          "titulo": "Hito 3: Validación completa y entrega del sistema",
          "fecha": "2026-10-30"
        }
      ],
      "bloques": [
        {
          "fecha": "2026-09-22",
          "hora_inicio": "18:00",
          "hora_fin": "18:45",
          "tarea": "Configuración de entorno y librerías",
          "descripcion": "Instalación del SDK @google/genai y configuración de variables de entorno",
          "proyecto_id": "a81dfcb9-317a-4c28-9844-325ea031e5f1"
        },
        {
          "fecha": "2026-09-23",
          "hora_inicio": "18:00",
          "hora_fin": "18:45",
          "tarea": "Diseño de tablas en Supabase",
          "descripcion": "Creación y prueba de tablas cronogramas y eventos_calendario",
          "proyecto_id": "a81dfcb9-317a-4c28-9844-325ea031e5f1"
        }
      ]
    }
  }
}
```

---

## 2. Endpoint: Actualización de Disponibilidad y Detección de Conflictos

- **Método y Ruta**: `PATCH /api/users/:id/availability`
- **Autenticación**: Solo el usuario autenticado puede modificar su propia disponibilidad (`user.id === :id`).

### Payload de Entrada (Request Body)

```json
{
  "proyecto_id": "a81dfcb9-317a-4c28-9844-325ea031e5f1",
  "fecha_limite_proyecto": "2026-11-05",
  "forzar_regeneracion": false,
  "cambios": [
    {
      "dia_semana": 2,
      "hora_inicio": "18:00",
      "hora_fin": "20:00",
      "tipo": "ocupado",
      "origen": "manual",
      "accion": "agregar"
    },
    {
      "fecha_especifica": "2026-09-24",
      "hora_inicio": "15:00",
      "hora_fin": "19:00",
      "tipo": "trabajo",
      "origen": "manual",
      "accion": "agregar"
    }
  ]
}
```

### Payload de Salida (Respuesta Exitosa `200 OK`)

```json
{
  "success": true,
  "data": {
    "cambiosAplicados": 2,
    "tieneConflictos": true,
    "conflictos": [
      {
        "bloqueCronograma": {
          "fecha": "2026-09-23",
          "hora_inicio": "18:00",
          "hora_fin": "18:45",
          "tarea": "Diseño de tablas en Supabase",
          "descripcion": "Creación y prueba de tablas cronogramas y eventos_calendario",
          "proyecto_id": "a81dfcb9-317a-4c28-9844-325ea031e5f1"
        },
        "bloqueOcupado": {
          "dia_semana": 2,
          "hora_inicio": "18:00",
          "hora_fin": "20:00",
          "tipo": "ocupado"
        },
        "motivo": "Solapamiento con bloque ocupado (ocupado) de 18:00 a 20:00"
      }
    ],
    "cronogramaRegenerado": true,
    "throttleBloqueado": false,
    "cronograma": {
      "id": "b92eec12-4521-4f19-b681-791db024f2a2",
      "version": 2,
      "datos": {
        "resumen": "Cronograma reajustado respetando el nuevo bloqueo de los martes de 18:00 a 20:00 y extendiendo la fecha límite al 2026-11-05.",
        "hitos": [
          {
            "titulo": "Hito 1: Esquema de base de datos y migraciones",
            "fecha": "2026-10-08"
          }
        ],
        "bloques": [
          {
            "fecha": "2026-09-25",
            "hora_inicio": "18:00",
            "hora_fin": "18:45",
            "tarea": "Diseño de tablas en Supabase (reprogramada)",
            "descripcion": "Creación y prueba de tablas cronogramas y eventos_calendario",
            "proyecto_id": "a81dfcb9-317a-4c28-9844-325ea031e5f1"
          }
        ]
      }
    }
  }
}
```
