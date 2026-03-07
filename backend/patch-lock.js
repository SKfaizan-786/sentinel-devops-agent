const fs = require('fs');

const orig = JSON.parse(fs.readFileSync('package-lock.json.orig', 'utf8'));
const newLock = JSON.parse(fs.readFileSync('package-lock.json.new', 'utf8'));

orig.packages[''].dependencies['node-vault'] = newLock.packages[''].dependencies['node-vault'];

const packagesToAdd = ['node_modules/node-vault', 'node_modules/tv4'];
for (const p of packagesToAdd) {
    if (newLock.packages[p]) {
        orig.packages[p] = newLock.packages[p];
    }
}

if (orig.dependencies) {
    const depsToAdd = ['node-vault', 'tv4'];
    for (const d of depsToAdd) {
        if (newLock.dependencies && newLock.dependencies[d]) {
            orig.dependencies[d] = newLock.dependencies[d];
        }
    }
}

const sortedPackages = {};
Object.keys(orig.packages).sort().forEach(k => {
    sortedPackages[k] = orig.packages[k];
});
orig.packages = sortedPackages;

if (orig.dependencies) {
    const sortedDeps = {};
    Object.keys(orig.dependencies).sort().forEach(k => {
        sortedDeps[k] = orig.dependencies[k];
    });
    orig.dependencies = sortedDeps;
}

fs.writeFileSync('package-lock.json', JSON.stringify(orig, null, 2) + '\n');
console.log('package-lock.json successfully patched.');
