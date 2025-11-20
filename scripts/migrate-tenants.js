#!/usr/bin/env node
/**
 * Migration script to normalize tenant names (URL segment) to UPPERCASE
 * and optionally uppercase tenant internal IDs and related keys (config:, analytics:)
 *
 * Usage:
 *   Dry run (no changes):
 *     node scripts/migrate-tenants.js
 *
 *   Apply changes:
 *     KV_REST_API_URL and KV_REST_API_TOKEN must be set in env
 *     node scripts/migrate-tenants.js --apply
 *
 *   Also uppercase internal IDs and related keys:
 *     node scripts/migrate-tenants.js --apply --uppercase-ids
 */

const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const uppercaseIds = args.includes('--uppercase-ids');
const dryRun = !apply;

async function migrate() {
  console.log(`Migration started (${dryRun ? 'dry-run' : 'apply'}), uppercaseIds=${uppercaseIds}`);

  const tenantKeys = await redis.keys('tenant:*');
  if (!tenantKeys || tenantKeys.length === 0) {
    console.log('No tenant keys found. Nothing to do.');
    return;
  }

  let moved = 0;
  let configsMoved = 0;
  let analyticsMoved = 0;
  let usersUpdated = 0;

  // Load all user keys once (we'll update them if needed)
  const userKeys = await redis.keys('user:*');

  for (const key of tenantKeys) {
    try {
      const tenant = await redis.get(key);
      if (!tenant) {
        console.warn(`Skipping ${key} — no data returned.`);
        continue;
      }

      const keyNamePart = key.split(':')[1] || '';

      const nameSource = (tenant.name || keyNamePart || '').toString();
      const normalizedName = nameSource.toUpperCase();
      const newTenantKey = `tenant:${normalizedName}`;

      // Determine desired ID change if requested
      const oldId = tenant.id || null;
      const newId = uppercaseIds && oldId ? String(oldId).toUpperCase() : oldId;

      console.log(`
Processing tenant key: ${key}
  tenant.name: ${tenant.name}
  tenant.id: ${tenant.id}
  normalizedName: ${normalizedName}
  newTenantKey: ${newTenantKey}
  newId: ${newId}
`);

      if (newTenantKey === key && (!uppercaseIds || newId === oldId)) {
        console.log('  Already normalized — skipping tenant key move.');
      } else {
        // If new key exists and is different, avoid clobbering
        const newKeyExists = await redis.exists(newTenantKey);
        if (newKeyExists) {
          console.warn(`  Destination key ${newTenantKey} already exists. Skipping move for tenant ${key}.`);
        } else {
          if (!dryRun) {
            // Update tenant object fields
            const newTenantObj = { ...tenant, name: normalizedName };
            if (newId) newTenantObj.id = newId;
            await redis.set(newTenantKey, newTenantObj);
            await redis.del(key);
          }
          moved += 1;
          console.log(`  Tenant moved: ${key} -> ${newTenantKey}`);
        }
      }

      // If we are uppercasing internal IDs, move config: and analytics: keys
      if (uppercaseIds && oldId && newId && newId !== oldId) {
        const configOldKey = `config:${oldId}`;
        const configNewKey = `config:${newId}`;
        const analyticsOldKey = `analytics:${oldId}`;
        const analyticsNewKey = `analytics:${newId}`;

        const cfgExists = await redis.exists(configOldKey);
        if (cfgExists) {
          const cfg = await redis.get(configOldKey);
          if (!dryRun) {
            await redis.set(configNewKey, cfg);
            await redis.del(configOldKey);
          }
          configsMoved += 1;
          console.log(`  Config moved: ${configOldKey} -> ${configNewKey}`);
        }

        const anlExists = await redis.exists(analyticsOldKey);
        if (anlExists) {
          const anl = await redis.get(analyticsOldKey);
          if (!dryRun) {
            await redis.set(analyticsNewKey, anl);
            await redis.del(analyticsOldKey);
          }
          analyticsMoved += 1;
          console.log(`  Analytics moved: ${analyticsOldKey} -> ${analyticsNewKey}`);
        }

        // Update users' tenant references
        for (const uKey of userKeys) {
          const user = await redis.get(uKey);
          if (!user || !Array.isArray(user.tenants)) continue;
          if (user.tenants.includes(oldId)) {
            const newTenants = user.tenants.map(t => t === oldId ? newId : t);
            console.log(`    Will update ${uKey} tenants: ${user.tenants.join(', ')} -> ${newTenants.join(', ')}`);
            if (!dryRun) {
              user.tenants = newTenants;
              await redis.set(uKey, user);
            }
            usersUpdated += 1;
          }
        }
      }
    } catch (err) {
      console.error(`Error processing ${key}:`, err);
    }
  }

  console.log('\nMigration summary:');
  console.log(`  tenant keys moved: ${moved}`);
  console.log(`  config keys moved: ${configsMoved}`);
  console.log(`  analytics keys moved: ${analyticsMoved}`);
  console.log(`  user records updated: ${usersUpdated}`);

  if (dryRun) console.log('\nDry-run complete. Re-run with --apply to make changes.');
  else console.log('\nApply complete.');
}

migrate().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(2); });
