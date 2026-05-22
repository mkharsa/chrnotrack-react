export const fr = {
  // Common
  cancel: "Annuler",
  save: "Enregistrer",
  delete: "Supprimer",
  add: "Ajouter",
  edit: "Modifier",
  create: "Créer",
  close: "Fermer",
  loading: "Chargement…",
  error: "Erreur",
  select: "Sélectionner",
  selectAll: "Tout sélectionner",
  deselect: "Annuler",
  today: "Aujourd'hui",
  day: "Jour",
  month: "Mois",
  or: "ou",

  // Layout / Nav
  appName: "ChronoTrack",
  navTraining: "Entraînement",
  navSessions: "Sessions",
  navChrono: "Chrono",
  navAthletes: "Athlètes",
  navCalendar: "Calendrier",
  navProgression: "Progression",
  logout: "Se déconnecter",

  // Sessions page
  sessionsTitle: "Sessions",
  newSession: "NOUVELLE SESSION",
  listView: "Liste",
  calendarView: "Calendrier",
  noSessions: "Aucune session",
  noSessionsHint: "Créez votre première session d'entraînement.",
  createSession: "Créer une session",
  sessionName: "Nom de la session (ex : 10x400m)",
  sessionDate: "Date",
  athletes: "Athlètes",
  noAthletes: "Aucun athlète. Ajoutez-en ci-dessous.",
  newAthleteName: "Nouveau nom d'athlète...",
  createAndStart: "Créer et démarrer",
  exportPdf: "Exporter PDF",
  athlete: "athlète",
  athletes_plural: "athlètes",
  sessionClub: "Club (optionnel)",
  sessionGroup: "Groupe (optionnel)",
  clubPlaceholder: "Ex: Club Athlétisme Paris",
  groupPlaceholder: "Ex: U20, Elite, Seniors…",
  allClubs: "Tous les clubs",
  allGroups: "Tous les groupes",

  // Athletes page
  athletesTitle: "Athlètes",
  athleteNamePlaceholder: "Nom de l'athlète...",
  noAthletesRegistered: "Aucun athlète enregistré.",
  noAthletesHint: "Ajoutez un nom ci-dessus pour commencer.",
  noPerformance: "Aucune performance enregistrée.",
  bestLabel: "meilleur",
  worstLabel: "pire",
  triesLabel: "essai",
  triesLabel_plural: "essais",
  bulkDeleteAthletes: (n: number) => `${n} athlète${n > 1 ? "s" : ""} supprimé${n > 1 ? "s" : ""}`,
  athleteAdded: (name: string) => `Athlète "${name}" ajouté`,
  athleteDeleted: (name: string) => `"${name}" supprimé`,
  athleteRenamed: (name: string) => `Renommé en "${name}"`,

  // Chrono page
  distLabel: "Dist :",
  distUnit: "m",
  resetLabel: "Reset",
  addAthlete: "Ajouter",
  chronoSession: "Chrono session",
  chronoActive: "CHRONO ACTIF",
  startLabel: "START",
  stopLabel: "STOP",
  repLabel: (n: number) => `Rép ${n}`,
  nAthletes: (n: number) => `${n} athlète${n > 1 ? "s" : ""}`,
  nSelected: (n: number) => `${n} sélectionné${n > 1 ? "s" : ""}`,
  startN: (n: number) => `Démarrer (${n})`,
  stopN: (n: number) => `Arrêter (${n})`,
  noAthleteInSession: "Aucun athlète dans cette session.",
  existingAthletes: "Athlètes existants",
  newAthleteLabel: "Nouvel athlète",
  fullNamePlaceholder: "Nom complet...",
  addAthleteTitle: "Ajouter un athlète",
  addNAthletes: (n: number) => `Ajouter ${n} athlète${n > 1 ? "s" : ""}`,
  athleteAddedToSession: (name: string) => `${name} ajouté à la session`,
  athleteCreatedAndAdded: (name: string) => `${name} créé et ajouté`,
  repSaved: (rep: number, name: string, time: string) => `Rép ${rep} — ${name} : ${time}`,
  reps: (n: number) => `${n} rép${n > 1 ? "s" : ""}`,
  avg: "Moy",
  laps: (n: number) => `${n} laps`,

  // Login page
  loginSubtitle: "Connectez-vous pour accéder à vos données",
  signupSubtitle: "Créez votre compte",
  continueWithGoogle: "Continuer avec Google",
  emailPlaceholder: "Email",
  passwordPlaceholder: "Mot de passe",
  forgotPassword: "Mot de passe oublié ?",
  signin: "Se connecter",
  signup: "Créer un compte",
  noAccount: "Pas encore de compte ? ",
  alreadyAccount: "Déjà un compte ? ",
  resetPassword: "Réinitialiser le mot de passe",
  sendLink: "Envoyer le lien",
  backToLogin: "Retour à la connexion",
  resetEmailSent: "Un email de réinitialisation a été envoyé.",
  lockedMessage: (min: number) => `Trop de tentatives. Réessayez dans ${min} min.`,
  lockedButton: (min: number) => `Bloqué ${min} min`,

  // Progression page
  progressionTitle: "Progression",
  groupBySession: "Session",
  groupByMonth: "Mois",
  noProgression: "Aucune donnée de progression.",
  noPerfForDist: "Aucune performance pour cette distance.",
  periods: "Périodes",
  avgTime: "Temps moyen",
  nbSeries: "Nb séries",
  trend: "Tendance",

  // Landing page
  landingTagline: "Chronométrage sportif",
  landingCta: "Commencer gratuitement",
  landingSignin: "Se connecter",

  // Share page
  shareTitle: "Résultats de",
  shareExpired: "Ce lien de partage a expiré.",
  shareNotFound: "Partage introuvable.",
};

export type Translations = {
  // Common
  cancel: string;
  save: string;
  delete: string;
  add: string;
  edit: string;
  create: string;
  close: string;
  loading: string;
  error: string;
  select: string;
  selectAll: string;
  deselect: string;
  today: string;
  day: string;
  month: string;
  or: string;
  // Layout / Nav
  appName: string;
  navTraining: string;
  navSessions: string;
  navChrono: string;
  navAthletes: string;
  navCalendar: string;
  navProgression: string;
  logout: string;
  // Sessions page
  sessionsTitle: string;
  newSession: string;
  listView: string;
  calendarView: string;
  noSessions: string;
  noSessionsHint: string;
  createSession: string;
  sessionName: string;
  sessionDate: string;
  athletes: string;
  noAthletes: string;
  newAthleteName: string;
  createAndStart: string;
  exportPdf: string;
  athlete: string;
  athletes_plural: string;
  sessionClub: string;
  sessionGroup: string;
  clubPlaceholder: string;
  groupPlaceholder: string;
  allClubs: string;
  allGroups: string;
  // Athletes page
  athletesTitle: string;
  athleteNamePlaceholder: string;
  noAthletesRegistered: string;
  noAthletesHint: string;
  noPerformance: string;
  bestLabel: string;
  worstLabel: string;
  triesLabel: string;
  triesLabel_plural: string;
  bulkDeleteAthletes: (n: number) => string;
  athleteAdded: (name: string) => string;
  athleteDeleted: (name: string) => string;
  athleteRenamed: (name: string) => string;
  // Chrono page
  distLabel: string;
  distUnit: string;
  resetLabel: string;
  addAthlete: string;
  chronoSession: string;
  chronoActive: string;
  startLabel: string;
  stopLabel: string;
  repLabel: (n: number) => string;
  nAthletes: (n: number) => string;
  nSelected: (n: number) => string;
  startN: (n: number) => string;
  stopN: (n: number) => string;
  noAthleteInSession: string;
  existingAthletes: string;
  newAthleteLabel: string;
  fullNamePlaceholder: string;
  addAthleteTitle: string;
  addNAthletes: (n: number) => string;
  athleteAddedToSession: (name: string) => string;
  athleteCreatedAndAdded: (name: string) => string;
  repSaved: (rep: number, name: string, time: string) => string;
  reps: (n: number) => string;
  avg: string;
  laps: (n: number) => string;
  // Login page
  loginSubtitle: string;
  signupSubtitle: string;
  continueWithGoogle: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  signin: string;
  signup: string;
  noAccount: string;
  alreadyAccount: string;
  resetPassword: string;
  sendLink: string;
  backToLogin: string;
  resetEmailSent: string;
  lockedMessage: (min: number) => string;
  lockedButton: (min: number) => string;
  // Progression page
  progressionTitle: string;
  groupBySession: string;
  groupByMonth: string;
  noProgression: string;
  noPerfForDist: string;
  periods: string;
  avgTime: string;
  nbSeries: string;
  trend: string;
  // Landing page
  landingTagline: string;
  landingCta: string;
  landingSignin: string;
  // Share page
  shareTitle: string;
  shareExpired: string;
  shareNotFound: string;
};
