import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const CASK_CATEGORIES = [
  {
    id: "bourbon",
    en: "Bourbon / American Oak",
    de: "Bourbon / Amerikanische Eiche",
    types: [
      { value: "Ex-Bourbon", en: "Ex-Bourbon Barrel", de: "Ex-Bourbon Fass", hint: { en: "Vanilla, caramel, coconut", de: "Vanille, Karamell, Kokos" } },
      { value: "First Fill Bourbon", en: "First Fill Bourbon", de: "First Fill Bourbon", hint: { en: "Strong vanilla, butterscotch", de: "Starke Vanille, Butterscotch" } },
      { value: "Refill Bourbon", en: "Refill Bourbon", de: "Refill Bourbon", hint: { en: "Subtle, lets spirit shine", de: "Subtil, lässt Spirit wirken" } },
      { value: "Virgin Oak", en: "Virgin American Oak", de: "Frische Amerikanische Eiche", hint: { en: "Intense wood, spice, tannins", de: "Intensives Holz, Gewürze, Tannine" } },
    ],
  },
  {
    id: "sherry",
    en: "Sherry",
    de: "Sherry",
    types: [
      { value: "Oloroso Sherry", en: "Oloroso Sherry", de: "Oloroso Sherry", hint: { en: "Dark fruits, nuts, spice", de: "Dunkle Früchte, Nüsse, Gewürze" } },
      { value: "Pedro Ximénez", en: "Pedro Ximénez (PX)", de: "Pedro Ximénez (PX)", hint: { en: "Very sweet, raisins, figs", de: "Sehr süß, Rosinen, Feigen" } },
      { value: "Fino Sherry", en: "Fino Sherry", de: "Fino Sherry", hint: { en: "Light, dry, nutty", de: "Leicht, trocken, nussig" } },
      { value: "Amontillado Sherry", en: "Amontillado Sherry", de: "Amontillado Sherry", hint: { en: "Nutty, amber, caramel", de: "Nussig, Bernstein, Karamell" } },
      { value: "Palo Cortado", en: "Palo Cortado", de: "Palo Cortado", hint: { en: "Complex, between Oloroso & Amontillado", de: "Komplex, zwischen Oloroso & Amontillado" } },
    ],
  },
  {
    id: "wine",
    en: "Wine Cask",
    de: "Weinfass",
    types: [
      { value: "Red Wine", en: "Red Wine Cask", de: "Rotweinfass", hint: { en: "Berry fruits, tannins", de: "Beerenfrüchte, Tannine" } },
      { value: "White Wine", en: "White Wine Cask", de: "Weißweinfass", hint: { en: "Citrus, floral notes", de: "Zitrus, florale Noten" } },
      { value: "Sauternes", en: "Sauternes", de: "Sauternes", hint: { en: "Honey, apricot, botrytis", de: "Honig, Aprikose, Botrytis" } },
      { value: "Burgundy", en: "Burgundy / Pinot Noir", de: "Burgunder / Pinot Noir", hint: { en: "Cherry, earthy, elegant", de: "Kirsche, erdig, elegant" } },
      { value: "Barolo", en: "Barolo / Nebbiolo", de: "Barolo / Nebbiolo", hint: { en: "Rose, tar, cherry", de: "Rose, Teer, Kirsche" } },
    ],
  },
  {
    id: "port",
    en: "Port",
    de: "Port",
    types: [
      { value: "Ruby Port", en: "Ruby Port", de: "Ruby Port", hint: { en: "Rich berries, chocolate", de: "Reiche Beeren, Schokolade" } },
      { value: "Tawny Port", en: "Tawny Port", de: "Tawny Port", hint: { en: "Nuts, caramel, dried fruits", de: "Nüsse, Karamell, Trockenfrüchte" } },
    ],
  },
  {
    id: "fortified",
    en: "Other Fortified",
    de: "Sonstige Verstärkte Weine",
    types: [
      { value: "Madeira", en: "Madeira", de: "Madeira", hint: { en: "Caramel, citrus peel, oxidative", de: "Karamell, Zitrusschale, oxidativ" } },
      { value: "Marsala", en: "Marsala", de: "Marsala", hint: { en: "Brown sugar, dried apricot", de: "Brauner Zucker, getrocknete Aprikose" } },
      { value: "Moscatel", en: "Moscatel", de: "Moscatel", hint: { en: "Grape, floral, sweet", de: "Traube, blumig, süß" } },
    ],
  },
  {
    id: "rum",
    en: "Rum / Spirits",
    de: "Rum / Spirituosen",
    types: [
      { value: "Rum Cask", en: "Rum Cask", de: "Rumfass", hint: { en: "Tropical fruit, molasses, spice", de: "Tropische Frucht, Melasse, Gewürze" } },
      { value: "Cognac", en: "Cognac Cask", de: "Cognacfass", hint: { en: "Grape, dried fruit, elegant oak", de: "Traube, Trockenfrüchte, elegante Eiche" } },
      { value: "Armagnac", en: "Armagnac Cask", de: "Armagnacfass", hint: { en: "Prune, vanilla, rustic", de: "Pflaume, Vanille, rustikal" } },
      { value: "Mezcal", en: "Mezcal / Tequila Cask", de: "Mezcal- / Tequilafass", hint: { en: "Smoky agave, lime, mineral", de: "Rauchige Agave, Limette, Mineralisch" } },
    ],
  },
  {
    id: "beer",
    en: "Beer / Stout",
    de: "Bier / Stout",
    types: [
      { value: "Stout Cask", en: "Stout / Porter Cask", de: "Stout-/Porterfass", hint: { en: "Chocolate, coffee, roasted", de: "Schokolade, Kaffee, geröstet" } },
      { value: "IPA Cask", en: "IPA Cask", de: "IPA-Fass", hint: { en: "Hoppy, citrus, bitter", de: "Hopfig, Zitrus, bitter" } },
      { value: "Beer Cask", en: "Beer Cask (other)", de: "Bierfass (sonstige)", hint: { en: "Malty, yeast notes", de: "Malzig, Hefenoten" } },
    ],
  },
  {
    id: "other",
    en: "Other / Special",
    de: "Andere / Speziell",
    types: [
      { value: "Japanese Mizunara", en: "Japanese Mizunara Oak", de: "Japanische Mizunara-Eiche", hint: { en: "Sandalwood, incense, coconut", de: "Sandelholz, Weihrauch, Kokos" } },
      { value: "European Oak", en: "European Oak (unspecified)", de: "Europäische Eiche", hint: { en: "Spicy, tannic, structured", de: "Würzig, tanninreich, strukturiert" } },
      { value: "Chestnut", en: "Chestnut Cask", de: "Kastanienfass", hint: { en: "Sweet, nutty, warm", de: "Süß, nussig, warm" } },
      { value: "Acacia", en: "Acacia Cask", de: "Akazienfass", hint: { en: "Floral, honey, light", de: "Blumig, Honig, leicht" } },
      { value: "STR", en: "STR (Shaved, Toasted, Recharred)", de: "STR (geschabt, getoastet, geflammt)", hint: { en: "Versatile, vanilla-spice hybrid", de: "Vielseitig, Vanille-Gewürz-Mix" } },
    ],
  },
] as const;

interface CaskTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CaskTypeSelect({ value, onChange, placeholder, className, disabled }: CaskTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("de") ? "de" : "en";

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CASK_CATEGORIES;
    const q = search.toLowerCase();
    return CASK_CATEGORIES.map(cat => ({
      ...cat,
      types: cat.types.filter(t =>
        t.value.toLowerCase().includes(q) ||
        t[lang].toLowerCase().includes(q) ||
        t.hint[lang].toLowerCase().includes(q)
      ),
    })).filter(cat => cat.types.length > 0);
  }, [search, lang]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-9 text-sm", !value && "text-muted-foreground", className)}
          disabled={disabled}
          data-testid="cask-type-select"
        >
          <span className="truncate">{value || placeholder || (lang === "de" ? "Fasstyp wählen..." : "Select cask type...")}</span>
          <div className="flex items-center gap-1 ml-1 shrink-0">
            {value && (
              <X
                className="h-3 w-3 opacity-50 hover:opacity-100"
                onClick={handleClear}
                data-testid="cask-type-clear"
              />
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-80 overflow-hidden" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "de" ? "Suchen..." : "Search..."}
              className="h-8 pl-8 text-sm"
              data-testid="cask-type-search"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-60 p-1">
          {filteredCategories.length === 0 && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {lang === "de" ? "Keine Ergebnisse" : "No results"}
            </div>
          )}
          {filteredCategories.map(cat => (
            <div key={cat.id} className="mb-1">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {cat[lang]}
              </div>
              {cat.types.map(t => (
                <button
                  key={t.value}
                  onClick={() => handleSelect(t.value)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-sm hover:bg-accent/50 transition-colors flex flex-col gap-0",
                    value === t.value && "bg-accent"
                  )}
                  data-testid={`cask-type-option-${t.value.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="text-sm">{t[lang]}</span>
                  <span className="text-[11px] text-muted-foreground/70">{t.hint[lang]}</span>
                </button>
              ))}
            </div>
          ))}
          {value && !CASK_CATEGORIES.some(c => c.types.some(t => t.value === value)) && (
            <div className="px-2 py-1 mt-1 border-t">
              <div className="px-3 py-1.5 text-sm text-muted-foreground italic">
                {lang === "de" ? "Benutzerdefiniert:" : "Custom:"} {value}
              </div>
            </div>
          )}
        </div>
        <div className="border-t p-2">
          <Input
            placeholder={lang === "de" ? "Oder eigenen Typ eingeben..." : "Or enter custom type..."}
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                handleSelect((e.target as HTMLInputElement).value.trim());
              }
            }}
            data-testid="cask-type-custom"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
