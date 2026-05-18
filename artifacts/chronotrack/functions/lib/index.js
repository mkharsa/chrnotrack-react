"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUsers = void 0;
const admin = require("firebase-admin");
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const ADMIN_SECRET = "aboudi";
exports.getAuthUsers = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    if (((_a = request.data) === null || _a === void 0 ? void 0 : _a.secret) !== ADMIN_SECRET) {
        throw new https_1.HttpsError("permission-denied", "Unauthorized");
    }
    const users = [];
    let pageToken;
    do {
        const result = await admin.auth().listUsers(1000, pageToken);
        for (const u of result.users) {
            const providerInfo = (_b = u.providerData) === null || _b === void 0 ? void 0 : _b[0];
            const provider = (_c = providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.providerId) !== null && _c !== void 0 ? _c : "anonymous";
            // Top-level fields first, then fall back to providerData
            const email = (_e = (_d = u.email) !== null && _d !== void 0 ? _d : providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.email) !== null && _e !== void 0 ? _e : null;
            const displayName = (_g = (_f = u.displayName) !== null && _f !== void 0 ? _f : providerInfo === null || providerInfo === void 0 ? void 0 : providerInfo.displayName) !== null && _g !== void 0 ? _g : null;
            users.push({
                uid: u.uid,
                email,
                displayName,
                provider,
                createdAt: (_h = u.metadata.creationTime) !== null && _h !== void 0 ? _h : null,
                lastSignIn: (_j = u.metadata.lastSignInTime) !== null && _j !== void 0 ? _j : null,
            });
        }
        pageToken = result.pageToken;
    } while (pageToken);
    return { users };
});
//# sourceMappingURL=index.js.map