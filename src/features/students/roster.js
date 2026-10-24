// Every student the teacher has any relationship with — in a class now,
// asking to join or buy, former, a customer or blocked — once each, in that
// order. What "your students" means for a picker like a class's "+".
export function rosterStudents(roster) {
  const all = [
    ...roster.active,
    ...roster.requests.map((r) => r.student),
    ...roster.former.map((f) => f.student),
    ...roster.customers.map((c) => c.student),
    ...roster.blocked,
  ];
  return all.filter((s, i) => s && all.findIndex((x) => x?.id === s.id) === i);
}
