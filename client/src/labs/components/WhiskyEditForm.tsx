import { useState } from "react";
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

  // Bei neuen Flaschen zu, bei bestehenden ebenfalls — wer korrigieren will,
  // klappt gezielt auf. Ausnahme: wenn schon Details da sind, ist es
  // irrefuehrend, sie zu verstecken.
  const hasDetails = [whisky.bottler, whisky.caskType, whisky.distilledYear, whisky.bottledYear, whisky.category, whisky.peatLevel, whisky.notes].some(Boolean);
  const [detailsOpen, setDetailsOpen] = useState(hasDetails);

  const wbScore = whisky.wbScore;
  const wbId = str(whisky.whiskybaseId);
  const priceRrp = whisky.priceRrp;
  const priceMarket = whisky.priceMarket;
  const currency = str(whisky.priceCurrency) || "EUR";
  const hasLookupData = wbScore != null || wbId || priceRrp != null || priceMarket != null;

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
    });
  };

  const field = (
    value: string,
    setter: (v: string) => void,
    placeholder: string,
    testId: string,
    extra?: { numeric?: boolean; width?: number },
  ) => (
    <input
      className="labs-input text-sm"
      style={{ minWidth: 0, ...(extra?.width ? { width: extra.width } : { flex: 1 }) }}
      value={value}
      onChange={(e) => setter(e.target.value)}
      placeholder={placeholder}
      inputMode={extra?.numeric ? "decimal" : undefined}
      data-testid={testId}
    />
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

      {hasLookupData && (
        <div
          className="text-[11px] space-y-0.5"
          style={{ color: "var(--labs-text-muted)", paddingTop: 4, borderTop: "1px solid var(--labs-border)" }}
          data-testid="whisky-edit-lookup"
        >
          {wbScore != null && <div>{t("whiskyForm.wbScore", "Whiskybase rating")}: {String(wbScore)}</div>}
          {(priceRrp != null || priceMarket != null) && (
            <div>
              {priceRrp != null && <>{t("whiskyForm.rrp", "RRP")}: {String(priceRrp)} {currency}</>}
              {priceRrp != null && priceMarket != null && " · "}
              {priceMarket != null && <>{t("whiskyForm.market", "Market")}: {String(priceMarket)} {currency}</>}
            </div>
          )}
          {wbId && (
            <a
              href={`https://www.whiskybase.com/whiskies/whisky/${wbId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
              style={{ color: "var(--labs-accent)" }}
              data-testid="whisky-edit-wb-link"
            >
              Whiskybase <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
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
