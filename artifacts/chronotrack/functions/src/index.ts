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
      const provider = u.providerData?.[0]?.providerId ?? null;
      users.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        provider,
        createdAt: u.metadata.creationTime ?? null,
        lastSignIn: u.metadata.lastSignInTime ?? null,
      });
    }
    pageToken = result.pageToken;
  } while (pageToken);

  return { users };
});
