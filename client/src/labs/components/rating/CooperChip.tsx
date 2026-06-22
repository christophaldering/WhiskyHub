import { useTranslation } from "react-i18next";
import CooperBarrel from "./CooperBarrel";

interface CooperChipProps {
  onClick: () => void;
  glow?: boolean; // optional: glimmt, wenn Cooper aktiv ist (default ruhend)
}

/**
 * Coopers Präsenz als kleiner, wiederkehrender Chip: das gefügte Fass mit
 * innerem Schein. Sitzt überall an derselben Stelle (Solo, Tasting, Dram-Detail)
 * und lädt zum Schärfen ein, ohne den Moment am Glas zu überlagern.
 * Icon: CooperBarrel. Chip-Styling in labs-theme.css (.cooper-chip).
 */
export default function CooperChip({ onClick, glow = false }: CooperChipProps) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onClick} className="cooper-chip" data-testid="cooper-chip">
      <CooperBarrel size={28} glow={glow} />
      <span className="cooper-chip-label">{t("v2.cooperChip", "Cooper")}</span>
    </button>
  );
}
