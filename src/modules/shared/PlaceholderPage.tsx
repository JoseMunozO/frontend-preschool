type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="page-content">
      <section className="page-heading">
        <p className="eyebrow">Modulo</p>
        <h2>{title}</h2>
      </section>
      <article className="panel">
        <h3>Base lista</h3>
        <p>{description}</p>
      </article>
    </main>
  )
}
