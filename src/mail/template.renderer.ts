import * as fs from 'fs';
import * as path from 'path';

/**
 * Lightweight HTML template renderer.
 *
 * Supports:
 *   {{variable}}         -> replaced with value from `vars`
 *   {{>partialName}}     -> inlines `templates/partials/partialName.html`
 *
 * Templates live under src/mail/templates, partials under
 * src/mail/templates/partials. When compiled, the same relative
 * structure is preserved under dist/.
 */
export class TemplateRenderer {
  private readonly templatesDir: string;
  private readonly partialsDir: string;
  private readonly cache = new Map<string, string>();

  constructor(baseDir: string = path.join(process.cwd(), 'src', 'mail', 'templates')) {
    this.templatesDir = baseDir;
    this.partialsDir = path.join(baseDir, 'partials');
  }

  render(templateName: string, vars: Record<string, string | number>): string {
    const raw = this.loadTemplate(templateName);
    const withPartials = this.resolvePartials(raw);
    return this.interpolate(withPartials, vars);
  }

  private loadTemplate(name: string): string {
    const cacheKey = `t:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const file = path.join(this.templatesDir, `${name}.html`);
    const content = fs.readFileSync(file, 'utf8');
    this.cache.set(cacheKey, content);
    return content;
  }

  private loadPartial(name: string): string {
    const cacheKey = `p:${name}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const file = path.join(this.partialsDir, `${name}.html`);
    const content = fs.readFileSync(file, 'utf8');
    this.cache.set(cacheKey, content);
    return content;
  }

  private resolvePartials(template: string): string {
    return template.replace(/{{>\s*([\w-]+)\s*}}/g, (_m, name: string) =>
      this.loadPartial(name),
    );
  }

  private interpolate(
    template: string,
    vars: Record<string, string | number>,
  ): string {
    return template.replace(/{{\s*([\w-]+)\s*}}/g, (_m, key: string) => {
      const v = vars[key];
      return v === undefined || v === null ? '' : String(v);
    });
  }
}
