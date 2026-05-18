import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

const ADMIN_SECRET = "aboudi";

export const getAuthUsers = onCall({ cors: true }, async (request) => {
  if (request.data?.secret !== ADMIN_SECRET) {
    throw new HttpsError("permission-denied", "Unauthorized");
  }

  const users: {
    uid: string;
    email: string | null;
    displayName: string | null;
    provider: string | null;
    createdAt: string | null;
    lastSignIn: string | null;
  }[] = [];

  let pageToken: string | undefined;
  do {
    const result = await admin.auth().listUsers(1000, pageToken);
    for (const u of result.users) {
      const providerInfo = u.providerData?.[0];
      const provider = providerInfo?.providerId ?? "anonymous";
      // Top-level fields first, then fall back to providerData
      const email = u.email ?? providerInfo?.email ?? null;
      const displayName = u.displayName ?? providerInfo?.displayName ?? null;
      users.push({
        uid: u.uid,
        email,
        displayName,
        provider,
        createdAt: u.metadata.creationTime ?? null,
        lastSignIn: u.metadata.lastSignInTime ?? null,
      });
    }
    pageToken = result.pageToken;
  } while (pageToken);

  return { users };
});
