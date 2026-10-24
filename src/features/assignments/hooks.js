import { useMemo } from "react";
import { copyWithOwnH5P } from "../../store.jsx";
import { useMockSource } from "../../db/useMockSource.js";
import { useToast } from "../../toasts.jsx";
import { useLoad } from "../../useLoad.js";
import { createMockAssignmentsClient } from "./client.js";

/* The UI's one door to assigned work: the Assign dialogs (a student's page,
   the Library), withdrawing it, and the student app's My work. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpAssignmentsClient(api) here.
function useAssignmentsSource() {
  const { source, revision } = useMockSource((s) => [s.assignments]);
  const client = useMemo(() => createMockAssignmentsClient(source), [source]);
  return { client, revision };
}

// Teacher: handing work out and taking it back.
export function useWorkActions() {
  const { client } = useAssignmentsSource();
  const toast = useToast();
  return useMemo(() => ({
    // A block or task is snapshotted first, with its own H5P content, so the
    // student keeps exactly what they were given. Resolves false if the H5P
    // copy failed (the teacher was already told). `toWhom` ends the toast.
    async assign(studentIds, item, toWhom) {
      const content = item.content ? await copyWithOwnH5P(toast, item.content) : null;
      if (item.content && !content) return false;
      await client.assign(studentIds, { ...item, content });
      toast(`Assigned “${item.title}” to ${toWhom}`);
      return true;
    },
    withdraw: (assignmentId) => client.withdraw(assignmentId),
  }), [client, toast]);
}

// Teacher: everything assigned to one student, newest first.
export function useStudentWork(studentId) {
  const { client, revision } = useAssignmentsSource();
  const { data } = useLoad(() => (studentId ? client.forStudent(studentId) : Promise.resolve([])), studentId || "none", revision);
  const assignments = useMemo(() => data || [], [data]);
  return { assignments };
}

// Student: their work — open (to do) and done — and finishing one. `stale`
// is true until the list reflects the latest data (for code comparing old
// and new lists).
export function useMyWork() {
  const { client, revision } = useAssignmentsSource();
  const { data, loading, stale } = useLoad(() => client.mine(), "mine", revision);
  return useMemo(() => {
    const work = data || [];
    return {
      work,
      open: work.filter((a) => a.status === "assigned"),
      done: work.filter((a) => a.status === "done"),
      loading,
      stale,
      complete: (assignmentId) => client.complete(assignmentId),
    };
  }, [data, loading, stale, client]);
}
