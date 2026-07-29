/** `{{variable}}` placeholder substitution — deliberately not a templating engine (Unit 40's Out of scope). */
export function renderTemplate(body: string, vars: Record<string, string | number>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
