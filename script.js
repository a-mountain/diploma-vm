import { getRealm, isContext } from './context.js';
import { GLOBAL_THIS } from './realm.js';

const GLOBALS = ['globalThis', 'window', 'self', 'frames'];

const enchanceScript = (realm, userCode) => {
    if (userCode.length === 0) {
        return '';
    }
    let script = `'use strict';\n`;
    for (const name in realm.declaratives) {
        const { backingKey, attributes } = realm.declaratives[name];
        const varType = attributes.writable ? 'let' : 'const';
        const value = `${GLOBAL_THIS}['${backingKey}']`;
        script += `${varType} ${name} = ${value};\n`;
    }
    script += userCode;
    return script;
};

const proxifyGlobalObject = (target, realm) =>
    new Proxy(target, {
        get(target, key) {
            return realm.get(key);
        },
        set(target, key, newValue) {
            realm.set(key, newValue);
        },
        has(target, key) {
            return realm.has(key);
        },
    });

const proxifyGlobals = (realm) => {
    const isNotRedefined = (key) => !realm.isRedefined(key);
    const globals = GLOBALS.filter(isNotRedefined);
    for (const key of globals) {
        const global = realm.get(key);
        const value = proxifyGlobalObject(global, realm);
        realm.set(key, { value, writable: false, configurable: false });
    }
};

class Script {
    constructor(src) {
        this.src = src;
    }

    runInContext(context) {
        if (!isContext(context)) {
            throw new Error('options.context - is not contextified object');
        }
        const realm = getRealm(context);
        if (realm.hasDeclaratives()) {
            proxifyGlobals(realm);
        }
        const script = enchanceScript(realm, this.src);
        return realm.eval(script);
    }
}

const runInContext = (code, context) => new Script(code).runInContext(context);

export { Script, runInContext };
