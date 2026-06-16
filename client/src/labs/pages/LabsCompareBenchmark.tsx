import { useState } from "react";
import { useTranslation } from "react-i18next";
import LabsTasteCompare from "./LabsTasteCompare";
import LabsBenchmark from "./LabsBenchmark";

export default function LabsCompareBenchmark() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"intern" | "extern">("intern");
  return (
    <div>
      <div style={{ padding: "16px 20px 0" }}>
        <div className="labs-segmented" style={{ marginBottom: 8 }}>
          <button
            onClick={() => setMode("intern")}
            className={`labs-segmented-btn ${mode === "intern" ? "labs-segmented-btn-active" : ""}`}
            data-testid="compare-mode-intern"
          >
            {t("compare.modeIntern", "Meine Drams")}
          </button>
          <button
            onClick={() => setMode("extern")}
            className={`labs-segmented-btn ${mode === "extern" ? "labs-segmented-btn-active" : ""}`}
            data-testid="compare-mode-extern"
          >
            {t("compare.modeExtern", "Extern")}
          </button>
        </div>
      </div>
      {mode === "intern" ? <LabsTasteCompare /> : <LabsBenchmark />}
    </div>
  );
}
