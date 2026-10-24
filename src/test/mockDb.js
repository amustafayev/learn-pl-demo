import { createInitialState, reducer, studentView, teacherView } from "../db/mockDb.jsx";

/* The mock db for unit tests of a feature's mock client: the real seed data
   and reducer, behind the same { getState, dispatch } pair StoreProvider
   hands a client. getState returns what the signed-in user's API would —
   the teacher's slice, or with .as(studentId) a student's.

     const db = mockDb();
     const teacher = createMockNotesClient(db);
     const rashad = createMockNotesClient(db.as("s_rashad"));

   Every call starts from a fresh copy of the seed. Delete this file with
   the mock db once the real backend is in. */
export function mockDb() {
  let db = createInitialState();
  const dispatch = (action) => { db = reducer(db, action); };
  const as = (who) => ({
    getState: () => (who === "teacher" ? teacherView(db) : studentView(db, who)),
    dispatch,
  });
  return { ...as("teacher"), as, raw: () => db };
}
