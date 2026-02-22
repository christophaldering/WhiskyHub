import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Settings, Mail, KeyRound, Download, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { resetAllTours } from "@/components/spotlight-hint";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Account() {
  const { t } = useTranslation();
  const { currentParticipant, setParticipant } = useAppStore();
  const { toast } = useToast();

  const [newEmail, setNewEmail] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!currentParticipant) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-12 py-8">
        <p className="text-muted-foreground">{t("common.signInToAccess")}</p>
      </div>
    );
  }

  const handleEmailChange = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return;
    setEmailLoading(true);
    try {
      const res = await fetch(`/api/participants/${currentParticipant.id}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast({ title: t("account.updated") });
      setNewEmail("");
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePinChange = async () => {
    if (newPin.length < 4) {
      toast({ title: t("account.pinTooShort"), variant: "destructive" });
      return;
    }
    if (newPin !== confirmPin) {
      toast({ title: t("account.pinMismatch"), variant: "destructive" });
      return;
    }
    setPinLoading(true);
    try {
      const res = await fetch(`/api/participants/${currentParticipant.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast({ title: t("account.updated") });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setPinLoading(false);
    }
  };

  const handleDownloadData = async () => {
    setDownloadLoading(true);
    try {
      const res = await fetch(`/api/participants/${currentParticipant.id}/export-data`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `casksense-data-${currentParticipant.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleRestartTour = () => {
    resetAllTours();
    toast({ title: t("tour.tourRestarted") });
  };

  const handleCloseAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/participants/${currentParticipant.id}/anonymize`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to close account");
      setParticipant(null);
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-12 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-foreground" data-testid="text-account-title">
            {t("account.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{t("account.subtitle")}</p>
      </motion.div>

      <Card data-testid="card-change-email">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("account.changeEmail")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("account.changeEmailDesc")}</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder={t("account.newEmail")}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
              data-testid="input-new-email"
            />
            <Button
              onClick={handleEmailChange}
              disabled={emailLoading || !newEmail}
              size="sm"
              data-testid="button-save-email"
            >
              {t("account.updated").split(" ")[0]}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-change-pin">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("account.changePin")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("account.changePinDesc")}</p>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t("account.currentPin")}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              data-testid="input-current-pin"
            />
            <Input
              type="password"
              placeholder={t("account.newPin")}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              data-testid="input-new-pin"
            />
            <Input
              type="password"
              placeholder={t("account.confirmPin")}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              data-testid="input-confirm-pin"
            />
            <Button
              onClick={handlePinChange}
              disabled={pinLoading || !currentPin || !newPin || !confirmPin}
              size="sm"
              data-testid="button-save-pin"
            >
              {t("account.changePin")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-download-data">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("account.downloadData")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("account.downloadDataDesc")}</p>
          <Button
            onClick={handleDownloadData}
            disabled={downloadLoading}
            variant="outline"
            size="sm"
            data-testid="button-download-data"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {t("account.downloadButton")}
          </Button>
        </CardContent>
      </Card>

      <Card data-testid="card-restart-tour">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <h3 className="font-serif font-semibold">{t("account.restartTour")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("account.restartTourDesc")}</p>
          <Button
            onClick={handleRestartTour}
            variant="outline"
            size="sm"
            data-testid="button-restart-tour"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {t("tour.restartTour")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30" data-testid="card-close-account">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            <h3 className="font-serif font-semibold text-destructive">{t("account.closeAccount")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("account.closeAccountDesc")}</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                data-testid="button-close-account"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {t("account.closeAccount")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("account.closeAccountConfirm")}</AlertDialogTitle>
                <AlertDialogDescription>{t("account.closeAccountWarning")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-close">{t("account.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCloseAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleteLoading}
                  data-testid="button-confirm-close"
                >
                  {t("account.closeAccountButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
