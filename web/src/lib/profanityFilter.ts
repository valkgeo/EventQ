import leoProfanity from "leo-profanity";

let configured = false;

export const sanitizeQuestion = (input: string) => {
  if (!configured) {
    leoProfanity.clearList();
    leoProfanity.loadDictionary("pt");
    leoProfanity.loadDictionary("en");
    leoProfanity.add(["caraio", "merda", "porra"]);
    configured = true;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  return leoProfanity.clean(trimmed);
};
