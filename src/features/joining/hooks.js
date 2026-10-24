import { useMemo } from "react";
import { useMockSource } from "../../db/useMockSource.js";
import { useLoad } from "../../useLoad.js";
import { createMockJoiningClient } from "./client.js";

/* The student app's door to getting into a class: a class link's preview
   and "Request to join", and the email invites waiting on Home. */

// Which client answers, and when to ask again (see notes/hooks.js). For the
// real backend, build createHttpJoiningClient(api) here.
function useJoiningSource() {
  const { source, revision } = useMockSource((s) => [s.joinPreviews, s.invitations, s.classes, s.memberships]);
  const client = useMemo(() => createMockJoiningClient(source), [source]);
  return { client, revision };
}

// What a class link shows, and asking to join through it. `preview` is null
// for a link that doesn't work (or no link).
export function useJoinPreview(token) {
  const { client, revision } = useJoiningSource();
  const { data, loading } = useLoad(() => (token ? client.preview(token) : Promise.resolve(null)), token || "none", revision);
  const requestToJoin = useMemo(() => (message) => client.requestToJoin(token, message), [client, token]);
  return { preview: data || null, loading, requestToJoin };
}

// Email invites waiting for them, and accepting one.
export function useMyInvitations() {
  const { client, revision } = useJoiningSource();
  const { data, loading } = useLoad(() => client.myInvitations(), "mine", revision);
  const invitations = useMemo(() => data || [], [data]);
  const accept = useMemo(() => (invitationId) => client.acceptInvitation(invitationId), [client]);
  return { invitations, loading, accept };
}
