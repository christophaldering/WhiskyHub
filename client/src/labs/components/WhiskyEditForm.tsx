import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import WhiskyImageUpload from "@/components/WhiskyImageUpload";

/**
 * Die eine Maske, mit der Whiskys angelegt und bearbeitet werden.
 *
 * Vorher gab es drei: eine in der Tasting-Detailseite mit fuenf Feldern, eine
 * im mobilen Cockpit mit acht, eine am Desktop mit wieder anderen — und ein
 * "Hinzufuegen", das nur nach dem Namen fragte. Jede Erweiterung musste
 * dreimal gemacht werden und wurde es nie; deshalb fehlten je nach Weg andere
 * Angaben.
 *
 * Aufbau: Was man beim Anlegen fast immer braucht, steht offen. Alles Weitere
 * klappt auf — auf dem Telefon waere eine Liste von zwanzig Feldern sonst
 * unbenutzbar. Ermittelte Werte (Whiskybase-Bewertung, Preise) stehen unten
 * und sind nur zum Nachlesen: sie stammen aus der Suche, und wer sie von Hand
 * ueberschreibt, verliert sie beim naechsten Abgleich.
 */

export interface WhiskyFormValues {
  name: string;
  distillery: string | null;
  country: string | null;
  region: string | null;
  age: string | null;
  abv: number | null;
  bottler: string | null;
  caskType: string | null;
  distilledYear: string | null;
  bottledYear: string | null;
  category: string | null;
  peatLevel: string | null;
  notes: string | null;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function WhiskyEditForm({
  whisky,
  onSave,
  onCancel,
  onImageChanged,
  saving = false,
  showImage = true,
}: {
  /** Leeres Objekt = neue Flasche anlegen. */
  whisky: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  onImageChanged?: () => void;
  saving?: boolean;
  showImage?: boolean;
}) {
  const { t } = useTranslation();
  const id = str(whisky.id);
  const isNew = !id;

  const [name, setName] = useState(str(whisky.name));
  const [distillery, setDistillery] = useState(str(whisky.distillery));
  const [country, setCountry] = useState(str(whisky.country));
  const [region, setRegion] = useState(str(whisky.region));
  const [age, setAge] = useState(str(whisky.age));
  const [abv, setAbv] = useState(str(whisky.abv));

  const [bottler, setBottler] = useState(str(whisky.bottler));
  const [caskType, setCaskType] = useState(str(whisky.caskType));
  const [distilledYear, setDistilledYear] = useState(str(whisky.distilledYear));
  const [bottledYear, setBottledYear] = useState(str(whisky.bottledYear));
  const [category, setCategory] = useState(str(whisky.category));
  const [peatLevel, setPeatLevel] = useState(str(whisky.peatLevel));
  const [notes, setNotes] = useState(str(whisky.notes));

  // Whiskybase-ID eingeben und die Felder daraus fuellen. Frueher gab es das
  // nur im Desktop-Cockpit — der einzige Grund, warum dort ein eigenes
  // Formular stehenbleiben musste.
  // Zeigt die GESPEICHERTE ID an und dient zugleich als Suchfeld. Vorher
  // startete es leer — dann stand unten eine Bewertung, aber oben keine ID,
  // was aussah, als fehlte die Verknuepfung.
  const [wbLookupId, setWbLookupId] = useState(str(whisky.whiskybaseId));
  const [wbLookupState, setWbLookupState] = useState<"" | "loading" | "not_found" | "rate_limit" | "invalid" | "failed">("");

  const runWbLookup = async () => {
    const raw = wbLookupId.trim().replace(/^[Ww][Bb]\s*/i, "");
    const cleaned = raw.match(/whiskies\/whisky\/(\d+)/)?.[1] ?? raw;
    if (!/^\d+$/.test(cleaned)) { setWbLookupState("invalid"); return; }
    setWbLookupState("loading");
    try {
      const res = await fetch(`/api/whiskybase-lookup/${encodeURIComponent(cleaned)}`);
      if (!res.ok) {
        setWbLookupState(res.status === 429 ? "rate_limit" : res.status === 400 ? "invalid" : "not_found");
        return;
      }
      const d = await res.json();
      // Vorhandenes NICHT ueberschreiben: was der Gastgeber selbst eingetragen
      // hat, wiegt schwerer als ein Katalogwert.
      if (d.name && !name.trim()) setName(d.name);
      if (d.distillery && !distillery.trim()) setDistillery(d.distillery);
      if (d.country && !country.trim()) setCountry(d.country);
      if (d.region && !region.trim()) setRegion(d.region);
      if (d.age && !age.trim()) setAge(String(d.age));
      if (d.abv && !abv.trim()) setAbv(String(d.abv));
      if (d.bottler && !bottler.trim()) setBottler(d.bottler);
      if (d.caskType && !caskType.trim()) setCaskType(d.caskType);
      if (d.peatLevel && !peatLevel.trim()) setPeatLevel(d.peatLevel);
      if (d.wbScore != null && !wbScore.trim()) setWbScore(String(d.wbScore));
      setWbLookupState("");
      setDetailsOpen(true);
    } catch {
      setWbLookupState("failed");
    }
  };

  // Bei neuen Flaschen zu, bei bestehenden ebenfalls — wer korrigieren will,
  // klappt gezielt auf. Ausnahme: wenn schon Details da sind, ist es
  // irrefuehrend, sie zu verstecken.
  const hasDetails = [whisky.bottler, whisky.caskType, whisky.distilledYear, whisky.bottledYear, whisky.category, whisky.peatLevel, whisky.notes].some(Boolean);
  const [detailsOpen, setDetailsOpen] = useState(hasDetails);

  // Editierbar statt nur lesbar: die Suche findet ein Drittel der Flaschen
  // nicht — dann muessen Score und Preise von Hand nachtragbar sein.
  const [wbScore, setWbScore] = useState(str(whisky.wbScore));
  const [priceRrp, setPriceRrp] = useState(str(whisky.priceRrp));
  const [priceMarket, setPriceMarket] = useState(str(whisky.priceMarket));
  const [priceCurrency, setPriceCurrency] = useState(str(whisky.priceCurrency) || "EUR");
  const [priceRrpSource, setPriceRrpSource] = useState(str(whisky.priceRrpSource));
  const [priceRrpDate, setPriceRrpDate] = useState(str(whisky.priceRrpDate));
  const [priceMarketSource, setPriceMarketSource] = useState(str(whisky.priceMarketSource));
  const [priceMarketDate, setPriceMarketDate] = useState(str(whisky.priceMarketDate));

  // Die Tiefensuche schreibt Preise im Hintergrund an die Flasche, waehrend
  // dieses Formular offen sein kann. Ohne Nachfuehrung zeigt es dann leere
  // Preisfelder — und Speichern wuerde die frischen Werte mit null tilgen.
  // Deshalb: NUR die Preisfelder aus den neuen Daten uebernehmen; alle
  // uebrigen Felder (Name, Notizen ...) behalten laufende Eingaben.
  useEffect(() => {
    setPriceRrp(str(whisky.priceRrp));
    setPriceMarket(str(whisky.priceMarket));
    if (str(whisky.priceCurrency)) setPriceCurrency(str(whisky.priceCurrency));
    setPriceRrpSource(str(whisky.priceRrpSource));
    setPriceRrpDate(str(whisky.priceRrpDate));
    setPriceMarketSource(str(whisky.priceMarketSource));
    setPriceMarketDate(str(whisky.priceMarketDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whisky.priceRrp, whisky.priceMarket, whisky.priceCurrency, whisky.priceRrpSource, whisky.priceRrpDate, whisky.priceMarketSource, whisky.priceMarketDate]);

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      distillery: distillery.trim() || null,
      country: country.trim() || null,
      region: region.trim() || null,
      age: age.trim() || null,
      abv: abv.trim() ? parseFloat(abv.replace(",", ".")) : null,
      bottler: bottler.trim() || null,
      caskType: caskType.trim() || null,
      distilledYear: distilledYear.trim() || null,
      bottledYear: bottledYear.trim() || null,
      category: category.trim() || null,
      peatLevel: peatLevel.trim() || null,
      notes: notes.trim() || null,
      whiskybaseId: wbLookupId.trim() || null,
      whiskybaseUrl: wbLookupId.trim()
        ? `https://www.whiskybase.com/whiskies/whisky/${wbLookupId.trim()}/`
        : null,
      wbScore: wbScore.trim() ? parseFloat(wbScore.replace(",", ".")) : null,
      priceRrp: priceRrp.trim() ? parseFloat(priceRrp.replace(",", ".")) : null,
      priceMarket: priceMarket.trim() ? parseFloat(priceMarket.replace(",", ".")) : null,
      priceCurrency: priceCurrency.trim() || null,
      priceRrpSource: priceRrpSource.trim() || null,
      priceRrpDate: priceRrpDate.trim() || null,
      priceMarketSource: priceMarketSource.trim() || null,
      priceMarketDate: priceMarketDate.trim() || null,
    });
  };

  // Dauerhafte Beschriftung ueber jedem Feld: Platzhalter allein
  // verschwinden, sobald ein Wert drinsteht — dann ist "67" nicht mehr
  // als Alkoholgehalt erkennbar. Die Beschriftung wird aus dem
  // placeholder abgeleitet, damit die Aufrufstellen unveraendert bleiben.
  const field = (
    value: string,
    setter: (v: string) => void,
    placeholder: string,
    testId: string,
    extra?: { numeric?: boolean; width?: number },
  ) => (
    <label
      style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2, ...(extra?.width ? { width: extra.width } : { flex: 1 }) }}
    >
      <span
        className="text-[10px]"
        style={{ color: "var(--labs-text-muted)", letterSpacing: "0.02em", lineHeight: 1.2 }}
      >
        {placeholder}
      </span>
      <input
        className="labs-input text-sm"
        style={{ minWidth: 0, width: "100%" }}
        value={value}
        onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        inputMode={extra?.numeric ? "decimal" : undefined}
        data-testid={testId}
      />
    </label>
  );

  return (
    <div className="labs-card p-3 space-y-2" data-testid={`whisky-edit-form${id ? `-${id}` : "-new"}`}>
      {showImage && !isNew && (
        <WhiskyImageUpload
          whiskyId={id}
          imageUrl={(whisky.imageUrl as string | null) ?? null}
          onImageUploaded={() => onImageChanged?.()}
          onImageDeleted={() => onImageChanged?.()}
        />
      )}

      <input
        className="labs-input w-full text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("whiskyForm.name", "Name")}
        autoFocus={isNew}
        data-testid="whisky-edit-name"
      />

      <div className="flex gap-2">
        {field(distillery, setDistillery, t("whiskyForm.distillery", "Distillery"), "whisky-edit-distillery")}
        {field(age, setAge, t("whiskyForm.age", "Age"), "whisky-edit-age", { width: 72 })}
        {field(abv, setAbv, t("whiskyForm.abv", "ABV"), "whisky-edit-abv", { numeric: true, width: 80 })}
      </div>
      <div className="flex gap-2">
        {field(country, setCountry, t("whiskyForm.country", "Country"), "whisky-edit-country")}
        {field(region, setRegion, t("whiskyForm.region", "Region"), "whisky-edit-region")}
      </div>

      <div className="flex gap-2 items-center">
        <input
          className="labs-input text-sm"
          style={{ width: 110 }}
          value={wbLookupId}
          onChange={(e) => { setWbLookupId(e.target.value); setWbLookupState(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") void runWbLookup(); }}
          placeholder={t("whiskyForm.wbId", "WB-ID")}
          inputMode="numeric"
          data-testid="whisky-edit-wb-id"
        />
        <button
          type="button"
          className="labs-btn-ghost text-xs"
          onClick={() => void runWbLookup()}
          disabled={wbLookupState === "loading" || !wbLookupId.trim()}
          data-testid="whisky-edit-wb-fetch"
        >
          {wbLookupState === "loading"
            ? t("whiskyForm.wbLoading", "Fetching…")
            : t("whiskyForm.wbFetch", "Fill from Whiskybase")}
        </button>
        {wbLookupState && wbLookupState !== "loading" && (
          <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }} data-testid="whisky-edit-wb-state">
            {wbLookupState === "not_found" && t("whiskyForm.wbNotFound", "Not found")}
            {wbLookupState === "rate_limit" && t("whiskyForm.wbRateLimit", "Too many requests")}
            {wbLookupState === "invalid" && t("whiskyForm.wbInvalid", "Invalid ID")}
            {wbLookupState === "failed" && t("whiskyForm.wbFailed", "Failed")}
          </span>
        )}
      </div>

      <button
        type="button"
        className="labs-btn-ghost text-xs inline-flex items-center gap-1"
        style={{ minHeight: 44 }}
        onClick={() => setDetailsOpen((v) => !v)}
        data-testid="whisky-edit-details-toggle"
      >
        {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {t("whiskyForm.moreDetails", "More details")}
      </button>

      {detailsOpen && (
        <div className="space-y-2" data-testid="whisky-edit-details">
          <div className="flex gap-2">
            {field(bottler, setBottler, t("whiskyForm.bottler", "Bottler"), "whisky-edit-bottler")}
            {field(caskType, setCaskType, t("whiskyForm.cask", "Cask"), "whisky-edit-cask")}
          </div>
          <div className="flex gap-2">
            {field(distilledYear, setDistilledYear, t("whiskyForm.distilled", "Distilled"), "whisky-edit-distilled", { numeric: true })}
            {field(bottledYear, setBottledYear, t("whiskyForm.bottled", "Bottled"), "whisky-edit-bottled", { numeric: true })}
          </div>
          <div className="flex gap-2">
            {field(category, setCategory, t("whiskyForm.category", "Category"), "whisky-edit-category")}
            {field(peatLevel, setPeatLevel, t("whiskyForm.peat", "Peat"), "whisky-edit-peat")}
          </div>
          <div className="flex gap-2">
            {field(wbScore, setWbScore, t("whiskyForm.wbScore", "Whiskybase rating"), "whisky-edit-wbscore", { numeric: true })}
            {field(priceCurrency, setPriceCurrency, t("whiskyForm.currency", "Currency"), "whisky-edit-currency", { width: 72 })}
          </div>
          <div className="flex gap-2">
            {field(priceRrp, setPriceRrp, t("whiskyForm.rrp", "RRP"), "whisky-edit-rrp", { numeric: true })}
            {field(priceMarket, setPriceMarket, t("whiskyForm.market", "Market"), "whisky-edit-market", { numeric: true })}
          </div>
          <div className="flex gap-2">
            {field(priceRrpSource, setPriceRrpSource, t("whiskyForm.rrpSource", "RRP source"), "whisky-edit-rrp-source")}
            {field(priceRrpDate, setPriceRrpDate, t("whiskyForm.priceDate", "Date"), "whisky-edit-rrp-date", { width: 104 })}
          </div>
          <div className="flex gap-2">
            {field(priceMarketSource, setPriceMarketSource, t("whiskyForm.marketSource", "Market source"), "whisky-edit-market-source")}
            {field(priceMarketDate, setPriceMarketDate, t("whiskyForm.priceDate", "Date"), "whisky-edit-market-date", { width: 104 })}
          </div>
          <textarea
            className="labs-input w-full text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("whiskyForm.notes", "Notes")}
            data-testid="whisky-edit-notes"
          />
        </div>
      )}

      {wbLookupId.trim() && (
        <a
          href={`https://www.whiskybase.com/whiskies/whisky/${wbLookupId.trim()}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px]"
          style={{ color: "var(--labs-accent)" }}
          data-testid="whisky-edit-wb-link"
        >
          Whiskybase <ExternalLink className="w-3 h-3" />
        </a>
      )}

      <div className="flex gap-2 justify-end">
        <button className="labs-btn-ghost text-xs" onClick={onCancel} data-testid="whisky-edit-cancel">
          {t("ui.cancel", "Cancel")}
        </button>
        <button
          className="labs-btn-primary text-xs px-3"
          onClick={submit}
          disabled={saving || !name.trim()}
          data-testid="whisky-edit-save"
        >
          {saving ? t("labs.host.savingEllipsis", "Saving…") : isNew ? t("ui.add", "Add") : t("ui.save", "Save")}
        </button>
      </div>
    </div>
  );
}
