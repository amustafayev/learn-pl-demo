import React from "react";
import { GraduationCap } from "lucide-react";
import { Page, PageHead, ComingSoon } from "../ui.jsx";

export default function LevelTests() {
  return (
    <Page>
      <PageHead kicker="Placement & progress" title="Level tests" sub="Standalone CEFR-level tests, outside any one course." />
      <ComingSoon icon={GraduationCap} title="Coming soon"
        sub="Level tests will let you place a new student or re-check an existing one against A2–C1 benchmarks, independent of a specific course's lessons." />
    </Page>
  );
}
