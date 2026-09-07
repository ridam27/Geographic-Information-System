export function Compass({ heading }) {
  const hasHeading = heading != null;
  const hText = hasHeading ? heading.toFixed(0) + '°' : '—';
  
  return (
    <div className="compass">
      <div className="rose">
        <span className="n">N</span>
        <div 
          className="ar" 
          style={hasHeading ? { transform: `rotate(${heading}deg)` } : {}}
        ></div>
      </div>
      <div className="ci">
        <div className="k">Heading</div>
        <div className="v">{hText}</div>
      </div>
    </div>
  );
}
