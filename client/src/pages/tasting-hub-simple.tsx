import { useTranslation } from "react-i18next";
import SimpleShell from "@/components/simple/simple-shell";
import { Wine, Crown } from "lucide-react";
import { ApplePage, AppleActionCard } from "@/components/apple";

export default function TastingHubSimple() {
  const { t } = useTranslation();

  return (
    <SimpleShell showBack={false}>
      <div style={{ paddingTop: 24 }}>
        <ApplePage title={t("tastingHub.title")} subtitle={t("tastingHub.subtitle")} center>
          <AppleActionCard
            icon={Wine}
            title={t("tastingHub.joinTitle")}
            description={t("tastingHub.joinDesc")}
            href="/enter"
            testId="card-join-tasting"
          />
          <AppleActionCard
            icon={Crown}
            title={t("tastingHub.hostTitle")}
            description={t("tastingHub.hostDesc")}
            href="/host"
            testId="card-host-tasting"
          />
        </ApplePage>
      </div>
    </SimpleShell>
  );
}
