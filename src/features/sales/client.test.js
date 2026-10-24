import { describe, expect, it } from "vitest";
import { mockDb } from "../../test/mockDb.js";
import { recordingApi } from "../../test/recordingApi.js";
import { createHttpSalesClient, createMockSalesClient } from "./client.js";

// Seed: Everyday English (29 AZN), IELTS Speaking (49 AZN) and Kamal's
// Business English (39 AZN) are for sale; IT English isn't. Murad's request
// to buy IELTS (pu_2) waits; Zeynab bought Everyday English. Rashad has
// bought nothing.
const purchaseOf = (purchases, studentId, courseId) => purchases.find((p) => p.studentId === studentId && p.courseId === courseId);

describe("sales — mock client", () => {
  it("the catalog: courses for sale, each with its teacher, lesson count and the student's own purchase", async () => {
    const db = mockDb();
    const catalog = await createMockSalesClient(db.as("s_zeynab")).catalog();
    expect(catalog.map((c) => [c.id, c.teacher.name, c.lessonCount])).toEqual([
      ["every", "Maria Carey", 5], ["ielts", "Maria Carey", 2], ["biz", "Kamal Mammadov", 1],
    ]);
    expect(catalog.find((c) => c.id === "every").purchase).toMatchObject({ status: "paid" });
    expect(catalog.find((c) => c.id === "ielts").purchase).toBeNull();
  });

  it("a request to buy copies the price; asking twice changes nothing", async () => {
    const db = mockDb();
    const rashad = createMockSalesClient(db.as("s_rashad"));
    await rashad.requestPurchase("ielts", "Paid by card today");
    await rashad.requestPurchase("ielts", "again");
    const mine = await rashad.myPurchases();
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ courseId: "ielts", status: "requested", amount: 49, currency: "AZN", method: "external", message: "Paid by card today" });
  });

  it("only a course on sale can be asked for", async () => {
    const rashad = createMockSalesClient(mockDb().as("s_rashad"));
    await rashad.requestPurchase("it");
    expect(await rashad.myPurchases()).toEqual([]);
  });

  it("the teacher confirms a payment (the student owns it) or declines it", async () => {
    const db = mockDb();
    const teacher = createMockSalesClient(db);
    await teacher.decidePurchase("pu_2", "paid");
    expect(purchaseOf(db.raw().purchases, "s_murad", "ielts")).toMatchObject({ status: "paid", confirmedBy: "t_maria", paidAt: expect.any(String) });

    const db2 = mockDb();
    await createMockSalesClient(db2).decidePurchase("pu_2", "declined");
    expect(purchaseOf(db2.raw().purchases, "s_murad", "ielts").status).toBe("declined");
  });

  it("the catalog outlines each course's lessons — titles only", async () => {
    const catalog = await createMockSalesClient(mockDb().as("s_rashad")).catalog();
    const ielts = catalog.find((c) => c.id === "ielts");
    expect(ielts.lessons.map((l) => l.n)).toEqual([1, 2]);
    expect(Object.keys(ielts.lessons[0]).sort()).toEqual(["id", "n", "title"]);
  });

  it("a student's purchases, newest first, each naming its course and teacher", async () => {
    const db = mockDb();
    const zeynab = createMockSalesClient(db.as("s_zeynab"));
    await zeynab.requestPurchase("ielts", "");
    const purchases = await zeynab.myPurchases();
    expect(purchases.map((p) => [p.course.title, p.teacher.name, p.status])).toEqual([
      ["IELTS Speaking", "Maria Carey", "requested"], ["Everyday English", "Maria Carey", "paid"],
    ]);
  });
});

describe("sales — HTTP client (docs/openapi.yaml: Sales, Student app)", () => {
  it("calls the purchase and catalog endpoints", async () => {
    const { api, calls } = recordingApi();
    const client = createHttpSalesClient(api);
    await client.decidePurchase("p1", "paid");
    await client.catalog();
    await client.myPurchases();
    await client.requestPurchase("ielts", "Paid today");
    expect(calls).toEqual([
      { method: "PATCH", path: "/purchases/p1", body: { status: "paid" } },
      { method: "GET", path: "/catalog/courses" },
      { method: "GET", path: "/me/purchases" },
      { method: "POST", path: "/courses/ielts/purchases", body: { message: "Paid today" } },
    ]);
  });
});
