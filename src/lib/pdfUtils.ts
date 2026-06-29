// Memo to speed up resolving colors
const colorMemo = new Map<string, string>();

/**
 * Resolves a modern color function (like oklch, oklab) to a standard rgb/rgba color string
 * by leveraging the browser's native CSS parser.
 */
export function resolveOklColor(colorStr: string): string {
  if (colorMemo.has(colorStr)) return colorMemo.get(colorStr)!;
  try {
    const temp = document.createElement("div");
    temp.style.color = colorStr;
    document.body.appendChild(temp);
    const resolved = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    if (resolved && resolved !== colorStr) {
      colorMemo.set(colorStr, resolved);
      return resolved;
    }
  } catch (e) {
    // Graceful fallback
  }
  colorMemo.set(colorStr, colorStr);
  return colorStr;
}

/**
 * Prepares the document's stylesheets for html2canvas rendering
 * by temporarily disabling stylesheets with oklch/oklab and replacing them with
 * dynamically resolved standard rgb/rgba styles.
 * Returns a function to clean up and restore original styles.
 */
export function prepareStylesheetsForPdf(): () => void {
  const backups: Array<{ sheet: CSSStyleSheet; tempStyle: HTMLStyleElement }> = [];
  const sheets = Array.from(document.styleSheets) as CSSStyleSheet[];

  for (const sheet of sheets) {
    try {
      if (!sheet || !sheet.cssRules) continue;

      let cssText = "";
      try {
        cssText = Array.from(sheet.cssRules).map(rule => rule.cssText).join("\n");
      } catch (e) {
        // Handle security error for cross-origin stylesheets (CORS)
        continue;
      }

      // Check for oklch or oklab (case-insensitive)
      if (/okl(ch|ab)/i.test(cssText)) {
        // Replace oklch/oklab with resolved rgb/rgba values
        const resolvedCss = cssText.replace(/okl(ch|ab)\([^)]+\)/gi, (match) => {
          return resolveOklColor(match);
        });

        // Inject the resolved styles
        const tempStyle = document.createElement("style");
        tempStyle.className = "temp-pdf-style";
        tempStyle.textContent = resolvedCss;
        document.head.appendChild(tempStyle);

        // Disable original stylesheet
        sheet.disabled = true;

        backups.push({
          sheet,
          tempStyle
        });
      }
    } catch (err) {
      // Ignore stylesheet errors
    }
  }

  // Cleanup/Restore function
  return () => {
    for (const backup of backups) {
      try {
        backup.sheet.disabled = false;
        if (backup.tempStyle && backup.tempStyle.parentNode) {
          backup.tempStyle.parentNode.removeChild(backup.tempStyle);
        }
      } catch (err) {
        // Ignore restoration errors
      }
    }
  };
}
