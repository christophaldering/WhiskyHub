import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { importApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Archive, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

type ImportStep = "upload" | "preview" | "importing" | "done";

interface PreviewRow {
  name?: string;
  distillery?: string;
  age?: string;
  abv?: number;
  type?: string;
  region?: string;
  caskInfluence?: string;
  peatLevel?: string;
  notes?: string;
  imageRef?: string;
  _row: number;
  _errors: string[];
  _imageStatus: string | null;
}

interface ImportResult {
  row: number;
  name: string;
  success: boolean;
  error?: string;
  id?: string;
}

export function ImportFlightDialog({ tastingId }: { tastingId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summarySuccess, setSummarySuccess] = useState(0);
  const [summaryErrors, setSummaryErrors] = useState(0);
  const spreadsheetRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  const parseMutation = useMutation({
    mutationFn: () => importApi.parse(tastingId, spreadsheetFile!, imagesZip || undefined),
    onSuccess: (data) => {
      setPreview(data.preview || []);
      setParseErrors(data.parseErrors || []);
      setStep("preview");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => importApi.confirm(tastingId, spreadsheetFile!, imagesZip || undefined),
    onSuccess: (data) => {
      setResults(data.results || []);
      setSummarySuccess(data.successCount || 0);
      setSummaryErrors(data.errorCount || 0);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
  });

  const reset = () => {
    setStep("upload");
    setSpreadsheetFile(null);
    setImagesZip(null);
    setPreview([]);
    setParseErrors([]);
    setResults([]);
    setSummarySuccess(0);
    setSummaryErrors(0);
    if (spreadsheetRef.current) spreadsheetRef.current.value = "";
    if (zipRef.current) zipRef.current.value = "";
  };

  const handleSpreadsheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "txt"].includes(ext || "")) {
      return;
    }
    setSpreadsheetFile(file);
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".zip")) {
      setImagesZip(file);
    }
  };

  const handleParse = () => {
    if (!spreadsheetFile) return;
    parseMutation.mutate();
  };

  const handleConfirm = () => {
    if (!spreadsheetFile) return;
    setStep("importing");
    confirmMutation.mutate();
  };

  const validRows = preview.filter(r => r._errors.length === 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary font-serif" data-testid="button-import-flight">
          <Upload className="w-4 h-4 mr-1" /> {t("import.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">{t("import.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{t("import.subtitle")}</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-6 mt-4">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold block">{t("import.spreadsheet")}</label>
              <div
                onClick={() => spreadsheetRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
                  spreadsheetFile ? "border-primary/30 bg-primary/5" : "border-border"
                )}
                data-testid="dropzone-spreadsheet"
              >
                <input
                  ref={spreadsheetRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={handleSpreadsheetChange}
                  className="hidden"
                  data-testid="input-import-spreadsheet"
                />
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {spreadsheetFile ? (
                  <p className="text-sm font-medium text-primary">{spreadsheetFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">{t("import.dropSpreadsheet")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("import.formats")}</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold block">{t("import.imagesZip")}</label>
              <div
                onClick={() => zipRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
                  imagesZip ? "border-primary/30 bg-primary/5" : "border-border"
                )}
                data-testid="dropzone-images"
              >
                <input
                  ref={zipRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipChange}
                  className="hidden"
                  data-testid="input-import-zip"
                />
                <Archive className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {imagesZip ? (
                  <p className="text-sm font-medium text-primary">{imagesZip.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">{t("import.dropZip")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("import.zipHint")}</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-secondary/30 rounded-lg p-4 border border-border/30">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{t("import.templateHint")}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("import.columns")}</p>
            </div>

            <Button
              onClick={handleParse}
              disabled={!spreadsheetFile || parseMutation.isPending}
              className="w-full bg-primary text-primary-foreground font-serif"
              data-testid="button-parse-import"
            >
              {parseMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("import.parsing")}</>
              ) : (
                t("import.parsePreview")
              )}
            </Button>

            {parseMutation.isError && (
              <p className="text-sm text-destructive text-center">{(parseMutation.error as Error).message}</p>
            )}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 mt-4">
            {parseErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                {parseErrors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("import.previewCount", { total: preview.length, valid: validRows.length })}
              </p>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs" data-testid="table-import-preview">
                  <thead className="bg-secondary/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">#</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Name</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Distillery</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">ABV</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Age</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Region</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Image</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className={cn("border-t border-border/20", row._errors.length > 0 && "bg-destructive/5")}>
                        <td className="px-2 py-1.5 text-muted-foreground">{row._row}</td>
                        <td className="px-2 py-1.5 font-medium">{row.name || "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.distillery || "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground font-mono">{row.abv ? `${row.abv}%` : "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.age || "—"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.region || "—"}</td>
                        <td className="px-2 py-1.5">
                          {row._imageStatus === "url" && <span className="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">URL</span>}
                          {row._imageStatus === "zip" && <span className="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">ZIP</span>}
                          {row._imageStatus === "missing" && <span className="text-destructive text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded">{t("import.imageMissing")}</span>}
                          {!row._imageStatus && <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-2 py-1.5">
                          {row._errors.length > 0 ? (
                            <span className="text-destructive text-[10px]" title={row._errors.join("; ")}>
                              <XCircle className="w-3.5 h-3.5 inline" />
                            </span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { reset(); }} className="flex-1 font-serif" data-testid="button-import-back">
                {t("import.back")}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={validRows.length === 0}
                className="flex-1 bg-primary text-primary-foreground font-serif"
                data-testid="button-confirm-import"
              >
                {t("import.confirmImport", { count: validRows.length })}
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-serif italic">{t("import.importing")}</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 mt-4">
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="font-serif text-xl font-bold text-primary">{t("import.complete")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("import.summary", { success: summarySuccess, errors: summaryErrors })}
              </p>
            </div>

            {results.some(r => !r.success) && (
              <div className="border border-destructive/30 rounded-lg overflow-hidden">
                <div className="bg-destructive/10 px-3 py-2">
                  <p className="text-xs font-bold text-destructive">{t("import.errorDetails")}</p>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {results.filter(r => !r.success).map((r, i) => (
                    <div key={i} className="px-3 py-2 border-t border-destructive/10 text-xs flex items-center gap-2">
                      <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                      <span className="text-muted-foreground">Row {r.row}:</span>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-destructive">— {r.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.some(r => r.success) && (
              <div className="border border-green-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 px-3 py-2">
                  <p className="text-xs font-bold text-green-700">{t("import.successDetails")}</p>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {results.filter(r => r.success).map((r, i) => (
                    <div key={i} className="px-3 py-2 border-t border-green-100 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                      <span className="text-muted-foreground">Row {r.row}:</span>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => { setOpen(false); reset(); }} className="w-full bg-primary text-primary-foreground font-serif" data-testid="button-import-close">
              {t("import.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
