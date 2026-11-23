import { config } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { DatabaseService } from '../../database/database.service.js';
import { PlatformMfaService } from '../auth/platform-mfa.service.js';
import { PlatformBootstrapService } from './bootstrap.service.js';

config({ path: '../../.env', override: false });

async function run() {
  console.log('\n======================================================');
  console.log('   COMMONPLACE PLATFORM — INITIAL SUPER ADMIN BOOTSTRAP');
  console.log('======================================================\n');

  const database = new DatabaseService();
  const mfaService = new PlatformMfaService();
  const bootstrapService = new PlatformBootstrapService(database, mfaService);

  let email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  let fullName = process.env.BOOTSTRAP_ADMIN_NAME;
  let password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !fullName || !password) {
    const rl = createInterface({ input, output });

    try {
      if (!email) {
        email = await rl.question('Enter Super Admin Email: ');
      }
      if (!fullName) {
        fullName = await rl.question('Enter Super Admin Full Name: ');
      }
      if (!password) {
        password = await rl.question('Enter Super Admin Password (min 8 chars): ');
      }
    } finally {
      rl.close();
    }
  }

  try {
    const result = await bootstrapService.bootstrap({
      email: email || '',
      fullName: fullName || '',
      password: password || '',
      ipAddress: '127.0.0.1',
      userAgent: 'Console CLI Bootstrap',
    });

    console.log('\n[SUCCESS] Platform Super Admin account created successfully!\n');
    console.log(`User ID   : ${result.platformUserId}`);
    console.log(`Email     : ${result.email}`);
    console.log(`Full Name : ${result.fullName}`);
    console.log('\n------------------------------------------------------');
    console.log('MANDATORY MULTI-FACTOR AUTHENTICATION (TOTP) SETUP');
    console.log('------------------------------------------------------');
    console.log(`Base32 Secret : ${result.totpSecret}`);
    console.log(`Key URI       : ${result.totpUri}`);
    console.log('\nScan this URI in Google Authenticator or 1Password.');
    console.log('\nEMERGENCY BACKUP RECOVERY CODES (Store securely offline):');
    result.recoveryCodes.forEach((code, index) => {
      console.log(`  [${index + 1}] ${code}`);
    });
    console.log('------------------------------------------------------\n');
    console.log('Note: Bootstrap is now permanently disabled on this database.\n');

    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[ERROR] Bootstrap failed: ${message}\n`);
    process.exit(1);
  }
}

void run();
