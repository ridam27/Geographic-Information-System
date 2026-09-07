// Minimal single-weight line icons, drawn by hand to match the survey-instrument
// aesthetic of the dashboard. No external icon dependency required.

const common = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconHome(props) {
  return (
    <svg {...common} {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9h13v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function IconSurvey(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3.2M12 18.8V22M2 12h3.2M18.8 12H22" />
    </svg>
  );
}

export function IconLayers(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 3 21 8 12 13 3 8 12 3Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

export function IconCube(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 2.5 20.5 7.3v9.4L12 21.5 3.5 16.7V7.3L12 2.5Z" />
      <path d="M3.5 7.3 12 12l8.5-4.7" />
      <path d="M12 12v9.5" />
    </svg>
  );
}

export function IconLeaf(props) {
  return (
    <svg {...common} {...props}>
      <path d="M5 19c8.5 0 14-5.5 14-14C10.5 5 5 10.5 5 19Z" />
      <path d="M5 19c0-5 3-8.5 7-10.5" />
    </svg>
  );
}

export function IconPaw(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="15.5" r="4" />
      <circle cx="5.5" cy="9" r="1.9" />
      <circle cx="10.2" cy="6" r="1.9" />
      <circle cx="13.8" cy="6" r="1.9" />
      <circle cx="18.5" cy="9" r="1.9" />
    </svg>
  );
}

export function IconChip(props) {
  return (
    <svg {...common} {...props}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
      <path d="M9 3.5v3M12 3.5v3M15 3.5v3M9 17.5v3M12 17.5v3M15 17.5v3M3.5 9h3M3.5 12h3M3.5 15h3M17.5 9h3M17.5 12h3M17.5 15h3" />
    </svg>
  );
}

export function IconDrone(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M9.8 9.8 5 5M14.2 9.8 19 5M9.8 14.2 5 19M14.2 14.2 19 19" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
    </svg>
  );
}

export function IconExternal(props) {
  return (
    <svg {...common} {...props}>
      <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
    </svg>
  );
}

export function IconRefresh(props) {
  return (
    <svg {...common} {...props}>
      <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9M20.5 12a8.5 8.5 0 0 1-14.6 5.9" />
      <path d="M18.5 3.5v3.5H15M5.5 20.5V17H9" />
    </svg>
  );
}

export function IconShield(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 3.5 19 6.3v5.4c0 4.6-3 8.1-7 9.3-4-1.2-7-4.7-7-9.3V6.3L12 3.5Z" />
      <path d="M9 12.2l2.1 2.1L15.3 10" />
    </svg>
  );
}

const ICONS = {
  survey: IconSurvey,
  layers: IconLayers,
  cube: IconCube,
  leaf: IconLeaf,
  paw: IconPaw,
  chip: IconChip,
  drone: IconDrone,
};

export function ModuleIcon({ name, ...rest }) {
  const Cmp = ICONS[name] || IconSurvey;
  return <Cmp {...rest} />;
}
