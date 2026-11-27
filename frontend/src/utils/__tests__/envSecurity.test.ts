import fs from 'fs';
import path from 'path';

describe('native and build security configuration', () => {
  const root = path.resolve(__dirname, '../../..');
  const hasAndroidDir = fs.existsSync(path.join(root, 'android'));

  (hasAndroidDir ? it : it.skip)('AndroidManifest disables allowBackup and removes unused privileged permissions', () => {
    const manifest = fs.readFileSync(
      path.join(root, 'android/app/src/main/AndroidManifest.xml'),
      'utf8'
    );
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android.permission.RECORD_AUDIO');
    expect(manifest).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
    expect(manifest).not.toContain('android.permission.READ_EXTERNAL_STORAGE');
    expect(manifest).not.toContain('android.permission.WRITE_EXTERNAL_STORAGE');
    expect(manifest).not.toContain('android:scheme="myapp"');
    expect(manifest).not.toContain('android:scheme="rephelper"');
    expect(manifest).toContain('android:scheme="alpendre"');
    expect(manifest).toContain('android:scheme="com.alpendre.app"');
  });

  it('app.config.js and app.json align on alpendre scheme', () => {
    const appConfig = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8');
    const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

    expect(appConfig).toContain('scheme: "alpendre"');
    expect(appConfig).not.toContain('scheme: "myapp"');
    expect(appConfig).not.toContain('scheme: "rephelper"');
    expect(appJson.expo.scheme).toBe('alpendre');
  });

  (hasAndroidDir ? it : it.skip)('Android release build does not sign with debug.keystore and enables ProGuard by default', () => {
    const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
    const buildTypesSection = gradle.split('buildTypes {')[1]?.split('packagingOptions {')[0] || '';
    const releaseSection = buildTypesSection.split('release {')[1] || '';
    expect(releaseSection).not.toBe('');
    expect(releaseSection).not.toContain('signingConfig signingConfigs.debug');
    expect(gradle).toContain(
      "enableProguardInReleaseBuilds = (findProperty('android.enableProguardInReleaseBuilds') ?: true).toBoolean()"
    );
    expect(releaseSection).toContain(
      "shrinkResources (enableProguardInReleaseBuilds && ((findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'true').toBoolean()))"
    );
    expect(gradle).toContain("namespace 'com.alpendre.app'");
    expect(gradle).toContain("applicationId 'com.alpendre.app'");
    expect(gradle).toContain('ALPENDRE_UPLOAD_STORE_FILE');
    expect(gradle).not.toContain('REPHELPER_UPLOAD_STORE_FILE');
  });

  (hasAndroidDir ? it : it.skip)('gradle.properties disables dev client network inspector', () => {
    const gradleProps = fs.readFileSync(path.join(root, 'android/gradle.properties'), 'utf8');
    expect(gradleProps).toContain('EX_DEV_CLIENT_NETWORK_INSPECTOR=false');
    expect(gradleProps).not.toContain('EX_DEV_CLIENT_NETWORK_INSPECTOR=true');
  });

  it('env.js filters logged keys strictly to EXPO_PUBLIC_ prefix', () => {
    const envScript = fs.readFileSync(path.join(root, 'env.js'), 'utf8');
    expect(envScript).toContain("startsWith('EXPO_PUBLIC_')");
  });

  it('env.js runtime logs only EXPO_PUBLIC_ keys while still returning merged env', () => {
    const originalEnv = process.env;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      process.env = {
        ...originalEnv,
        EXPO_PUBLIC_TEST_KEY: 'public-value',
        HOST_SECRET_KEY: 'super-secret-value',
      };

      let loadedEnv: Record<string, string | undefined> = {};
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        loadedEnv = require(path.join(root, 'env.js'));
      });

      const loggedOutput = logSpy.mock.calls.flat().join('\n');
      expect(loggedOutput).toContain('EXPO_PUBLIC_TEST_KEY');
      expect(loggedOutput).not.toContain('HOST_SECRET_KEY');
      expect(loggedOutput).not.toContain('super-secret-value');
      expect(loadedEnv.EXPO_PUBLIC_TEST_KEY).toBe('public-value');
      expect(loadedEnv.HOST_SECRET_KEY).toBe('super-secret-value');
    } finally {
      process.env = originalEnv;
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
