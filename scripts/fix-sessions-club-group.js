/**
 * Script navigateur — Lier club/groupe des plans d'entraînement aux sessions
 * ============================================================================
 * À coller dans la console du navigateur PENDANT que tu es connecté à l'app
 * (onglet ouvert sur https://ton-app/)
 *
 * Ce qu'il fait :
 *  1. Lit tous tes plans d'entraînement (collection "training")
 *  2. Pour chaque exercice chrono qui a un sessionId :
 *       → met à jour la session avec le club ET le groupe du plan
 *       → seulement si la session n'a pas déjà un club OU un groupe défini
 *  3. Affiche un rapport détaillé dans la console
 *
 * Mode DRY-RUN (simulation) par défaut → aucune écriture tant que
 * tu n'as pas mis DRY_RUN = false.
 */

(async () => {
  // ── CONFIG ────────────────────────────────────────────────────────────────
  const DRY_RUN = true;   // ← passe à false pour écrire réellement en base

  // ── Récupère Firebase depuis l'app déjà chargée ──────────────────────────
  const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js");
  const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } =
    await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js");
  const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js");

  const firebaseConfig = {
    apiKey: "AIzaSyASeqLubTgHZxmzvCkNg7nwTFIZOh4sMCA",
    authDomain: "chronotrack-8c563.firebaseapp.com",
    projectId: "chronotrack-8c563",
    storageBucket: "chronotrack-8c563.firebasestorage.app",
    messagingSenderId: "515465540862",
    appId: "1:515465540862:web:1723c4fc0f87e04e87e1af",
  };

  const app = getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

  const db = getFirestore(app);
  const auth = getAuth(app);

  // ── Vérifie que l'utilisateur est connecté ────────────────────────────────
  const user = auth.currentUser;
  if (!user) {
    console.error("❌ Pas d'utilisateur connecté. Connecte-toi d'abord dans l'app.");
    return;
  }
  const uid = user.uid;
  console.log(`✅ Connecté en tant que : ${user.email} (uid: ${uid})`);
  console.log(DRY_RUN ? "🔵 MODE SIMULATION — aucune écriture" : "🟠 MODE ÉCRITURE RÉELLE");
  console.log("─".repeat(60));

  // ── Lecture des plans d'entraînement ──────────────────────────────────────
  const trainingSnap = await getDocs(collection(db, "users", uid, "training"));
  const plans = trainingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`📋 ${plans.length} plan(s) d'entraînement trouvés`);

  // ── Construction de la map sessionId → { club, group, planTitle } ─────────
  const sessionMap = new Map(); // sessionId → { club, group, planTitle }

  for (const plan of plans) {
    const club = plan.club ?? null;
    const group = plan.group ?? null;
    if (!club && !group) continue; // plan sans club/groupe → rien à propager

    for (const ex of (plan.exercises ?? [])) {
      if (!ex.sessionId) continue;
      sessionMap.set(ex.sessionId, {
        club,
        group,
        planTitle: plan.title,
        exerciseName: ex.name,
      });
    }
  }

  console.log(`🔗 ${sessionMap.size} session(s) liée(s) à un plan avec club/groupe`);
  console.log("─".repeat(60));

  // ── Mise à jour des sessions ──────────────────────────────────────────────
  let updated = 0;
  let skipped = 0;
  let alreadySet = 0;

  for (const [sessionId, { club, group, planTitle, exerciseName }] of sessionMap) {
    const sessionRef = doc(db, "users", uid, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      console.warn(`  ⚠️  Session introuvable : ${sessionId}`);
      skipped++;
      continue;
    }

    const data = sessionSnap.data();
    const existingClub = data.club ?? null;
    const existingGroup = data.group ?? null;

    // Ne touche pas une session qui a déjà un club ET un groupe
    if (existingClub && existingGroup) {
      console.log(`  ⏭  "${data.name}" — déjà renseignée (club: ${existingClub}, groupe: ${existingGroup})`);
      alreadySet++;
      continue;
    }

    const patch = {
      club: existingClub ?? club,
      group: existingGroup ?? group,
    };

    console.log(
      `  ${DRY_RUN ? "🔵 [simulation]" : "✏️  [écriture]"}` +
      ` "${data.name}"` +
      ` ← club: "${patch.club ?? "—"}", groupe: "${patch.group ?? "—"}"` +
      ` (depuis plan: "${planTitle} — ${exerciseName}")`
    );

    if (!DRY_RUN) {
      await updateDoc(sessionRef, patch);
    }
    updated++;
  }

  // ── Rapport final ─────────────────────────────────────────────────────────
  console.log("─".repeat(60));
  console.log(`📊 Rapport :`);
  console.log(`   ✅ ${updated} session(s) ${DRY_RUN ? "à mettre à jour" : "mises à jour"}`);
  console.log(`   ⏭  ${alreadySet} session(s) déjà complètes (ignorées)`);
  console.log(`   ⚠️  ${skipped} session(s) introuvables`);

  if (DRY_RUN && updated > 0) {
    console.log("\n💡 Pour appliquer les changements, mets DRY_RUN = false et relance le script.");
  } else if (!DRY_RUN) {
    console.log("\n✅ Toutes les sessions ont été mises à jour !");
  }
})();
