# 📝 Módulo de Tareas (Tasks)

**¿Para qué sirve esta carpeta?**
Aquí va TODO el código relacionado con la gestión de tareas individuales (crear, editar, mover, borrar y asignar tareas).

**¿Qué archivos debes poner aquí?**

- `components/`: Tarjetas de la tarea, botones para marcar como completada, o el tablero Kanban.
- `hooks/`: Funciones para guardar o editar tareas en la base de datos.
- `types/`: Definiciones de una Tarea (título, estado, responsable, etc.).

**🛑 Regla de Oro:**
Si necesitas mostrar un gráfico general de cuántas tareas están completadas, haz el componente en la carpeta `analytics` e importa la información de aquí.
