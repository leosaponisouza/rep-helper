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

describe('Design System architecture guardrails', () => {
  const root = path.resolve(__dirname, '../../..');
  const appAndComponents = [
    ...collectSourceFiles(path.join(root, 'app')),
    ...collectSourceFiles(path.join(root, 'components')),
  ];
  const allSrc = [...appAndComponents, ...collectSourceFiles(path.join(root, 'src'))];
  const rel = (p: string) => path.relative(root, p).replace(/\\/g, '/');

  it('has zero hardcoded hex colors outside palette.ts and BrandIcons.tsx', () => {
    const offenders = allSrc.filter((f) => {
      const r = rel(f);
      if (r === 'src/design-system/tokens/palette.ts' || r === 'src/design-system/primitives/BrandIcons.tsx') {
        return false;
      }
      return /#[0-9a-fA-F]{3,8}\b/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('has zero hardcoded rgba() outside src/design-system/tokens and src/design-system/theme', () => {
    const offenders = allSrc.filter((f) => {
      const r = rel(f);
      if (r.startsWith('src/design-system/tokens/') || r.startsWith('src/design-system/theme/')) return false;
      return /rgba\s*\(/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('never imports SafeAreaView from react-native', () => {
    const offenders = allSrc.filter((f) => {
      const content = fs.readFileSync(f, 'utf8');
      return /import\s*\{[^}]*\bSafeAreaView\b[^}]*\}\s*from\s*['"]react-native['"]/.test(content);
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('centralizes <StatusBar> strictly inside ThemeContext.tsx', () => {
    const offenders = allSrc.filter((f) => {
      const r = rel(f);
      if (r === 'src/design-system/theme/ThemeContext.tsx') return false;
      return /<StatusBar\b/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(offenders.map(rel)).toEqual([]);
  });

  it('has zero Alert.alert or bare alert() calls across app/, components/, and src/', () => {
    const offenders = allSrc.filter((f) => /\b(?:Alert\.alert|alert)\s*\(/.test(fs.readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('bans legacy style/icon/gradient/animation imports and removes legacy files', () => {
    const bannedImport = /(sharedStyles|eventStyles|animationCompat|@expo\/vector-icons|expo-linear-gradient)/;
    const offenders = allSrc.filter((f) => bannedImport.test(fs.readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);

    for (const removed of [
      'src/styles/sharedStyles.tsx',
      'src/styles/eventStyles.tsx',
      'src/utils/animationCompat.tsx',
      'components/BackButton.tsx',
      'components/Task/TaskEdit/HeaderBar.tsx',
      'components/tasks/TaskEdit/HeaderBar.tsx',
      'components/common/ConfirmDeleteModal.tsx',
    ]) {
      expect(fs.existsSync(path.join(root, removed))).toBe(false);
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(pkg.dependencies['@expo/vector-icons']).toBeUndefined();
    expect(pkg.dependencies['expo-linear-gradient']).toBeUndefined();

    const rootComponentFiles = fs
      .readdirSync(path.join(root, 'components'), { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
    expect(rootComponentFiles).toEqual([]);
  });
});
