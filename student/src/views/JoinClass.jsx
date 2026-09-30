import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconCheck, IconAlertTriangle, IconSend, IconClock } from "@tabler/icons-react";
import { Alert, Button, Card, Field, Page, PageHeader, TextArea, TextField } from "@app/design-system.jsx";
import { useStore } from "@app/store.jsx";
import { timeAgo } from "@app/format.js";
import { classOf, membershipIn, teacherName } from "../lib.js";

// Join a class with the code (or the link, /join/CODE, which fills it in).
// It only ever sends a request — the teacher accepts it (REQUEST_TO_JOIN);
// the class shows up on Home once they do.
export default function JoinClass() {
  const { token } = useParams();
  const { state, dispatch } = useStore();
  const navigate = useNavigate();
  const [code, setCode] = useState((token || "").toUpperCase());
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(null); // the code last sent

  // What came of it, read back from the data: a request waiting, already in
  // the class, or nothing (a wrong code, a closed class).
  const cls = sent ? state.classes.find((c) => c.joinToken === sent) : null;
  const status = cls ? membershipIn(state, cls.id)?.status : null;
  const result = !sent ? null : status === "requested" ? "requested" : status === "active" ? "active" : "failed";
  const waiting = state.memberships.filter((m) => m.status === "requested" && classOf(state, m.classId)?.joinToken !== sent);

  const submit = (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    dispatch({ type: "REQUEST_TO_JOIN", token: clean, studentId: state.me.id, message });
    setSent(clean);
  };

  return (
    <Page>
      <PageHeader title="Join a class" sub="Enter the code your teacher gave you. They accept your request, then the class appears on your Home." />
      <Card className="p-5 max-w-xl">
        <form onSubmit={submit}>
          <Field label="Class code">
            <TextField value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setSent(null); }} placeholder="e.g. M4R9QX"
              className="font-mono tracking-widest uppercase" autoFocus={!token} maxLength={12} />
          </Field>
          <Field label="Message to your teacher (optional)">
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! I'm in your Monday group." className="!min-h-[84px]" />
          </Field>
          <Button type="submit" variant={code.trim() ? "primary" : "disabled"} disabled={!code.trim()}><IconSend size={16} stroke={1.75} /> Send request</Button>
        </form>
      </Card>

      <div className="max-w-xl mt-4 space-y-3">
        {result === "requested" && (
          <Alert tone="success" icon={IconCheck} title={`Request sent to ${cls.name}`}>
            {teacherName(state, cls.teacherId)} will accept you — the class shows up on your Home as soon as they do.
          </Alert>
        )}
        {result === "active" && (
          <Alert tone="info" icon={IconCheck} title={`You're already in ${cls.name}`} actionLabel="Open the class" onAction={() => navigate(`/classes/${cls.id}`)} />
        )}
        {result === "failed" && (
          <Alert tone="warning" icon={IconAlertTriangle} title="That code didn't work">
            Check it with your teacher — it may be mistyped, replaced by a new one, or the class isn't taking requests right now.
          </Alert>
        )}
        {waiting.map((m) => {
          const c = classOf(state, m.classId);
          return (
            <Alert key={m.id} tone="pending" icon={IconClock} title={`Waiting for ${teacherName(state, c?.teacherId)} to accept you`}>
              {c?.name} · asked {timeAgo(m.requestedAt)}.
            </Alert>
          );
        })}
      </div>
    </Page>
  );
}
