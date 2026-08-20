export function ForbiddenPage() {
  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">403</p>
        <h2>No tienes permiso</h2>
      </section>
      <article className="panel">
        <p>
          Tu usuario no tiene los permisos necesarios para acceder a esta seccion. Si crees que
          esto es un error, contacta a un administrador.
        </p>
      </article>
    </main>
  )
}
