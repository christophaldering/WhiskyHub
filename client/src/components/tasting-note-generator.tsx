import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Wand2, ChevronDown, ChevronUp, RotateCcw, Plus, Replace } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const FLAVOR_CATEGORIES = {
  nose: {
    fruity: ["apple", "pear", "citrus", "orange peel", "dried fruit", "raisin", "cherry", "tropical fruit", "banana", "peach"],
    floral: ["heather", "lavender", "rose", "elderflower", "violet", "jasmine"],
    sweet: ["honey", "vanilla", "toffee", "caramel", "butterscotch", "marzipan", "chocolate", "fudge"],
    spicy: ["cinnamon", "nutmeg", "ginger", "clove", "black pepper", "cardamom"],
    woody: ["oak", "cedar", "sandalwood", "pine", "sawdust"],
    smoky: ["peat smoke", "campfire", "charcoal", "ash", "bonfire"],
    malty: ["cereal", "biscuit", "bread", "malt", "porridge", "toast"],
    other: ["leather", "tobacco", "sea salt", "brine", "iodine", "grass", "hay", "mineral"],
  },
  palate: {
    fruity: ["orchard fruit", "citrus zest", "berries", "stewed fruit", "marmalade", "fig"],
    sweet: ["honey", "caramel", "toffee", "dark chocolate", "brown sugar", "maple syrup", "treacle"],
    spicy: ["white pepper", "cinnamon", "ginger heat", "clove", "chili warmth", "anise"],
    woody: ["oak spice", "tannic", "resinous", "woody", "coconut"],
    smoky: ["peat", "medicinal", "tar", "smoky", "earthy"],
    rich: ["oily", "creamy", "buttery", "waxy", "full-bodied", "velvety"],
    other: ["nutty", "salty", "herbal", "floral notes", "malty", "dried herbs"],
  },
  finish: {
    length: ["short", "medium", "long", "lingering", "endless"],
    character: ["dry", "sweet", "warming", "spicy", "bitter", "clean", "smooth"],
    notes: ["oak", "smoke", "pepper", "fruit", "vanilla", "toffee", "dark chocolate", "coffee", "mineral", "salt"],
  },
};

const FLAVOR_CATEGORIES_DE: Record<string, Record<string, string[]>> = {
  nose: {
    fruchtig: ["Apfel", "Birne", "Zitrus", "Orangenschale", "Trockenfrüchte", "Rosine", "Kirsche", "tropische Frucht", "Banane", "Pfirsich"],
    blumig: ["Heidekraut", "Lavendel", "Rose", "Holunderblüte", "Veilchen", "Jasmin"],
    süß: ["Honig", "Vanille", "Toffee", "Karamell", "Butterscotch", "Marzipan", "Schokolade", "Fudge"],
    würzig: ["Zimt", "Muskatnuss", "Ingwer", "Nelke", "schwarzer Pfeffer", "Kardamom"],
    holzig: ["Eiche", "Zeder", "Sandelholz", "Kiefer", "Sägemehl"],
    rauchig: ["Torfrauch", "Lagerfeuer", "Holzkohle", "Asche", "Feuer"],
    malzig: ["Getreide", "Keks", "Brot", "Malz", "Haferbrei", "Toast"],
    sonstige: ["Leder", "Tabak", "Meersalz", "Salzlake", "Jod", "Gras", "Heu", "Mineral"],
  },
  palate: {
    fruchtig: ["Kernobst", "Zitrusschale", "Beeren", "Kompott", "Marmelade", "Feige"],
    süß: ["Honig", "Karamell", "Toffee", "Zartbitterschokolade", "brauner Zucker", "Ahornsirup", "Melasse"],
    würzig: ["weißer Pfeffer", "Zimt", "Ingwerschärfe", "Nelke", "Chiliwärme", "Anis"],
    holzig: ["Eichenwürze", "tanninhaltig", "harzig", "holzig", "Kokosnuss"],
    rauchig: ["Torf", "medizinisch", "Teer", "rauchig", "erdig"],
    vollmundig: ["ölig", "cremig", "buttrig", "wachsig", "vollmundig", "samtig"],
    sonstige: ["nussig", "salzig", "kräuterig", "Blumennoten", "malzig", "getrocknete Kräuter"],
  },
  finish: {
    länge: ["kurz", "mittel", "lang", "nachklingend", "endlos"],
    charakter: ["trocken", "süß", "wärmend", "würzig", "bitter", "sauber", "sanft"],
    noten: ["Eiche", "Rauch", "Pfeffer", "Frucht", "Vanille", "Toffee", "Zartbitterschokolade", "Kaffee", "Mineral", "Salz"],
  },
};

function generateEnglishNote(
  noseSelections: string[],
  palateSelections: string[],
  finishSelections: string[]
): string {
  const parts: string[] = [];

  if (noseSelections.length > 0) {
    const items = noseSelections.join(", ");
    const openers = ["On the nose:", "The aroma presents", "Nose:"];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`${opener} ${items}.`);
  }

  if (palateSelections.length > 0) {
    const items = palateSelections.join(", ");
    const openers = ["On the palate:", "The taste reveals", "Palate:"];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`${opener} ${items}.`);
  }

  if (finishSelections.length > 0) {
    const items = finishSelections.join(", ");
    const openers = ["The finish is", "Finish:", "It finishes with"];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`${opener} ${items}.`);
  }

  return parts.join(" ");
}

function generateGermanNote(
  noseSelections: string[],
  palateSelections: string[],
  finishSelections: string[]
): string {
  const parts: string[] = [];

  if (noseSelections.length > 0) {
    const items = noseSelections.join(", ");
    const openers = ["In der Nase:", "Das Aroma zeigt", "Nase:"];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`${opener} ${items}.`);
  }

  if (palateSelections.length > 0) {
    const items = palateSelections.join(", ");
    const openers = ["Am Gaumen:", "Der Geschmack offenbart", "Gaumen:"];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`${opener} ${items}.`);
  }

  if (finishSelections.length > 0) {
    const items = finishSelections.join(", ");
    const openers = ["Der Abgang ist", "Abgang:", "Er endet mit"];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    parts.push(`${opener} ${items}.`);
  }

  return parts.join(" ");
}

interface TastingNoteGeneratorProps {
  currentNotes: string;
  onInsertNote: (note: string) => void;
  disabled?: boolean;
}

export function TastingNoteGenerator({ currentNotes, onInsertNote, disabled }: TastingNoteGeneratorProps) {
  const { t, i18n } = useTranslation();
  const isGerman = i18n.language === "de";
  const [isOpen, setIsOpen] = useState(false);
  const [noseSelected, setNoseSelected] = useState<string[]>([]);
  const [palateSelected, setPalateSelected] = useState<string[]>([]);
  const [finishSelected, setFinishSelected] = useState<string[]>([]);
  const [noseCustom, setNoseCustom] = useState("");
  const [palateCustom, setPalateCustom] = useState("");
  const [finishCustom, setFinishCustom] = useState("");
  const [generatedNote, setGeneratedNote] = useState("");

  const categories = isGerman ? FLAVOR_CATEGORIES_DE : FLAVOR_CATEGORIES;

  const hasSelections = noseSelected.length > 0 || palateSelected.length > 0 || finishSelected.length > 0 || noseCustom.trim() !== "" || palateCustom.trim() !== "" || finishCustom.trim() !== "";

  const toggleFlavor = (section: "nose" | "palate" | "finish", flavor: string) => {
    const setters = { nose: setNoseSelected, palate: setPalateSelected, finish: setFinishSelected };
    const setter = setters[section];
    setter(prev => prev.includes(flavor) ? prev.filter(f => f !== flavor) : [...prev, flavor]);
    setGeneratedNote("");
  };

  const clearAll = () => {
    setNoseSelected([]);
    setPalateSelected([]);
    setFinishSelected([]);
    setNoseCustom("");
    setPalateCustom("");
    setFinishCustom("");
    setGeneratedNote("");
  };

  const handleGenerate = () => {
    const noseAll = [...noseSelected];
    const palateAll = [...palateSelected];
    const finishAll = [...finishSelected];
    if (noseCustom.trim()) noseAll.push(noseCustom.trim());
    if (palateCustom.trim()) palateAll.push(palateCustom.trim());
    if (finishCustom.trim()) finishAll.push(finishCustom.trim());
    if (noseAll.length === 0 && palateAll.length === 0 && finishAll.length === 0) return;
    const note = isGerman
      ? generateGermanNote(noseAll, palateAll, finishAll)
      : generateEnglishNote(noseAll, palateAll, finishAll);
    setGeneratedNote(note);
  };

  const handleInsert = () => {
    if (!generatedNote) return;
    onInsertNote(generatedNote);
    setGeneratedNote("");
    clearAll();
  };

  const handleAppend = () => {
    if (!generatedNote) return;
    const combined = currentNotes ? `${currentNotes}\n${generatedNote}` : generatedNote;
    onInsertNote(combined);
    setGeneratedNote("");
    clearAll();
  };

  const renderFlavorSection = (
    sectionKey: "nose" | "palate" | "finish",
    label: string,
    selected: string[]
  ) => {
    const sectionData = categories[sectionKey];
    return (
      <div className="space-y-3" data-testid={`section-${sectionKey}-flavors`}>
        <h4 className="text-xs font-serif font-bold text-muted-foreground uppercase tracking-widest">{label}</h4>
        {Object.entries(sectionData).map(([group, flavors]) => (
          <div key={group} className="space-y-1.5">
            <span className="text-[11px] font-medium text-muted-foreground/70 capitalize">{group}</span>
            <div className="flex flex-wrap gap-1.5">
              {flavors.map((flavor) => {
                const isSelected = selected.includes(flavor);
                return (
                  <Badge
                    key={flavor}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-xs py-0.5 px-2 transition-all duration-200 font-sans",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-secondary/80 border-border/50 text-muted-foreground hover:text-foreground",
                      disabled && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => !disabled && toggleFlavor(sectionKey, flavor)}
                    data-testid={`badge-flavor-${sectionKey}-${flavor.replace(/\s+/g, '-')}`}
                  >
                    {flavor}
                  </Badge>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-2">
          <Input
            placeholder={t('evaluation.customFlavorPlaceholder')}
            value={sectionKey === "nose" ? noseCustom : sectionKey === "palate" ? palateCustom : finishCustom}
            onChange={(e) => {
              const setter = { nose: setNoseCustom, palate: setPalateCustom, finish: setFinishCustom }[sectionKey];
              setter(e.target.value);
            }}
            className="h-8 text-xs font-serif"
            data-testid={`input-custom-flavor-${sectionKey}`}
            disabled={disabled}
          />
        </div>
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground font-serif text-sm gap-2 h-9"
          data-testid="button-toggle-note-generator"
        >
          <span className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            {t('evaluation.noteGenerator')}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3 space-y-5">
        <p className="text-xs text-muted-foreground font-serif italic">{t('evaluation.noteGeneratorHint')}</p>

        {renderFlavorSection("nose", t('evaluation.noseAromas'), noseSelected)}
        {renderFlavorSection("palate", t('evaluation.palateAromas'), palateSelected)}
        {renderFlavorSection("finish", t('evaluation.finishAromas'), finishSelected)}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={!hasSelections || disabled}
            className="font-serif text-xs"
            data-testid="button-generate-note"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            {t('evaluation.generateNote')}
          </Button>
          {hasSelections && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearAll}
              className="font-serif text-xs text-muted-foreground"
              data-testid="button-clear-selections"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {t('evaluation.clearSelections')}
            </Button>
          )}
        </div>

        {generatedNote && (
          <div className="space-y-3 p-4 bg-secondary/20 rounded-lg border border-border/30" data-testid="div-generated-note">
            <h4 className="text-xs font-serif font-bold text-muted-foreground uppercase tracking-widest">{t('evaluation.generatedNote')}</h4>
            <p className="text-sm font-serif leading-relaxed text-foreground">{generatedNote}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={currentNotes ? handleAppend : handleInsert}
                className="font-serif text-xs"
                data-testid="button-insert-note"
              >
                {currentNotes ? (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {t('evaluation.appendNote')}
                  </>
                ) : (
                  <>
                    <Replace className="w-3.5 h-3.5 mr-1.5" />
                    {t('evaluation.insertNote')}
                  </>
                )}
              </Button>
              {currentNotes && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInsert}
                  className="font-serif text-xs"
                  data-testid="button-replace-note"
                >
                  <Replace className="w-3.5 h-3.5 mr-1.5" />
                  {t('evaluation.insertNote')}
                </Button>
              )}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
