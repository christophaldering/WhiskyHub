import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
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
      <div className="flex gap-2 flex-wrap">
        <button
          className="labs-btn-ghost text-xs"
          disabled={!!wbProgress}
          onClick={() => {
            wbStop.current = false;
            void runWbLookupForSaved(whiskies, hostId, setWbProgress, refresh, () => wbStop.current);
          }}
          data-testid="lineup-wb-start"
        >
          {t("labs.wbSaved.start", "Whiskybase lookup")}
        </button>
        <button
          className="labs-btn-ghost text-xs"
          disabled={!!priceProgress}
          onClick={() => {
            priceStop.current = false;
            void runPriceLookupForSaved(whiskies, hostId, setPriceProgress, refresh, () => priceStop.current);
          }}
          data-testid="lineup-price-start"
        >
          {t("labs.price.start", "Look up prices")}
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
