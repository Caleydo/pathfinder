/**
 * Created by sam on 13.11.2016.
 */


const spawnSync = require('child_process').spawnSync;
const path = require('path');
const resolve = path.resolve;
const fs = require('fs');


function dependencyGraph(cwd) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['ls', '--prod', '--json'], {
    cwd: cwd
  });
  if (!r.stdout) {
    console.error(cwd, r.error);
    return {};
  }
  return JSON.parse(r.stdout.toString());
}

function gitHead(cwd) {
  if (!fs.existsSync(cwd + '/.git')) {
    return null;
  }
  const r = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: cwd
  });
  if (!r.stdout) {
    console.error(cwd, r.error);
    return {};
  }
  return r.stdout.toString().trim();
}

function resolveModules() {
  const reg = fs.readFileSync('../phovea_registry.js').toString();
  const regex = /import '(.*)\/phovea_registry.js'/g;
  const modules = [];
  var r;
  while ((r = regex.exec(reg)) !== null) {
    modules.push(r[1]);
  }
  return modules;
}

function cleanupDependency(d) {
  return d;
}

function resolveWorkspace() {
  console.log('resolve parent');
  const workspaceDeps = dependencyGraph('..').dependencies;
  const modules = new Set(resolveModules());

  const resolveModule = (m) => {
    console.log('resolve', m);
    const pkg = require(`../${m}/package.json`);
    const head = gitHead('../' + m);
    return {
      name: pkg.name,
      version: pkg.version,
      resolved: head ? `${pkg.repository.url}#${head}` : pkg.version,
      dependencies: deps(pkg.dependencies)
    };
  };
  const deps = (deps) => {
    const r = {};
    Object.keys(deps).forEach((d) => {
      if (d in workspaceDeps) {
        r[d] = cleanupDependency(workspaceDeps[d]);
        delete workspaceDeps[d];
      } else if (modules.has(d)) {
        modules.delete(d);
        r[d] = resolveModule(d);
      } else {
        r[d] = '-> link';
      }
    });
    return r;
  };

  // self =
  const root = path.basename(process.cwd());
  console.log(root);

  modules.delete(root);
  const base = resolveModule(root);
  base.extraDependencies = {};
  while (modules.size > 0) {
    let m = Array.from(modules.keys())[0];
    modules.delete(m);
    base.extraDependencies[m] = resolveModule(m);
  }
  return base;
}

function resolveSingle() {
  console.log('resolve self');
  const self = dependencyGraph('.');
  const pkg = require(`./package.json`);
  const head = gitHead('.');
  const deps = {};
  Object.keys(self.dependencies || {}).forEach((d) => {
    deps[d] = cleanupDependency(self.dependencies[d]);
  });
  return {
    name: self.name,
    version: pkg.version,
    resolved: head ? `${pkg.repository.url}#${head}` : pkg.version,
    dependencies: deps,
    extraDependencies: {}
  };
}

function generate() {
  console.log('building buildInfo');
  const isWorkspaceContext = fs.existsSync('../phovea_registry.js');
  if (isWorkspaceContext) {
    return resolveWorkspace();
  } else {
    return resolveSingle();
  }
}


const IS_WINDOWS = process.platform === 'win32';

function tmpdir() {
  if (IS_WINDOWS) {
    return process.env.TEMP || process.env.TMP ||
           (process.env.SystemRoot || process.env.windir) + '\\temp';
  } else {
    return process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
  }
}

module.exports.generate = generate;
module.exports.tmpFile = function() {
  const s = generate();
  const file = `${tmpdir()}/buildInfo${Math.random().toString(36).slice(-8)}.txt`;
  fs.writeFileSync(file, JSON.stringify(s, null, ' '));
  return file;
}


if (require.main === module) {
  fs.writeFile('deps.json', JSON.stringify(generate(), null, ' '));
}
