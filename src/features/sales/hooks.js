import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockSalesClient } from "./client.js";

/* The UI's one door to buying and selling courses: confirming a purchase
   (request rows, a course's Customers) and, in the student app, the
   catalog and "Request to buy". */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpSalesClient(api) here.
function useSalesSource() {
  const { source, revision, synced } = useMockSource((s) => [s.purchases, s.courses, s.lessons, s.teachers]);
  const client = useMemo(() => createMockSalesClient(source), [source]);
  return { client, revision, synced };
}

// Confirming or declining a purchase (teacher), and asking to buy (student).
export function useSalesActions() {
  const { client } = useSalesSource();
  return useMemo(() => ({
    decidePurchase: (purchaseId, status) => client.decidePurchase(purchaseId, status),
    requestPurchase: (courseId, message) => client.requestPurchase(courseId, message),
  }), [client]);
}

// Student: the courses on sale, each with its teacher and their own purchase.
export function useCatalog() {
  const { client, revision } = useSalesSource();
  const { data, loading } = useLoad(() => client.catalog(), "catalog", revision);
  const courses = useMemo(() => data || [], [data]);
  return { courses, loading };
}

// Student: every purchase of theirs, newest first. `stale` is true until
// the list reflects the latest data (for code comparing old and new lists).
export function useMyPurchases() {
  const { client, revision, synced } = useSalesSource();
  const { data, loading, stale } = useLoad(() => client.myPurchases(), "mine", revision);
  const purchases = useMemo(() => data || [], [data]);
  return { purchases, loading, stale: stale || !synced };
}
