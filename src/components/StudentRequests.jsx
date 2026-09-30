import React from "react";
import { IconCheck, IconX, IconBan, IconCash } from "@tabler/icons-react";
import { Avatar, Button, Tag } from "../design-system.jsx";
import { useStore } from "../store.jsx";
import { timeAgo, shortDate } from "../format.js";

// One request waiting for the teacher — either a student asking to join a
// class with its link/code, or a student asking to buy a course they paid
// for outside the app. Rows come from teacherRoster(state).requests.
// `showClass={false}` inside a class's own page, where "which class" is
// already obvious.
export function RequestRow({ request, showClass = true }) {
  const { dispatch, toast } = useStore();
  const { student, kind } = request;
  const first = student.name.split(" ")[0];

  const accept = () => {
    if (kind === "class") {
      dispatch({ type: "DECIDE_MEMBERSHIP", membershipId: request.membership.id, status: "active" });
      toast(`${first} joined ${request.cls.name}`);
    } else {
      dispatch({ type: "DECIDE_PURCHASE", purchaseId: request.purchase.id, status: "paid" });
      toast(`${first} can now take ${request.course.title}`);
    }
  };
  const decline = () => {
    if (kind === "class") dispatch({ type: "DECIDE_MEMBERSHIP", membershipId: request.membership.id, status: "declined" });
    else dispatch({ type: "DECIDE_PURCHASE", purchaseId: request.purchase.id, status: "declined" });
    toast(`Declined ${first}'s request`);
  };
  const block = () => {
    dispatch({ type: "BLOCK_STUDENT", studentId: student.id });
    toast(`${first} is blocked — they can't send you requests. Unblock them from Students › Former.`);
  };

  const what = kind === "class"
    ? <>Wants to join {showClass ? <b className="text-neutral-950">{request.cls.name}</b> : "this class"} · via class link</>
    : <>Wants to buy <b className="text-neutral-950">{request.course.title}</b> · {request.purchase.amount} {request.purchase.currency}, paid outside the app</>;
  const message = kind === "class" ? request.membership.message : request.purchase.message;

  return (
    <div className="flex flex-wrap items-start gap-3 py-3">
      <Avatar name={student.name} size="sm" color={kind === "class" ? "primary" : "info"} />
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-neutral-950">{student.name}</span>
          {student.level && <Tag color="neutral">{student.level}</Tag>}
          {request.previously && <Tag color="info">Previously your student</Tag>}
        </div>
        <div className="mt-0.5 text-sm text-neutral-600">
          {what} · <span title={shortDate(request.at)}>{timeAgo(request.at)}</span>
        </div>
        {message && <p className="mt-1.5 rounded-lg bg-neutral-200 px-3 py-2 text-sm text-neutral-800">“{message}”</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={accept}>
          {kind === "class" ? <><IconCheck size={15} stroke={1.75} /> Accept</> : <><IconCash size={15} stroke={1.75} /> Mark paid &amp; give access</>}
        </Button>
        <Button size="sm" variant="outline" onClick={decline}><IconX size={15} stroke={1.75} /> Decline</Button>
        <button type="button" onClick={block} title={`Block ${first} — no more requests`}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-warning-50 hover:text-warning-600">
          <IconBan size={15} stroke={1.75} /> Block
        </button>
      </div>
    </div>
  );
}
