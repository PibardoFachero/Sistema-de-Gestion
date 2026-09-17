export default function HomePage() {
  return (
    <section aria-labelledby="home-title" className="max-w-2xl">
      <p className="mb-4 text-sm font-medium tracking-wide text-teal-700">EN PREPARACIÓN</p>
      <h1 id="home-title" className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Un espacio para aprender y avanzar.
      </h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">
        Aula es un proyecto universitario de aprendizaje y productividad académica. Estamos
        construyendo su base para desarrollar la experiencia en equipo.
      </p>
      <p className="mt-8 border-l-2 border-teal-600 pl-4 text-sm leading-6 text-slate-600">
        Versión inicial. Las herramientas de estudio y organización estarán disponibles en próximas
        etapas.
      </p>
    </section>
  );
}
