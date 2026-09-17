import * as fs from 'fs';
import * as path from 'path';

const backendRoot = path.resolve(__dirname, '../..');
const repositoryRoot = path.resolve(backendRoot, '..');

describe('canonical Firebase deployment configuration', () => {
  it('maps both deploy configurations to the backend rule files', () => {
    const backendConfig = JSON.parse(fs.readFileSync(path.join(backendRoot, 'firebase.json'), 'utf8'));
    const frontendConfig = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'frontend/firebase.json'), 'utf8'));

    expect(backendConfig.firestore).toEqual({ rules: 'firestore.rules', indexes: 'firestore.indexes.json' });
    expect(backendConfig.storage.rules).toBe('storage.rules');
    expect(backendConfig.database.rules).toBe('database.rules.json');
    expect(frontendConfig.firestore).toEqual({
      rules: '../backend/firestore.rules',
      indexes: '../backend/firestore.indexes.json',
    });
    expect(frontendConfig.storage.rules).toBe('../backend/storage.rules');
    expect(frontendConfig.database.rules).toBe('../backend/database.rules.json');
  });

  it('does not retain alternate frontend rule copies', () => {
    for (const name of ['firestore.rules', 'storage.rules', 'database.rules.json']) {
      expect(fs.existsSync(path.join(repositoryRoot, 'frontend', name))).toBe(false);
    }
  });

  it('keeps sensitive Firestore collections caller-scoped or server-only', () => {
    const rules = fs.readFileSync(path.join(backendRoot, 'firestore.rules'), 'utf8');
    expect(rules).toMatch(/match \/users\/\{userId\}\/blockedUsers\/\{targetUid\}[\s\S]*?allow read: if isSignedIn\(\) && request\.auth\.uid == userId;[\s\S]*?allow create, update, delete: if false;/);
    expect(rules).toMatch(/match \/kyc_temp\/\{vendor\}[\s\S]*?allow read, create, update, delete: if false;/);
    expect(rules).toMatch(/match \/requests\/\{id\}[\s\S]*?resource\.data\.requesterId == request\.auth\.uid[\s\S]*?resource\.data\.ownerId == request\.auth\.uid/);
    expect(rules).toMatch(/match \/notifications\/\{id\}[\s\S]*?resource\.data\.userId == request\.auth\.uid/);
  });

  it('keeps Storage ownership checks and RTDB participant checks', () => {
    const storage = fs.readFileSync(path.join(backendRoot, 'storage.rules'), 'utf8');
    const database = fs.readFileSync(path.join(backendRoot, 'database.rules.json'), 'utf8');
    for (const prefix of ['listings', 'listing-images', 'business-logos', 'events']) {
      expect(storage).toContain(`match /${prefix}/{uid}/{fileName}`);
    }
    expect(storage).toContain('request.resource.size <= 5 * 1024 * 1024');
    expect(storage).toContain('request.auth.uid == uid');
    expect(database).toContain("root.child('conversations/'+$convId+'/participants/'+auth.uid).exists()");
    expect(database).toContain('".write": false');
  });
});
