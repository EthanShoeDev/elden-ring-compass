#!/usr/bin/env bun
/**
 * This file will check and fix times when monorepo packages are specifying
 * the version number of a dependency in the package.json file instead of using
 * the catalog: keyword.
 */
import { BunRuntime, BunServices } from '@effect/platform-bun';
import {
  Array as A,
  Console,
  Data,
  Effect,
  FileSystem,
  Path,
  Schema,
  SchemaGetter,
  SchemaTransformation,
} from 'effect';
import { Command, Flag } from 'effect/unstable/cli';
import type { SemVer } from 'semver';
import { coerce, gt } from 'semver';
import type { PackageJson as BasePackageJson } from 'type-fest';

const COMMAND_NAME = 'catalog-check';

const WORKSPACE_SCOPE = '@elden-ring-compass/';

type PackageJson = BasePackageJson & {
  workspaces?: {
    packages?: string[];
    catalog?: Record<string, string>;
  };
};

interface Violation {
  packagePath: string;
  packageName: string;
  depType: 'dependencies' | 'devDependencies' | 'peerDependencies';
  depName: string;
  currentValue: string;
  expectedValue: string;
}

interface MissingFromCatalog {
  depName: string;
  version: string;
  usedIn: Array<{ packageName: string; depType: string }>;
}

class CatalogCheckError extends Data.TaggedError('CatalogCheckError')<{
  message: string;
}> {}

// Round-trips a package.json: decode parses the text to a value; encode
// re-stringifies it with 2-space indent. (v4's Schema.fromJsonString is hard-wired
// to compact output, so we build the transform explicitly to keep diffs readable.)
const PackageJsonString = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Unknown,
    new SchemaTransformation.Transformation<unknown, string>(
      SchemaGetter.parseJson(),
      SchemaGetter.stringifyJson({ space: 2 }),
    ),
  ),
);

const readPackageJson = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(path);
    return (yield* Schema.decodeEffect(PackageJsonString)(
      content,
    )) as PackageJson;
  });

const writePackageJson = (path: string, pkg: PackageJson) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const jsonString = yield* Schema.encodeEffect(PackageJsonString)(pkg);
    yield* fs.writeFileString(path, jsonString);
  });

const getWorkspacePackagePaths = (rootDir: string, patterns: string[]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const paths: string[] = [];

    for (const pattern of patterns) {
      const baseDir = pattern.replace('/*', '');
      const fullBaseDir = path.join(rootDir, baseDir);

      const entries = yield* fs.readDirectory(fullBaseDir);

      for (const entry of entries) {
        if (entry === 'node_modules') continue;
        const entryPath = path.join(fullBaseDir, entry);
        const stat = yield* fs.stat(entryPath);
        if (stat.type === 'Directory') {
          const pkgJsonPath = path.join(entryPath, 'package.json');
          const exists = yield* fs.exists(pkgJsonPath);
          if (exists) {
            paths.push(pkgJsonPath);
          }
        }
      }
    }

    return paths;
  });

const isNewerVersion = (a: string, b: string): boolean => {
  const semverA: SemVer | null = coerce(a);
  const semverB: SemVer | null = coerce(b);
  if (!semverA || !semverB) {
    return false;
  }
  return gt(semverA, semverB);
};

const checkPackage = (
  packagePath: string,
  catalog: Record<string, string>,
  workspacePackages: Set<string>,
) =>
  Effect.gen(function* () {
    const pkg = yield* readPackageJson(packagePath);
    const violations: Violation[] = [];
    const notInCatalog: Array<{
      depName: string;
      version: string;
      depType: string;
      packageName: string;
    }> = [];
    const catalogDeps = new Set(Object.keys(catalog));

    const depTypes = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ] as const;

    for (const depType of depTypes) {
      const deps = pkg[depType];
      if (!deps) {
        continue;
      }

      for (const [depName, version] of Object.entries(deps)) {
        if (!version) continue;
        if (
          workspacePackages.has(depName) &&
          !version.startsWith('workspace:')
        ) {
          violations.push({
            packagePath,
            packageName: pkg.name ?? packagePath,
            depType,
            depName,
            currentValue: version,
            expectedValue: 'workspace:*',
          });
        } else if (catalogDeps.has(depName) && version !== 'catalog:') {
          violations.push({
            packagePath,
            packageName: pkg.name ?? packagePath,
            depType,
            depName,
            currentValue: version,
            expectedValue: 'catalog:',
          });
        } else if (
          !catalogDeps.has(depName) &&
          !workspacePackages.has(depName) &&
          !version.startsWith('workspace:') &&
          version !== 'catalog:' &&
          !depName.startsWith(WORKSPACE_SCOPE)
        ) {
          // Track deps not in catalog (excluding workspace deps and scoped packages)
          notInCatalog.push({
            depName,
            version,
            depType,
            packageName: pkg.name ?? packagePath,
          });
        }
      }
    }

    return { violations, notInCatalog };
  });

const fixViolations = (
  violations: Violation[],
  rootPkgPath: string,
  rootPkg: PackageJson,
) =>
  Effect.gen(function* () {
    const catalog = rootPkg.workspaces?.catalog ?? {};
    let catalogUpdated = false;

    // Group violations by package path
    const byPackage = new Map<string, Violation[]>();
    for (const v of violations) {
      const existing = byPackage.get(v.packagePath) ?? [];
      existing.push(v);
      byPackage.set(v.packagePath, existing);
    }

    // Check if any violation has a newer version than catalog
    for (const v of violations) {
      const catalogVersion = catalog[v.depName];
      if (
        v.expectedValue === 'catalog:' &&
        catalogVersion &&
        isNewerVersion(v.currentValue, catalogVersion)
      ) {
        yield* Console.log(
          `  Updating catalog "${v.depName}": "${catalogVersion}" -> "${v.currentValue}" (newer)`,
        );
        catalog[v.depName] = v.currentValue;
        catalogUpdated = true;
      }
    }

    // Fix each package
    for (const [packagePath, pkgViolations] of byPackage) {
      const pkg = yield* readPackageJson(packagePath);

      for (const v of pkgViolations) {
        const deps = pkg[v.depType];
        if (deps) {
          deps[v.depName] = v.expectedValue;
          yield* Console.log(
            `  Fixed ${pkg.name ?? packagePath} (${v.depType}): "${v.depName}" -> "${v.expectedValue}"`,
          );
        }
      }

      yield* writePackageJson(packagePath, pkg);
    }

    // Write updated catalog if needed
    if (catalogUpdated) {
      yield* writePackageJson(rootPkgPath, rootPkg);
      yield* Console.log('  Updated root package.json catalog');
    }
  });

const addToCatalog = (
  depsToAdd: MissingFromCatalog[],
  packagePaths: string[],
  rootPkgPath: string,
  rootPkg: PackageJson,
) =>
  Effect.gen(function* () {
    if (depsToAdd.length === 0) {
      return;
    }

    const catalog = rootPkg.workspaces?.catalog ?? {};

    // Add each dep to the catalog
    for (const dep of depsToAdd) {
      catalog[dep.depName] = dep.version;
      yield* Console.log(
        `  Added "${dep.depName}": "${dep.version}" to catalog`,
      );
    }

    // Sort catalog alphabetically
    const sortedCatalog: Record<string, string> = {};
    for (const key of Object.keys(catalog).toSorted()) {
      const value = catalog[key];
      if (value !== undefined) {
        sortedCatalog[key] = value;
      }
    }
    const packages = Array.isArray(rootPkg.workspaces)
      ? rootPkg.workspaces
      : rootPkg.workspaces?.packages;
    rootPkg.workspaces = {
      ...(packages && { packages }),
      catalog: sortedCatalog,
    };

    yield* writePackageJson(rootPkgPath, rootPkg);

    // Now update all packages to use catalog: for these deps
    const depsSet = new Set(depsToAdd.map((d) => d.depName));

    for (const packagePath of packagePaths) {
      const pkg = yield* readPackageJson(packagePath).pipe(
        Effect.orElseSucceed(() => null),
      );
      if (!pkg) continue;

      let updated = false;
      const depTypes = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
      ] as const;

      for (const depType of depTypes) {
        const deps = pkg[depType];
        if (!deps) continue;

        for (const [depName, version] of Object.entries(deps)) {
          if (!version) continue;
          if (depsSet.has(depName) && version !== 'catalog:') {
            deps[depName] = 'catalog:';
            yield* Console.log(
              `  Updated ${pkg.name ?? packagePath} (${depType}): "${depName}" -> "catalog:"`,
            );
            updated = true;
          }
        }
      }

      if (updated) {
        yield* writePackageJson(packagePath, pkg);
      }
    }
  });

const main = (fix: boolean) =>
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const rootDir = process.cwd();
    const rootPkgPath = path.join(rootDir, 'package.json');

    const rootPkg = yield* readPackageJson(rootPkgPath);

    const catalog = rootPkg.workspaces?.catalog ?? {};
    const catalogDeps = new Set(Object.keys(catalog));
    const workspacePatterns = rootPkg.workspaces?.packages ?? [];

    yield* Console.log(`Found ${catalogDeps.size} dependencies in catalog`);
    yield* Console.log(`Workspace patterns: ${workspacePatterns.join(', ')}`);

    const packagePaths = yield* getWorkspacePackagePaths(
      rootDir,
      workspacePatterns,
    );

    yield* Console.log(`Checking ${packagePaths.length} workspace packages...`);

    const workspacePackages = yield* Effect.forEach(packagePaths, (p) =>
      readPackageJson(p).pipe(
        Effect.map((pkg) => pkg.name),
        Effect.orElseSucceed(() => null),
      ),
    );
    const workspacePackageNames = new Set(
      workspacePackages.filter(Boolean) as string[],
    );

    const allResults = yield* Effect.forEach(packagePaths, (p) =>
      checkPackage(p, catalog, workspacePackageNames),
    );

    const violations = A.flatten(allResults.map((r) => r.violations));
    const allNotInCatalog = A.flatten(allResults.map((r) => r.notInCatalog));

    // Group deps not in catalog by dep name
    const notInCatalogByDep = new Map<
      string,
      {
        version: string;
        usedIn: Array<{ packageName: string; depType: string }>;
      }
    >();
    for (const item of allNotInCatalog) {
      const existing = notInCatalogByDep.get(item.depName);
      if (existing) {
        existing.usedIn.push({
          packageName: item.packageName,
          depType: item.depType,
        });
      } else {
        notInCatalogByDep.set(item.depName, {
          version: item.version,
          usedIn: [{ packageName: item.packageName, depType: item.depType }],
        });
      }
    }

    // Report violations
    if (violations.length > 0) {
      yield* Console.log(`\nFound ${violations.length} violation(s):\n`);

      for (const v of violations) {
        yield* Console.log(
          `  ${v.packageName} (${v.depType}): "${v.depName}" is "${v.currentValue}" but should be "${v.expectedValue}"`,
        );
      }
    }

    // Report deps not in catalog
    const depsNotInCatalog = [...notInCatalogByDep.entries()].toSorted(
      (a, b) => b[1].usedIn.length - a[1].usedIn.length,
    );

    if (depsNotInCatalog.length > 0) {
      yield* Console.log(`\nDependencies not in catalog:\n`);
      for (const [depName, info] of depsNotInCatalog) {
        const packages = info.usedIn.map((u) => u.packageName).join(', ');
        yield* Console.log(
          `  "${depName}": "${info.version}" (used in ${info.usedIn.length} packages: ${packages})`,
        );
      }
    }

    // Summary
    if (violations.length === 0 && depsNotInCatalog.length === 0) {
      yield* Console.log(
        'All packages correctly use catalog: and workspace:* references',
      );
      return;
    }

    yield* Console.log(`\nSummary:`);
    yield* Console.log(`  - Violations: ${violations.length}`);
    yield* Console.log(`  - Deps not in catalog: ${depsNotInCatalog.length}`);

    if (fix) {
      let madeChanges = false;

      if (violations.length > 0) {
        yield* Console.log('\nFixing violations...\n');
        yield* fixViolations(violations, rootPkgPath, rootPkg);
        madeChanges = true;
      }

      if (depsNotInCatalog.length > 0) {
        yield* Console.log('\nAdding deps to catalog...\n');
        const depsToAdd: MissingFromCatalog[] = depsNotInCatalog.map(
          ([depName, info]) => ({
            depName,
            version: info.version,
            usedIn: info.usedIn,
          }),
        );
        yield* addToCatalog(depsToAdd, packagePaths, rootPkgPath, rootPkg);
        madeChanges = true;
      }

      if (madeChanges) {
        yield* Console.log(
          '\nChanges applied. Run `bun install` to update lockfile.',
        );
      }
    }

    if (!fix && (violations.length > 0 || depsNotInCatalog.length > 0)) {
      return yield* new CatalogCheckError({
        message: `Found ${violations.length} violations and ${depsNotInCatalog.length} deps not in catalog`,
      });
    }
  });

const command = Command.make(
  COMMAND_NAME,
  {
    fix: Flag.Boolean('fix').pipe(
      Flag.withDefault(false),
      Flag.withDescription(
        'Automatically fix violations and add deps to catalog',
      ),
    ),
  },
  ({ fix }) => main(fix),
);

const run = Command.run(command, {
  version: '0.0.1',
});

run.pipe(Effect.provide(BunServices.layer), BunRuntime.runMain);
