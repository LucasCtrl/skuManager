import { createContext, useContext } from "react";
import type { Lang } from "../shared/rpc";
import { explorerMessages } from "./explorer/messages";

// `{name}` placeholders are filled by t(key, vars), or turned into elements by <Rich>.
const en = {
  "app.title": "SKU Manager",
  "app.settings": "Settings",
  "app.products": "Products",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.optional": "(optional)",
  "common.error": "Error",
  "common.quit": "Quit",
  "common.database": "Database",
  "common.thisApp": "This app",

  "firstRun.title": "Choose where your product data lives",
  "firstRun.text":
    "Pick an empty folder to start fresh, or a folder you already used with SKU Manager to keep working with its data. You can change it later in Settings.",
  "firstRun.folder": "Data folder",
  "firstRun.browse": "Browse…",
  "firstRun.existing": "Existing data found",
  "firstRun.products": "Products",
  "firstRun.existingNote":
    "SKU Manager will work with this data as it is. Nothing is deleted or overwritten.",
  "firstRun.empty": "Empty folder · will be created",
  "firstRun.productsDir": "one folder per SKU",
  "firstRun.dbFile": "products and app version ({version})",
  "firstRun.open": "Open this folder",
  "firstRun.create": "Create and continue",

  "outdated.title": "Update SKU Manager to open this folder",
  "outdated.text":
    "This data was saved by a newer version of the app. Install {version} or later, then open the folder again. Nothing in the folder has been changed.",
  "outdated.chooseOther": "Choose another folder",

  "migrate.title": "Database update needed",
  "migrate.lead":
    "This app is newer than the database in your data folder. When you continue, the database is backed up automatically, then migrated.",
  "migrate.titleDone": "Database updated",
  "migrate.leadDone": "Everything is ready. Your backup stays in the data folder.",
  "migrate.app": "App {version}",
  "migrate.backup": "Back up the database",
  "migrate.backupDone": "Database backed up",
  "migrate.migrate": "Migrate to {version}",
  "migrate.migrateDone": "Migrated to {version}",
  "migrate.note":
    "Your products and their folders stay as they are; only the database structure is updated.",
  "migrate.run": "Back up and migrate",
  "migrate.openProducts": "Open products",

  "list.title": "Products",
  "list.count": "{n} products",
  "list.countFiltered": "{n} of {total} products",
  "list.searchLabel": "Search products",
  "list.search": "Search by SKU, name or description",
  "list.new": "New product",
  "list.filter": "Filter by status",
  "list.all": "All",
  "list.colSku": "SKU",
  "list.colProduct": "Product",
  "list.colStatus": "Status",
  "list.colUpdated": "Updated",
  "list.emptyQuery": "No product matches “{q}”.",
  "list.empty": "No products yet.",
  "list.empty.In development": "No products in development.",
  "list.empty.Active": "No active products.",
  "list.empty.Retired": "No retired products.",

  "product.created": "Created {date}",
  "product.updated": "Updated {date}",
  "product.history": "Status history",
  "product.historyFrom": "from {status}",
  "product.historyCreated": "created",
  "product.edit": "Edit",
  "product.newTitle": "New product",
  "product.editTitle": "Edit product",
  "product.name": "Name",
  "product.description": "Description",
  "product.descriptionPlaceholder": "Material, dimensions, what it holds…",
  "product.status": "Status",
  "product.skuToBeAssigned": "SKU to be assigned",
  "product.create": "Create product",
  "product.saveChanges": "Save changes",
  "product.folderNote": "A folder named after the SKU is created in {dir}.",
  "product.files": "Product files",

  "status.In development": "In development",
  "status.Active": "Active",
  "status.Retired": "Retired",
  "status.help.In development": "Still being designed. Not ready to manufacture or sell.",
  "status.help.Active": "Ready for manufacturing and selling.",
  "status.help.Retired":
    "End of life. Kept as an archive; the SKU is never reused and can be reactivated.",

  "settings.title": "Settings",
  "settings.dataFolder": "Data folder",
  "settings.dataFolderText":
    "Holds {products} and {db}. Switching folders reopens the app on that folder's data. The path is saved in your user settings, not in the folder.",
  "settings.dataFolderPath": "Data folder path",
  "settings.change": "Change…",
  "settings.openFolder": "Open in file explorer",
  "settings.database": "Database",
  "settings.backupText": "Copy {db} to {backup} next to it.",
  "settings.backupNow": "Back up now",
  "settings.lastBackup": "Last backup: {date}",
  "settings.noBackup": "No backup yet",
  "settings.appearance": "Appearance",
  "settings.theme.system": "Follow system",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.language": "Language",
  "settings.version": "Version",
  "settings.application": "Application",
  "settings.state": "State",
  "settings.upToDate": "Up to date",
  "settings.skuFormat": "SKU format {format}",
  ...explorerMessages.en,
};

type Key = keyof typeof en;

const fr: Record<Key, string> = {
  "app.title": "SKU Manager",
  "app.settings": "Paramètres",
  "app.products": "Produits",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.optional": "(facultatif)",
  "common.error": "Erreur",
  "common.quit": "Quitter",
  "common.database": "Base de données",
  "common.thisApp": "Cette application",

  "firstRun.title": "Choisissez où stocker vos données produits",
  "firstRun.text":
    "Choisissez un dossier vide pour commencer, ou un dossier déjà utilisé avec SKU Manager pour reprendre ses données. Vous pourrez le changer plus tard dans les Paramètres.",
  "firstRun.folder": "Dossier de données",
  "firstRun.browse": "Parcourir…",
  "firstRun.existing": "Données existantes trouvées",
  "firstRun.products": "Produits",
  "firstRun.existingNote":
    "SKU Manager utilisera ces données telles quelles. Rien n'est supprimé ni écrasé.",
  "firstRun.empty": "Dossier vide · sera créé",
  "firstRun.productsDir": "un dossier par SKU",
  "firstRun.dbFile": "produits et version de l'application ({version})",
  "firstRun.open": "Ouvrir ce dossier",
  "firstRun.create": "Créer et continuer",

  "outdated.title": "Mettez à jour SKU Manager pour ouvrir ce dossier",
  "outdated.text":
    "Ces données ont été enregistrées par une version plus récente de l'application. Installez la {version} ou plus récente, puis rouvrez le dossier. Rien n'a été modifié dans le dossier.",
  "outdated.chooseOther": "Choisir un autre dossier",

  "migrate.title": "Mise à jour de la base de données nécessaire",
  "migrate.lead":
    "L'application est plus récente que la base de données de votre dossier. Si vous continuez, la base est d'abord sauvegardée automatiquement, puis migrée.",
  "migrate.titleDone": "Base de données mise à jour",
  "migrate.leadDone": "Tout est prêt. Votre sauvegarde reste dans le dossier de données.",
  "migrate.app": "Application {version}",
  "migrate.backup": "Sauvegarder la base de données",
  "migrate.backupDone": "Base de données sauvegardée",
  "migrate.migrate": "Migrer vers {version}",
  "migrate.migrateDone": "Migrée vers {version}",
  "migrate.note":
    "Vos produits et leurs dossiers restent tels quels ; seule la structure de la base est mise à jour.",
  "migrate.run": "Sauvegarder et migrer",
  "migrate.openProducts": "Ouvrir les produits",

  "list.title": "Produits",
  "list.count": "{n} produits",
  "list.countFiltered": "{n} sur {total} produits",
  "list.searchLabel": "Rechercher des produits",
  "list.search": "Rechercher par SKU, nom ou description",
  "list.new": "Nouveau produit",
  "list.filter": "Filtrer par statut",
  "list.all": "Tous",
  "list.colSku": "SKU",
  "list.colProduct": "Produit",
  "list.colStatus": "Statut",
  "list.colUpdated": "Modifié",
  "list.emptyQuery": "Aucun produit ne correspond à « {q} ».",
  "list.empty": "Aucun produit pour l'instant.",
  "list.empty.In development": "Aucun produit en développement.",
  "list.empty.Active": "Aucun produit actif.",
  "list.empty.Retired": "Aucun produit retiré.",

  "product.created": "Créé le {date}",
  "product.updated": "Modifié {date}",
  "product.history": "Historique des statuts",
  "product.historyFrom": "depuis {status}",
  "product.historyCreated": "création",
  "product.edit": "Modifier",
  "product.newTitle": "Nouveau produit",
  "product.editTitle": "Modifier le produit",
  "product.name": "Nom",
  "product.description": "Description",
  "product.descriptionPlaceholder": "Matériau, dimensions, ce qu'il contient…",
  "product.status": "Statut",
  "product.skuToBeAssigned": "SKU attribué",
  "product.create": "Créer le produit",
  "product.saveChanges": "Enregistrer",
  "product.folderNote": "Un dossier au nom du SKU est créé dans {dir}.",
  "product.files": "Fichiers du produit",

  "status.In development": "En développement",
  "status.Active": "Actif",
  "status.Retired": "Retiré",
  "status.help.In development": "Encore en conception. Pas prêt à être fabriqué ni vendu.",
  "status.help.Active": "Prêt pour la fabrication et la vente.",
  "status.help.Retired":
    "Fin de vie. Conservé comme archive ; le SKU n'est jamais réutilisé et peut être réactivé.",

  "settings.title": "Paramètres",
  "settings.dataFolder": "Dossier de données",
  "settings.dataFolderText":
    "Contient {products} et {db}. Changer de dossier rouvre l'application sur les données de ce dossier. Le chemin est enregistré dans vos paramètres utilisateur, pas dans le dossier.",
  "settings.dataFolderPath": "Chemin du dossier de données",
  "settings.change": "Changer…",
  "settings.openFolder": "Ouvrir dans l'explorateur",
  "settings.database": "Base de données",
  "settings.backupText": "Copie {db} vers {backup} dans le même dossier.",
  "settings.backupNow": "Sauvegarder maintenant",
  "settings.lastBackup": "Dernière sauvegarde : {date}",
  "settings.noBackup": "Aucune sauvegarde",
  "settings.appearance": "Apparence",
  "settings.theme.system": "Suivre le système",
  "settings.theme.light": "Clair",
  "settings.theme.dark": "Sombre",
  "settings.language": "Langue",
  "settings.version": "Version",
  "settings.application": "Application",
  "settings.state": "État",
  "settings.upToDate": "À jour",
  "settings.skuFormat": "Format SKU {format}",
  ...explorerMessages.fr,
};

const dicts: Record<Lang, Record<string, string>> = { en, fr };

export const detectLang = (): Lang => (navigator.language.startsWith("fr") ? "fr" : "en");

export function makeT(lang: Lang) {
  return (key: string, vars: Record<string, string | number> = {}) =>
    (dicts[lang][key] ?? dicts.en[key] ?? key).replace(/\{(\w+)\}/g, (m, k) =>
      k in vars ? String(vars[k]) : m,
    );
}

export type T = ReturnType<typeof makeT>;
export const TContext = createContext<T>(makeT("en"));
export const useT = () => useContext(TContext);

// Day-first formats, as in the design ("14 Sep 2026").
const locale = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-GB");
export const fmtDay = (d: string | number, lang: Lang) =>
  new Date(d).toLocaleDateString(locale(lang), { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (d: string | number, lang: Lang) =>
  new Date(d).toLocaleString(locale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// "today" / "yesterday" / "3 Oct" / "3 Oct 2025". Capitalise with CSS where it starts a sentence.
export function fmtRelative(d: string | number, lang: Lang) {
  const date = new Date(d);
  const days = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0 || days === 1)
    return new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" }).format(-days, "day");
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale(lang), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
