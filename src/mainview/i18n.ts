import { createContext, useContext } from "react";
import type { Lang } from "../shared/rpc";
import { explorerMessages } from "./explorer/messages";

const en = {
  "app.title": "SKU Manager",
  "app.settings": "Settings",
  "app.back": "Back",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.create": "Create",
  "common.error": "Error",

  "setup.title": "Welcome",
  "setup.text":
    "Choose the folder where products and the database are stored. Existing data in it is kept.",
  "setup.choose": "Choose data folder",
  "setup.chooseOther": "Choose another folder",

  "db.outdatedTitle": "Application update required",
  "db.outdatedText":
    "This database is version {db}, newer than this application ({app}). Please update the application.",
  "db.migrateTitle": "Database update",
  "db.migrateText":
    "This database is version {db} and the application is {app}. A backup copy of db.sqlite will be created in the data folder, then the database will be updated.",
  "db.migrate": "Back up and update",

  "list.search": "Search SKU, name or description…",
  "list.new": "New product",
  "list.all": "All",
  "list.empty": "No products found.",

  "product.sku": "SKU",
  "product.name": "Name",
  "product.description": "Description",
  "product.status": "Status",
  "product.created": "Created",
  "product.updated": "Updated",
  "product.history": "Status history",
  "product.edit": "Edit",
  "product.newTitle": "New product",
  "product.editTitle": "Edit product",
  "product.files": "Files",

  "status.In development": "In development",
  "status.Active": "Active",
  "status.Retired": "Retired",

  "settings.dataFolder": "Data folder",
  "settings.change": "Change…",
  "settings.versions": "Versions",
  "settings.appVersion": "Application",
  "settings.dbVersion": "Database",
  "settings.theme": "Theme",
  "settings.theme.system": "System",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.language": "Language",
  "settings.backup": "Database backup",
  "settings.backupNow": "Back up now",
  "settings.backupDone": "Backup created: {path}",
  ...explorerMessages.en,
};

type Key = keyof typeof en;

const fr: Record<Key, string> = {
  "app.title": "SKU Manager",
  "app.settings": "Paramètres",
  "app.back": "Retour",
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.create": "Créer",
  "common.error": "Erreur",

  "setup.title": "Bienvenue",
  "setup.text":
    "Choisissez le dossier où sont stockés les produits et la base de données. Les données existantes sont conservées.",
  "setup.choose": "Choisir le dossier de données",
  "setup.chooseOther": "Choisir un autre dossier",

  "db.outdatedTitle": "Mise à jour de l'application requise",
  "db.outdatedText":
    "Cette base de données est en version {db}, plus récente que l'application ({app}). Veuillez mettre à jour l'application.",
  "db.migrateTitle": "Mise à jour de la base de données",
  "db.migrateText":
    "La base de données est en version {db} et l'application en {app}. Une copie de sauvegarde de db.sqlite sera créée dans le dossier de données, puis la base sera mise à jour.",
  "db.migrate": "Sauvegarder et mettre à jour",

  "list.search": "Rechercher SKU, nom ou description…",
  "list.new": "Nouveau produit",
  "list.all": "Tous",
  "list.empty": "Aucun produit trouvé.",

  "product.sku": "SKU",
  "product.name": "Nom",
  "product.description": "Description",
  "product.status": "Statut",
  "product.created": "Créé le",
  "product.updated": "Modifié le",
  "product.history": "Historique des statuts",
  "product.edit": "Modifier",
  "product.newTitle": "Nouveau produit",
  "product.editTitle": "Modifier le produit",
  "product.files": "Fichiers",

  "status.In development": "En développement",
  "status.Active": "Actif",
  "status.Retired": "Retiré",

  "settings.dataFolder": "Dossier de données",
  "settings.change": "Changer…",
  "settings.versions": "Versions",
  "settings.appVersion": "Application",
  "settings.dbVersion": "Base de données",
  "settings.theme": "Thème",
  "settings.theme.system": "Système",
  "settings.theme.light": "Clair",
  "settings.theme.dark": "Sombre",
  "settings.language": "Langue",
  "settings.backup": "Sauvegarde de la base",
  "settings.backupNow": "Sauvegarder maintenant",
  "settings.backupDone": "Sauvegarde créée : {path}",
  ...explorerMessages.fr,
};

const dicts: Record<Lang, Record<string, string>> = { en, fr };

export const detectLang = (): Lang => (navigator.language.startsWith("fr") ? "fr" : "en");

export function makeT(lang: Lang) {
  return (key: string, vars: Record<string, string> = {}) =>
    (dicts[lang][key] ?? dicts.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export type T = ReturnType<typeof makeT>;
export const TContext = createContext<T>(makeT("en"));
export const useT = () => useContext(TContext);

export const fmtDate = (iso: string | number, lang: Lang) =>
  new Date(iso).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
