import { useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { importApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, ImageIcon, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

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
  _matchedImage: string | null;
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadedImageNames, setUploadedImageNames] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summarySuccess, setSummarySuccess] = useState(0);
  const [summaryErrors, setSummaryErrors] = useState(0);
  const [imageMapping, setImageMapping] = useState<Record<number, string>>({});
  const spreadsheetRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  const parseMutation = useMutation({
    mutationFn: () => importApi.parse(tastingId, spreadsheetFile!, imageFiles.length > 0 ? imageFiles : undefined),
    onSuccess: (data) => {
      setPreview(data.preview || []);
      setParseErrors(data.parseErrors || []);
      setUploadedImageNames(data.uploadedImages || []);

      const initialMapping: Record<number, string> = {};
      (data.preview || []).forEach((row: PreviewRow) => {
        if (row._matchedImage) {
          initialMapping[row._row] = row._matchedImage;
        }
      });
      setImageMapping(initialMapping);
      setStep("preview");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      const mappingForApi: Record<string, string> = {};
      Object.entries(imageMapping).forEach(([rowNum, filename]) => {
        if (filename && filename !== "__none__") {
          mappingForApi[rowNum] = filename;
        }
      });
      return importApi.confirm(
        tastingId,
        spreadsheetFile!,
        imageFiles.length > 0 ? imageFiles : undefined,
        Object.keys(mappingForApi).length > 0 ? mappingForApi : undefined
      );
    },
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
    setImageFiles([]);
    setUploadedImageNames([]);
    setPreview([]);
    setParseErrors([]);
    setResults([]);
    setSummarySuccess(0);
    setSummaryErrors(0);
    setImageMapping({});
    if (spreadsheetRef.current) spreadsheetRef.current.value = "";
    if (imagesRef.current) imagesRef.current.value = "";
  };

  const handleSpreadsheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv", "txt"].includes(ext || "")) return;
    setSpreadsheetFile(file);
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f.name));
    setImageFiles(valid);
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

  const handleMappingChange = (rowNum: number, value: string) => {
    setImageMapping(prev => {
      const next = { ...prev };
      if (value === "__none__") {
        delete next[rowNum];
      } else {
        next[rowNum] = value;
      }
      return next;
    });
  };

  const validRows = preview.filter(r => r._errors.length === 0);

  const imageBadge = (row: PreviewRow) => {
    if (row._imageStatus === "url") {
      return <span className="text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">{t("import.imageUrl")}</span>;
    }
    const mapped = imageMapping[row._row];
    if (mapped) {
      const isAuto = row._imageStatus === "auto";
      return (
        <span className={cn("text-[10px] px-1.5 py-0.5 rounded", isAuto ? "text-accent bg-accent/15" : "text-primary bg-primary/10")}>
          {isAuto ? t("import.imageAutoMatched") : t("import.imageMatched")}
        </span>
      );
    }
    if (row._imageStatus === "missing") {
      return <span className="text-destructive text-[10px] bg-destructive/10 px-1.5 py-0.5 rounded">{t("import.imageMissing")}</span>;
    }
    return <span className="text-muted-foreground/40 text-[10px]">{t("import.imageNone")}</span>;
  };

  const hasImages = uploadedImageNames.length > 0;

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
              <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold block">{t("import.bottlePhotos")}</label>
              <div
                onClick={() => imagesRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
                  imageFiles.length > 0 ? "border-primary/30 bg-primary/5" : "border-border"
                )}
                data-testid="dropzone-images"
              >
                <input
                  ref={imagesRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  multiple
                  onChange={handleImagesChange}
                  className="hidden"
                  data-testid="input-import-images"
                />
                <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                {imageFiles.length > 0 ? (
                  <p className="text-sm font-medium text-primary">{t("import.imagesSelected", { count: imageFiles.length })}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-muted-foreground">{t("import.dropImages")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("import.imagesHint")}</p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-secondary/30 rounded-lg border border-border/30 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border/20">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("import.templateHint")}</p>
              </div>

              <div className="px-4 py-3 border-b border-border/20">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">{t("import.exampleHeader")}</p>
                <div className="overflow-x-auto">
                  <code className="text-[11px] font-mono text-primary/80 whitespace-nowrap block">
                    name,distillery,age,abv,type,category,region,cask,peat,ppm,whiskybase_id,notes,order,image_filename,image_url
                  </code>
                </div>
              </div>

              <div className="px-4 py-3 border-b border-border/20">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-1.5">{t("import.exampleRow")}</p>
                <div className="overflow-x-auto">
                  <code className="text-[11px] font-mono text-foreground/70 whitespace-nowrap block">
                    Ardbeg Uigeadail,Ardbeg,NAS,54.2,Single Malt,Whisky,Islay,Sherry,Heavy,55,12345,"Dark chocolate, smoke",1,uigeadail.jpg,
                  </code>
                </div>
              </div>

              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2">{t("import.fieldExplanations")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {[
                    { key: "name", required: true },
                    { key: "distillery" },
                    { key: "age" },
                    { key: "abv" },
                    { key: "type" },
                    { key: "category" },
                    { key: "region" },
                    { key: "cask" },
                    { key: "peat" },
                    { key: "ppm" },
                    { key: "whiskybase_id" },
                    { key: "notes" },
                    { key: "order" },
                    { key: "image_filename" },
                    { key: "image_url" },
                  ].map((col) => (
                    <div key={col.key} className="flex items-baseline gap-1.5 py-0.5">
                      <code className="text-[10px] font-mono text-primary/70 flex-shrink-0">
                        {col.key}{col.required ? " *" : ""}
                      </code>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {t(`import.col.${col.key}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Image</th>
                      <th className="px-2 py-2 text-left font-bold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx} className={cn("border-t border-border/20", row._errors.length > 0 && "bg-destructive/5")}>
                        <td className="px-2 py-1.5 text-muted-foreground">{row._row}</td>
                        <td className="px-2 py-1.5 font-medium">{row.name || "\u2014"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.distillery || "\u2014"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground font-mono">{row.abv ? `${row.abv}%` : "\u2014"}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.age || "\u2014"}</td>
                        <td className="px-2 py-1.5">
                          {row._imageStatus === "url" ? (
                            imageBadge(row)
                          ) : hasImages ? (
                            <Select
                              value={imageMapping[row._row] || "__none__"}
                              onValueChange={(v) => handleMappingChange(row._row, v)}
                            >
                              <SelectTrigger className="h-7 text-[10px] w-[140px] border-border/50" data-testid={`select-image-${row._row}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__" className="text-xs text-muted-foreground">
                                  {t("import.imageNone")}
                                </SelectItem>
                                {uploadedImageNames.map(name => (
                                  <SelectItem key={name} value={name} className="text-xs">
                                    {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            imageBadge(row)
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {row._errors.length > 0 ? (
                            <span className="text-destructive text-[10px]" title={row._errors.join("; ")}>
                              <XCircle className="w-3.5 h-3.5 inline" />
                            </span>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {hasImages && (
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <p className="text-xs text-accent font-medium">{t("import.mappingPreview")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("import.mappingHint")}</p>
              </div>
            )}

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
              <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
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
                      <span className="text-destructive">&mdash; {r.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.some(r => r.success) && (
              <div className="border border-primary/30 rounded-lg overflow-hidden">
                <div className="bg-primary/10 px-3 py-2">
                  <p className="text-xs font-bold text-primary">{t("import.successDetails")}</p>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {results.filter(r => r.success).map((r, i) => (
                    <div key={i} className="px-3 py-2 border-t border-primary/10 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
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
