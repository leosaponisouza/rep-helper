import fs from 'fs';
import path from 'path';

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const ALLOWED_PORTUGUESE_REPUBLIC_FILES = new Set([
  'src/utils/housePresets.ts',
  'app/(house)/new.tsx',
  'app/(panel)/settings/house.tsx',
  'app/(panel)/settings/about.tsx',
]);

describe('Alpendre Clean-Slate brand and domain guardrails', () => {
  const root = path.resolve(__dirname, '../../..');
  const allSrc = [
    ...collectSourceFiles(path.join(root, 'app')),
    ...collectSourceFiles(path.join(root, 'components')),
    ...collectSourceFiles(path.join(root, 'src')),
  ];
  const rel = (p: string) => path.relative(root, p).replace(/\\/g, '/');

  it('has zero occurrences of RepHelper across app/, components/, and src/', () => {
    const offenders = allSrc
      .filter((f) => /rep\s?helper/i.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('has zero legacy republic identifiers, routes, or unallowed "república" copy', () => {
    const offenders: string[] = [];

    for (const file of allSrc) {
      const r = rel(file);
      const raw = fs.readFileSync(file, 'utf8');
      const withoutPresetConstant = ALLOWED_PORTUGUESE_REPUBLIC_FILES.has(r)
        ? raw.replace(/'REPUBLIC'/g, '')
        : raw;

      if (/\brepublic(?:a|s|Id|Name|Service|Member|Address|Finances)?\b/i.test(withoutPresetConstant)) {
        offenders.push(`${r} (legacy republic identifier/route)`);
        continue;
      }

      if (!ALLOWED_PORTUGUESE_REPUBLIC_FILES.has(r)) {
        const withoutCountryOfficialName = raw.replace(
          /República Federativa do Brasil/g,
          ''
        );
        if (/repúblicas?/i.test(withoutCountryOfficialName)) {
          offenders.push(`${r} (legacy república copy)`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('exposes Alpendre identity and institutional contact in settings/about.tsx', () => {
    const aboutContent = fs.readFileSync(
      path.join(root, 'app/(panel)/settings/about.tsx'),
      'utf8'
    );
    expect(aboutContent).toContain('Alpendre');
    expect(aboutContent).toContain('contato@alpendre.app');
    expect(aboutContent).toContain('www.alpendre.app');
    expect(aboutContent).toContain('@alpendre.app');
  });

  it('has zero legacy RepHelper/república strings in backend Java sources and removes legacy design doc', () => {
    const repoRoot = path.resolve(root, '..');
    const legacyDesignDoc = path.join(repoRoot, 'docs/designs/rep-helper-backend-monorepo.md');
    expect(fs.existsSync(legacyDesignDoc)).toBe(false);

    const collectJavaFiles = (dir: string): string[] => {
      const out: string[] = [];
      if (!fs.existsSync(dir)) return out;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...collectJavaFiles(full));
        else if (entry.name.endsWith('.java')) out.push(full);
      }
      return out;
    };

    const javaFiles = collectJavaFiles(path.join(repoRoot, 'backend/src/main/java'));
    const backendOffenders = javaFiles
      .filter((f) => /rep\s?helper|repúblicas?/i.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(repoRoot, f).replace(/\\/g, '/'));
    expect(backendOffenders).toEqual([]);
  });
});
