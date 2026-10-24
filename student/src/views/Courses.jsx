import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IconBook2, IconCircleCheck, IconClock, IconReceipt, IconSchool, IconShoppingCart } from "@tabler/icons-react";
import { Alert, Breadcrumbs, Button, Card, CourseCard, Field, Modal, Page, PageHeader, SectionLabel, SegmentedBar, TextArea } from "@app/design-system.jsx";
import { timeAgo } from "@app/format.js";
import { useToast } from "@app/toasts.jsx";
import { useMyClasses, useMyCourses } from "@app/features/learning/index.js";
import { useCatalog, useMyPurchases, useSalesActions } from "@app/features/sales/index.js";
import { finishedPct, teacherName, toneOf } from "../lib.js";
import LessonRow from "../components/LessonRow.jsx";

const price = (sale) => `${sale.price} ${sale.currency}`;

// Courses the student bought (self-paced: every lesson open), and the
// public catalog — courses teachers put on sale.
export function Catalog() {
  const navigate = useNavigate();
  const { courses } = useMyCourses();
  const { courses: catalog } = useCatalog();
  const mine = courses.filter((c) => c.access !== "class");
  const forSale = catalog.filter((c) => c.purchase?.status !== "paid");
  return (
    <Page>
      <PageHeader title="Courses" sub="Courses you bought, and ones you can buy to study at your own pace." />
      {mine.length > 0 && (
        <>
          <SectionLabel>My courses</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {mine.map((course) => (
              <CourseCard key={course.id} icon={IconBook2} tone={toneOf(course)} title={course.title}
                creatorLabel="Teacher" creatorName={teacherName(course.teacher)} category={`${course.level} · self-paced`}
                stats={[{ icon: IconBook2, value: `${course.lessonCount} lessons` }, { icon: IconCircleCheck, value: `${course.completedLessons} finished` }]}
                progressPct={finishedPct(course.completedLessons, course.lessonCount)}
                onViewDetail={() => navigate(`/courses/${course.id}`)} />
            ))}
          </div>
        </>
      )}
      <SectionLabel>Available to buy</SectionLabel>
      {forSale.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forSale.map((course) => {
            const pending = course.purchase?.status === "requested";
            return (
              <CourseCard key={course.id} icon={IconBook2} tone={toneOf(course)} title={course.title}
                creatorLabel="Teacher" creatorName={teacherName(course.teacher)}
                category={pending ? "Payment waiting for your teacher to confirm" : course.sale.description || course.level}
                stats={[{ icon: IconReceipt, value: price(course.sale) }, { icon: IconBook2, value: `${course.lessonCount} lessons` }]}
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
// the price, and "Request to buy" (the teacher's payment note, then a
// purchase request; the teacher confirms it by hand). A course they can
// reach is in useMyCourses; one on sale, in the catalog.
export function CoursePage() {
  const { courseId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState("");
  const { courses, loading: coursesLoading } = useMyCourses();
  const { courses: catalog, loading: catalogLoading } = useCatalog();
  const { purchases } = useMyPurchases();
  const { active: classes } = useMyClasses();
  const { requestPurchase } = useSalesActions();
  const mine = courses.find((c) => c.id === courseId);
  const onSale = catalog.find((c) => c.id === courseId);
  const course = mine || onSale;
  const crumbs = [{ label: "Courses", onClick: () => navigate("/courses") }, { label: course?.title || "Course" }];
  if (coursesLoading || catalogLoading) return null;
  if (!course) {
    return <Page><Breadcrumbs items={crumbs} /><Alert tone="info" title="This course isn't available">It may have been taken off sale.</Alert></Page>;
  }
  const lessons = mine?.lessons || onSale?.lessons || [];
  // Their latest purchase of it (newest first; they may ask again after a decline).
  const purchase = purchases.find((p) => p.courseId === course.id) || null;
  const paid = purchase?.status === "paid";
  const pending = purchase?.status === "requested";
  const teacher = teacherName(course.teacher);
  const inClass = classes.find((c) => c.courses.some((x) => x.courseId === course.id));
  const done = lessons.filter((l) => l.finished).length;
  // The sale settings come with the catalog; a course taken off sale has none.
  const sale = onSale?.sale || null;

  const request = async () => {
    await requestPurchase(course.id, message);
    toast(`Request sent — ${teacher.split(" ")[0]} will confirm once you've paid`);
    setBuying(false);
    setMessage("");
  };

  return (
    <Page>
      <Breadcrumbs items={crumbs} />
      <PageHeader title={course.title} sub={`${course.level} · by ${teacher} · ${lessons.length} lessons`}
        right={!paid && !pending && sale?.forSale && (
          <Button onClick={() => setBuying(true)}><IconShoppingCart size={16} stroke={1.75} /> Request to buy · {price(sale)}</Button>
        )} />

      <div className="space-y-3 mb-6">
        {pending && (
          <Alert tone="pending" icon={IconClock} title={`Waiting for ${teacher} to confirm your payment`}>
            You asked {timeAgo(purchase.requestedAt)}. {sale?.paymentNote || "Your teacher will tell you how to pay."} Every lesson opens here once it's confirmed.
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
            <SegmentedBar pct={finishedPct(done, lessons.length)} cells={Math.max(lessons.length, 1)} />
          </div>
          <div className="divide-y divide-neutral-400">
            {lessons.map((l) => (
              <LessonRow key={l.id} lesson={l} status="self" open finished={l.finished}
                onOpen={() => navigate(`/courses/${course.id}/lessons/${l.id}`)} />
            ))}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {sale?.description && <p className="p-5 border-b border-neutral-400 text-sm text-neutral-800">{sale.description}</p>}
          <div className="px-5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">What's inside</div>
          <div className="divide-y divide-neutral-400">
            {lessons.map((l) => <LessonRow key={l.id} lesson={l} status="self" open={false} />)}
          </div>
        </Card>
      )}

      <Modal open={buying} onClose={() => setBuying(false)} icon={IconShoppingCart} title={`Buy ${course.title}`} sub={`${price(sale || { price: 0, currency: "" })} · from ${teacher}`}
        footer={<>
          <Button variant="outline" onClick={() => setBuying(false)}>Cancel</Button>
          <Button onClick={request}>Send request</Button>
        </>}>
        <div className="space-y-4">
          <Alert tone="info" icon={IconReceipt} title="How to pay">{sale?.paymentNote || "Your teacher will tell you how to pay."}</Alert>
          <Field label="Message to your teacher (optional)">
            <TextArea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Paid by card today, Rashad Aliyev" />
          </Field>
          <p className="text-sm text-neutral-600">Once {teacher.split(" ")[0]} confirms your payment, every lesson opens here and you go at your own pace.</p>
        </div>
      </Modal>
    </Page>
  );
}
