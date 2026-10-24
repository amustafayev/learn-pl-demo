import { createInitialState, reducer, studentView, teacherView } from "../db/mockDb.jsx";

/* The mock db for unit tests of a feature's mock client: the real seed data
   and reducer, behind the same { getState, dispatch, waitFor } source the
   app gives a client (db/useMockSource.js). getState returns what the
   signed-in user's API would — the teacher's slice, with .as(studentId) a
   student's, with .as(null) a signed-out visitor's.

     const db = mockDb();
     const teacher = createMockNotesClient(db);
     const rashad = createMockNotesClient(db.as("s_rashad"));

   Every call starts from a fresh copy of the seed. Delete this file with
   the mock db once the real backend is in. */
export function mockDb() {
  let db = createInitialState();
  const dispatch = (action) => { db = reducer(db, action); };
  const as = (who) => {
    const getState = () => (who === "teacher" ? teacherView(db) : studentView(db, who));
    // Writes apply at once here, so whatever a write made is already there.
    const waitFor = async (test) => {
      if (test(getState())) return getState();
      throw new Error("waitFor: the write didn't produce what was expected");
    };
    return { getState, dispatch, waitFor };
  };
  return { ...as("teacher"), as, raw: () => db };
}
