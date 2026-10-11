export const parseLookup = (text: string, retainCase = false) => {
  text = text.replace(/^\W+|\W+$|[^\w\s]+/g, " ").replace(/\s+/g, " ");
  if (!retainCase) text = text.toLowerCase();
  return text.trim();
};
