import dict from "./locales/en.json";
import { setDict } from "./t";
setDict(dict as Record<string, string>);
export { t, lang } from "./t";
