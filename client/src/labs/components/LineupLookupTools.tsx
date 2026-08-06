import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Euro } from "lucide-react";
import { InfoHint } from "@/labs/components/InfoHint";
import {
  ProgressLine,
  runWbLookupForSaved,
  runPriceLookupForSaved,
  type PriceProgress,
} from "@/labs/pages/LabsHost";

/**
 * Die zwei Nachschlage-Schalter am gespeicherten Lineup — als eigene
 * Komponente, damit Cockpit und Tasting-Detailseite dieselben Werkzeuge
 * zeigen. Vorher gab es sie nur im Cockpit; wer auf der Detailseite
 * arbeitete, fand sie schlicht nicht.
 *
 * Die eigentliche Arbeit (runWbLookupForSaved, runPriceLookupForSaved)
 * lebt weiterhin an genau einer Stelle und wird hier nur benutzt.
 */
export function LineupLookupTools({
  whiskies,
  hostId,
  tastingId,
}: {
  whiskies: any[];
  hostId: string;
  tastingId: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [wbProgress, setWbProgress] = useState<PriceProgress>(null);
  const [priceProgress, setPriceProgress] = useState<PriceProgress>(null);
  const wbStop = useRef(false);
  const priceStop = useRef(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });

  return (
    <div className="mb-3 space-y-2" data-testid="lineup-lookup-tools">
      {/* Als Kacheln statt Textzeilen: zwei Werkzeuge, die man erkennt und
          drueckt — mit (i), das erklaert, was passiert. Textknoepfe wurden
          von Testern schlicht uebersehen. */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="labs-card p-3 text-left"
          style={{ minHeight: 64, opacity: wbProgress ? 0.6 : 1 }}
          disabled={!!wbProgress}
          onClick={() => {
            wbStop.current = false;
            void runWbLookupForSaved(whiskies, hostId, setWbProgress, refresh, () => wbStop.current);
          }}
          data-testid="lineup-wb-start"
        >
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            <Search className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            {t("labs.wbSaved.start", "Whiskybase lookup")}
            <InfoHint text={t("labs.wbSaved.hint", "Finds the Whiskybase entry for every bottle that has none yet — link and community score are saved immediately.")} testId="lineup-wb-hint" />
          </span>
          <span className="text-[11px] block mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
            {t("labs.wbSaved.subtitle", "Link bottles & fetch scores")}
          </span>
        </button>
        <button
          className="labs-card p-3 text-left"
          style={{ minHeight: 64, opacity: priceProgress ? 0.6 : 1 }}
          disabled={!!priceProgress}
          onClick={() => {
            priceStop.current = false;
            void runPriceLookupForSaved(whiskies, hostId, setPriceProgress, refresh, () => priceStop.current);
          }}
          data-testid="lineup-price-start"
        >
          <span className="text-sm font-medium inline-flex items-center gap-1.5">
            <Euro className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            {t("labs.price.start", "Look up prices")}
            <InfoHint text={t("labs.price.hint", "Researches RRP and current market price for bottles without prices — with source and date, saved immediately.")} testId="lineup-price-hint" />
          </span>
          <span className="text-[11px] block mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
            {t("labs.price.subtitle", "RRP & market price")}
          </span>
        </button>
      </div>
      {wbProgress && (
        <>
          <ProgressLine
            label={t("labs.wbSaved.searching", "Looking up Whiskybase entries")}
            done={wbProgress.done}
            total={wbProgress.total}
            countLabel={t("labs.price.progressCount", "{{done}} of {{total}} · {{found}} found", {
              done: wbProgress.done, total: wbProgress.total, found: wbProgress.found,
            })}
            sub={wbProgress.current}
          />
          <button className="labs-btn-ghost text-xs" onClick={() => { wbStop.current = true; }} data-testid="lineup-wb-stop">
            {t("labs.price.stop", "Stop")}
          </button>
        </>
      )}
      {priceProgress && (
        <>
          <ProgressLine
            label={t("labs.price.searching", "Looking up prices")}
            done={priceProgress.done}
            total={priceProgress.total}
            countLabel={t("labs.price.progressCount", "{{done}} of {{total}} · {{found}} found", {
              done: priceProgress.done, total: priceProgress.total, found: priceProgress.found,
            })}
            sub={priceProgress.current}
          />
          <button className="labs-btn-ghost text-xs" onClick={() => { priceStop.current = true; }} data-testid="lineup-price-stop">
            {t("labs.price.stop", "Stop")}
          </button>
        </>
      )}
    </div>
  );
}
