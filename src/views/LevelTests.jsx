import React from "react";
import { IconCertificate } from "@tabler/icons-react";
import { Page, PageHeader, ComingSoon } from "../design-system.jsx";

export default function LevelTests() {
  return (
    <Page>
      <PageHeader kicker="Placement & progress" title="Level tests" sub="Standalone CEFR-level tests, outside any one course." />
      <ComingSoon icon={IconCertificate} title="Coming soon"
        sub="Level tests will let you place a new student or re-check an existing one against A2–C1 benchmarks, independent of a specific course's lessons." />
    </Page>
  );
}
