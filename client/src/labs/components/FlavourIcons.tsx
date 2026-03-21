import type { FC, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export function renderIcon(map: Record<string, FC<IconProps>>, key: string, size: number) {
  const Icon = map[key];
  return Icon ? <Icon size={size} /> : null;
}

const icon = (d: string, viewBox = "0 0 24 24"): FC<IconProps> => {
  const Comp: FC<IconProps> = ({ size = 20, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={d} />
    </svg>
  );
  return Comp;
};

const multiIcon = (paths: string[], viewBox = "0 0 24 24"): FC<IconProps> => {
  const Comp: FC<IconProps> = ({ size = 20, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
  return Comp;
};

export const FruityIcon = multiIcon([
  "M12 2a5 5 0 0 0-5 5c0 3 2 6 5 9 3-3 5-6 5-9a5 5 0 0 0-5-5Z",
  "M12 2c-1-1-2.5-1-3.5 0",
  "M10 1.5c.5-.5 1.5-.8 2-.5",
]);

export const FloralIcon = multiIcon([
  "M12 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4Z",
  "M12 2v2",
  "M12 20v2",
  "M4.93 4.93l1.41 1.41",
  "M17.66 17.66l1.41 1.41",
  "M2 12h2",
  "M20 12h2",
  "M4.93 19.07l1.41-1.41",
  "M17.66 6.34l1.41-1.41",
]);

export const SweetIcon = multiIcon([
  "M9 8h1.5a2.5 2.5 0 0 1 0 5H9V8Z",
  "M4 20s1.5-2 4-2 4 2 4 2 1.5-2 4-2 4 2 4 2",
  "M5.7 4.2C6.5 3.4 7.6 3 8.8 3c2 0 3.7 1.3 4.2 3.1",
  "M18 7c0-1.5-.8-2.8-2-3.4",
]);

export const SmokyIcon = multiIcon([
  "M8 21V8a4 4 0 1 1 8 0v13",
  "M4 14h16",
  "M6 18h12",
]);

export const WoodyIcon = multiIcon([
  "M12 22V2",
  "M5 12h14",
  "M7 5l5 3 5-3",
  "M7 19l5-3 5 3",
]);

export const MaritimeIcon = multiIcon([
  "M2 12c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0",
  "M2 17c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0",
  "M2 7c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0",
]);

export const SpicyIcon = multiIcon([
  "M12 2c0 3-2 5-2 8s2 5 2 8",
  "M8 6c0 2 1.5 3.5 1.5 5.5S8 15 8 17",
  "M16 6c0 2-1.5 3.5-1.5 5.5S16 15 16 17",
]);

export const MaltyIcon = multiIcon([
  "M12 2v8",
  "M8 6l4 4 4-4",
  "M6 10c0 6 2.5 8 6 12 3.5-4 6-6 6-12",
]);

export const NuttyIcon = multiIcon([
  "M7 12a5 5 0 0 1 10 0c0 3-2.5 6-5 8-2.5-2-5-5-5-8Z",
  "M12 4v4",
  "M10 3c1-1 3-1 4 0",
]);

export const HerbalIcon = multiIcon([
  "M12 22V12",
  "M6 8c3 0 5 2 6 4 1-2 3-4 6-4",
  "M8 4c2 0 3 1.5 4 3 1-1.5 2-3 4-3",
]);

export const EarthyIcon = multiIcon([
  "M12 2C6 7 4 11 4 14a8 8 0 0 0 16 0c0-3-2-7-8-12Z",
  "M8 14c1-2 2.5-3 4-4",
]);

export const CreamyIcon = multiIcon([
  "M6 12c0-4 2.5-7 6-9 3.5 2 6 5 6 9",
  "M6 12c0 4 2.7 7 6 9 3.3-2 6-5 6-9",
  "M6 12h12",
]);

export const MineralIcon = multiIcon([
  "M12 2l4 8-4 4-4-4 4-8Z",
  "M8 10l-4 6h16l-4-6",
  "M6 20h12",
]);

export const IslayIcon = multiIcon([
  "M8 21V8a4 4 0 1 1 8 0v13",
  "M4 14h16",
  "M6 18h12",
]);

export const SpeysideIcon = multiIcon([
  "M12 2a5 5 0 0 0-5 5c0 3 2 6 5 9 3-3 5-6 5-9a5 5 0 0 0-5-5Z",
  "M12 2c-1-1-2.5-1-3.5 0",
  "M10 1.5c.5-.5 1.5-.8 2-.5",
]);

export const SherryIcon = multiIcon([
  "M8 2h8l-1 7a3 3 0 0 1-6 0L8 2Z",
  "M12 9v6",
  "M8 22h8",
  "M12 15c-2 0-4 3-4 7",
  "M12 15c2 0 4 3 4 7",
]);

export const BourbonIcon = multiIcon([
  "M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z",
  "M8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3",
  "M5 13h14",
]);

export const HighlandIcon = multiIcon([
  "M2 20L8 8l4 6 4-10 6 16",
  "M2 20h20",
]);

export const JapaneseIcon = multiIcon([
  "M12 3c-4 4-6 8-6 12a6 6 0 0 0 12 0c0-4-2-8-6-12Z",
  "M12 3v18",
  "M7 13c2 0 3.5-1.5 5-1.5S14.5 13 17 13",
]);

export const GUIDE_CATEGORY_SVG: Record<string, FC<IconProps>> = {
  fruity: FruityIcon,
  floral: FloralIcon,
  sweet: SweetIcon,
  smoky: SmokyIcon,
  woody: WoodyIcon,
  maritime: MaritimeIcon,
  spicy: SpicyIcon,
  malty: MaltyIcon,
  nutty: NuttyIcon,
  herbal: HerbalIcon,
  earthy: EarthyIcon,
  creamy: CreamyIcon,
  mineral: MineralIcon,
};

export const STYLE_CATEGORY_SVG: Record<string, FC<IconProps>> = {
  islay: IslayIcon,
  speyside: SpeysideIcon,
  sherry: SherryIcon,
  bourbon: BourbonIcon,
  highland: HighlandIcon,
  japanese: JapaneseIcon,
};

export const JoinIcon: FC<IconProps> = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" y1="12" x2="3" y2="12" />
  </svg>
);

export const GlassIcon: FC<IconProps> = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 2h8l-1 9a3 3 0 0 1-6 0L8 2Z" />
    <line x1="12" y1="11" x2="12" y2="19" />
    <line x1="8" y1="22" x2="16" y2="22" />
    <path d="M12 19c-2 0-4 1.5-4 3" />
    <path d="M12 19c2 0 4 1.5 4 3" />
  </svg>
);

export const HostIcon: FC<IconProps> = ({ size = 24, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
