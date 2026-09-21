# 📁 Módulo de Proyectos (Projects)

**¿Para qué sirve esta carpeta?**
Aquí gestionamos los "Proyectos" principales. Un proyecto es el contenedor general que agrupa a muchas tareas.

**¿Qué archivos debes poner aquí?**

- `components/`: Tarjetas de proyectos, listas de proyectos, el formulario para crear un proyecto nuevo.
- `hooks/`: Lógica para pedirle los proyectos a Supabase.
- `types/`: Definición de cómo se ve un Proyecto en código (nombre, descripción, fecha de inicio).

**🛑 Regla de Oro:**
Aquí solo manejamos la configuración del proyecto en sí. Las tareas individuales que van _dentro_ del proyecto, deben programarse en la carpeta `tasks`.
