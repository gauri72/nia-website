export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-2xl font-extrabold text-nia-navy-dark">{title}</h1>
        {description && <p className="text-sm text-nia-text-faint mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
