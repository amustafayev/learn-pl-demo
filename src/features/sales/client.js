/* Sales API — a course sold on its own (self-paced). The student asks to
   buy and pays the teacher outside the app; the teacher confirms it, and
   every lesson opens. A course's sale settings are the courses feature's;
   who bought what shows in the students feature's roster (customers,
   requests). The UI only talks to a client below, through ./hooks.js —
   never to `state.purchases` or reducer actions.

   Contract (every method resolves; failures reject with an ApiError):
     Teacher
       decidePurchase(purchaseId, status)  -> void   paid ("Mark paid & give access") | declined
     Student
       catalog()                           -> CatalogCourse[]   courses for sale, each with
                                              `teacher: { id, name }`, `lessonCount`, its
                                              outline `lessons: [{ id, n, title }]` and
                                              `purchase` (the caller's latest, or null)
       myPurchases()                       -> Purchase[]   newest first, each with
                                              `course: { id, title }` and `teacher: { id, name }`
       requestPurchase(courseId, message)  -> void   a paid or pending one already there: nothing
   (docs/openapi.yaml: Sales, Student app.)

   Two implementations of that contract:
     createMockSalesClient — on the in-browser mock db; what the app uses today
     createHttpSalesClient — the REST calls in docs/openapi.yaml, on
                             db/apiClient.js; not wired in yet */

// The student's latest purchase of a course (they may ask again after a decline).
const latestPurchase = (purchases, courseId) =>
  purchases.filter((p) => p.courseId === courseId).sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1))[0] || null;

const teacherRef = (state, id) => {
  const t = (state.teachers || []).find((x) => x.id === id);
  return t ? { id: t.id, name: t.name } : null;
};

// `source` is db/useMockSource.js's: getState, dispatch, waitFor.
export function createMockSalesClient({ getState, dispatch }) {
  return {
    async decidePurchase(purchaseId, status) { dispatch({ type: "DECIDE_PURCHASE", purchaseId, status }); },
    async catalog() {
      const state = getState();
      return state.courses.filter((c) => c.sale?.forSale).map((c) => {
        const lessons = (state.lessons[c.id] || []).map((l) => ({ id: l.id, n: l.n, title: l.title }));
        return { ...c, lessons, lessonCount: lessons.length, teacher: teacherRef(state, c.teacherId), purchase: latestPurchase(state.purchases || [], c.id) };
      });
    },
    async myPurchases() {
      const state = getState();
      return [...(state.purchases || [])].sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1)).map((p) => {
        const course = state.courses.find((c) => c.id === p.courseId);
        return { ...p, course: course ? { id: course.id, title: course.title } : null, teacher: teacherRef(state, course?.teacherId) };
      });
    },
    async requestPurchase(courseId, message = "") {
      dispatch({ type: "REQUEST_PURCHASE", courseId, studentId: getState().me.id, message });
    },
  };
}

// Same contract over HTTP (see docs/openapi.yaml). `api` is createApiClient().
export function createHttpSalesClient(api) {
  const done = () => {};
  return {
    decidePurchase: (purchaseId, status) => api.patch(`/purchases/${purchaseId}`, { status }).then(done),
    catalog: () => api.get("/catalog/courses"),
    myPurchases: () => api.get("/me/purchases"),
    requestPurchase: (courseId, message = "") => api.post(`/courses/${courseId}/purchases`, { message }).then(done),
  };
}
