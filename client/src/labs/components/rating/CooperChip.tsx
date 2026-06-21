import { useTranslation } from "react-i18next";

interface CooperChipProps {
  onClick: () => void;
}

/**
 * Coopers Präsenz als kleiner, wiederkehrender Chip: eine atmende Gold-Glut
 * mit feinem Echo-Ring. Sitzt überall an derselben Stelle (Solo, Tasting,
 * Dram-Detail) und lädt zum Schärfen ein, ohne den Moment am Glas zu überlagern.
 * Styling/Animation in labs-theme.css (.cooper-chip / .cooper-glimmer).
 */
export default function CooperChip({ onClick }: CooperChipProps) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="cooper-chip" data-testid="cooper-chip">
      <span className="cooper-glimmer" aria-hidden="true">
        <span className="cooper-glimmer-halo" />
        <span className="cooper-glimmer-ring" />
        <span className="cooper-glimmer-ring r2" />
        <span className="cooper-glimmer-core" />
      </span>
      <span className="cooper-chip-label">{t("v2.cooperChip", "Cooper")}</span>
    </button>
  );
}
