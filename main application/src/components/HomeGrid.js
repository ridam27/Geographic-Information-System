import MODULES from "../data/modules";
import { ModuleIcon, IconExternal } from "./Icons";

export default function HomeGrid({ onOpen }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="home">
      <div className="home__bar">
        <div className="home__barLeft">
          <span className="home__barTitle">Overview</span>
          <span className="home__barSep" />
          <span className="home__barMeta">{dateStr}</span>
        </div>
        <span className="home__barMeta">{MODULES.length} modules</span>
      </div>

      <div className="cardgrid">
        {MODULES.map((m) => (
          <article className="card" key={m.id}>
            <div className="card__top">
              <span className="card__icon"><ModuleIcon name={m.icon} width={18} height={18} /></span>
              <span className="card__code">{m.code}</span>
            </div>
            <h3 className="card__name">{m.name}</h3>
            <p className="card__tagline">{m.tagline}</p>
            <div className="card__actions">
              <button className="btn btn--primary" onClick={() => onOpen(m.id)}>
                Open
              </button>
              <a
                className="btn btn--ghost"
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in a new tab"
              >
                <IconExternal width={13} height={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
