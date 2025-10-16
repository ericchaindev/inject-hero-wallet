export const browserX = (() => {
  // @ts-ignore
  if (typeof chrome !== "undefined") return chrome;
  // @ts-ignore
  if (typeof browser !== "undefined") return browser;
  throw new Error("No extension API found.");
})();
