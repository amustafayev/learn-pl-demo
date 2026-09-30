import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconBook2, IconCircleCheck, IconClock, IconReceipt, IconSchool, IconShoppingCart } from "@tabler/icons-react";
import { Alert, Breadcrumbs, Button, Card, CourseCard, Field, Modal, Page, PageHeader, SectionLabel, SegmentedBar, TextArea } from "@app/design-system.jsx";
import { useStore } from "@app/store.jsx";
import { timeAgo } from "@app/format.js";
import { courseOf, finishedLesson, lessonsOf, myClasses, teacherName, toneOf } from "../lib.js";
import LessonRow from "../components/LessonRow.jsx";

const price = (sale) => `${sale.price} ${sale.currency}`;
const purchaseOf = (state, courseId) =>
  [...state.purchases].filter((p) => p.courseId === courseId).sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))[0] || null;

// Courses the student bought (self-paced: every lesson open), and the
// public catalog — courses teachers put on sale.
export function Catalog() {
  const { state } = useStore();
  const navigate = useNavigate();
  const paid = new Set(state.purchases.filter((p) => p.status === "paid").map((p) => p.courseId));
  const mine = state.courses.filter((c) => paid.has(c.id));
  const forSale = state.courses.filter((c) => c.sale?.forSale && !paid.has(c.id));
  return (
    <Page>
      <PageHeader title="Courses" sub="Courses you bought, and ones you can buy to study at your own pace." />
      {mine.length > 0 && (
        <>
          <SectionLabel>My courses</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {mine.map((course) => {
              const lessons = lessonsOf(state, course.id);
              const done = lessons.filter((l) => finishedLesson(state, course.id, l.id)).length;
              return (
                <CourseCard key={course.id} icon={IconBook2} tone={toneOf(course)} title={course.title}
                  creatorLabel="Teacher" creatorName={teacherName(state, course.teacherId)} category={`${course.level} · self-paced`}
                  stats={[{ icon: IconBook2, value: `${lessons.length} lessons` }, { icon: IconCircleCheck, value: `${done} finished` }]}
                  progressPct={lessons.length ? Math.round((done / lessons.length) * 100) : 0}
                  onViewDetail={() => navigate(`/courses/${course.id}`)} />
              );
            })}
          </div>
        </>
      )}
      <SectionLabel>Available to buy</SectionLabel>
      {forSale.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forSale.map((course) => {
            const pending = purchaseOf(state, course.id)?.status === "requested";
            return (
              <CourseCard key={course.id} icon={IconBook2} tone={toneOf(course)} title={course.title}
                creatorLabel="Teacher" creatorName={teacherName(state, course.teacherId)}
                category={pending ? "Payment waiting for your teacher to confirm" : course.sale.description || course.level}
                stats={[{ icon: IconReceipt, value: price(course.sale) }, { icon: IconBook2, value: `${lessonsOf(state, course.id).length} lessons` }]}
                onViewDetail={() => navigate(`/courses/${course.id}`)} />
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-neutral-600">No courses on sale right now.</Card>
      )}
    </Page>
  );
}

// One course: bought — its lessons, all open; not bought — what's in it,
// the price, and "Request to buy" (the teacher's payment note, then
// REQUEST_PURCHASE; the teacher confirms it by hand).
export function CoursePage() {
  const { courseId } = useParams();
  const { state, dispatch, toast } = useStore();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");
  const course = courseOf(state, courseId);
  const crumbs = [{ label: "Courses", onClick: () => navigate("/courses") }, { label: course?.title || "Course" }];
  if (!course) {
    return <Page><Breadcrumbs items={crumbs} /><Alert tone="info" title="This course isn't available">It may have been taken off sale.</Alert></Page>;
  }
  const lessons = lessonsOf(state, course.id);
  const purchase = purchaseOf(state, course.id);
  const paid = purchase?.status === "paid";
  const pending = purchase?.status === "requested";
  const teacher = teacherName(state, course.teacherId);
  const inClass = myClasses(state).find((c) => c.courses.some((x) => x.courseId === course.id));
  const done = lessons.filter((l) => finishedLesson(state, course.id, l.id)).length;

  const request = () => {
    dispatch({ type: "REQUEST_PURCHASE", courseId: course.id, studentId: state.me.id, message });
    toast(`Request sent — ${teacher.split(" ")[0]} will confirm once you've paid`);
    setBuying(false);
    setMessage("");
  };

  return (
    <Page>
      <Breadcrumbs items={crumbs} />
      <PageHeader title={course.title} sub={`${course.level} · by ${teacher} · ${lessons.length} lessons`}
        right={!paid && !pending && course.sale?.forSale && (
          <Button onClick={() => setBuying(true)}><IconShoppingCart size={16} stroke={1.75} /> Request to buy · {price(course.sale)}</Button>
        )} />

      <div className="space-y-3 mb-6">
        {pending && (
          <Alert tone="pending" icon={IconClock} title={`Waiting for ${teacher} to confirm your payment`}>
            You asked {timeAgo(purchase.requestedAt)}. {course.sale?.paymentNote || "Your teacher will tell you how to pay."} Every lesson opens here once it's confirmed.
          </Alert>
        )}
        {inClass && !paid && (
          <Alert tone="info" icon={IconSchool} title={`You're taking this course in ${inClass.name}`}
            actionLabel="Go to the class" onAction={() => navigate(`/classes/${inClass.id}`)}>
            Its lessons open there as {teacher.split(" ")[0]} shares them with the class.
          </Alert>
        )}
      </div>

      {paid ? (
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-neutral-400">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <span className="text-sm text-neutral-700"><b className="text-neutral-950">{done} of {lessons.length}</b> lessons finished · self-paced</span>
            </div>
            <SegmentedBar pct={lessons.length ? Math.round((done / lessons.length) * 100) : 0} cells={Math.max(lessons.length, 1)} />
          </div>
          <div className="divide-y divide-neutral-400">
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} status="self" open finished={finishedLesson(state, course.id, l.id)}
                onOpen={() => navigate(`/courses/${course.id}/lessons/${l.id}`)} />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {course.sale?.description && <p className="p-5 border-b border-neutral-400 text-sm text-neutral-800">{course.sale.description}</p>}
          <div className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">What's inside</div>
          <div className="divide-y divide-neutral-400">
            {lessons.map((l) => <LessonRow key={l.id} lesson={l} status="self" open={false} />)}
          </div>
        </Card>
      )}

      <Modal open={buying} onClose={() => setBuying(false)} icon={IconShoppingCart} title={`Buy ${course.title}`} sub={`${price(course.sale || { price: 0, currency: "" })} · from ${teacher}`}
        footer={<>
          <Button variant="outline" onClick={() => setBuying(false)}>Cancel</Button>
          <Button onClick={request}>Send request</Button>
        </>}>
        <div className="space-y-4">
          <Alert tone="info" icon={IconReceipt} title="How to pay">{course.sale?.paymentNote || "Your teacher will tell you how to pay."}</Alert>
          <Field label="Message to your teacher (optional)">
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Paid by card today, Rashad Aliyev" />
          </Field>
          <p className="text-sm text-neutral-600">Once {teacher.split(" ")[0]} confirms your payment, every lesson opens here and you go at your own pace.</p>
        </div>
      </Modal>
    </Page>
  );
}
