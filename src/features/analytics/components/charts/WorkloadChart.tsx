'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatMinutes } from '../../data/calculations';

interface WorkloadChartProps {
  data: Array<{ day: string; label: string; plannedMinutes: number }>;
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  return (
    <div
      className="h-72 w-full pt-4 min-w-[34rem] sm:min-w-0"
      aria-label="Minutos planificados por día"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={{ stroke: 'var(--color-outline-variant)', strokeWidth: 1, opacity: 0.5 }}
            tickLine={false}
            tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 12, fontWeight: 600 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => (value === 0 ? '' : formatMinutes(value))}
            tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-container-high)', opacity: 0.5 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-xl border border-outline-variant/40 bg-surface/95 px-3 py-2 text-sm shadow-md backdrop-blur">
                    <p className="font-bold text-on-surface">{data.label}</p>
                    <p className="font-semibold" style={{ color: 'var(--color-accent-amber)' }}>
<<<<<<< HEAD
<<<<<<< HEAD
                      {data.plannedMinutes ? formatMinutes(data.plannedMinutes) : 'Libre'} planificados
=======
                      {data.plannedMinutes ? formatMinutes(data.plannedMinutes) : 'Tareas'}{' '}
                      planificados
>>>>>>> 497c7ac (Cambios visuales y reagenda de tareas en calendario y optimizacion de la IA)
=======
                      {data.plannedMinutes ? formatMinutes(data.plannedMinutes) : 'Libre'}{' '}
                      planificados
>>>>>>> origin/main
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="plannedMinutes" radius={[6, 6, 0, 0]} maxBarSize={50}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill="var(--color-accent-amber)"
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
