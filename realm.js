const GLOBAL_THIS = '___globalThis___';

class Realm {
    constructor(globalObject, options = {}) {
        this.realmOptions = options;
        this.properties = globalObject;
        this.declaratives = {};
        this.externals = [];
        this.eval = globalObject.eval;
        this.defineHiddenProperty(GLOBAL_THIS, globalObject);
    }

    set(key, options = {}) {
        const descriptor = {
            value: options.value,
            writable: options.writable ?? true,
            enumerable: options.enumerable ?? true,
            configurable: options.configurable ?? true,
        };
        if (this.isWritableProperty(key)) {
            this.defineProperty(key, descriptor);
        } else {
            this.defineDeclarative(key, descriptor);
        }
    }

    defineDeclarative(key, attributes) {
        const backingKey = `__${key}__`;
        const value = attributes.value;
        this.declaratives[key] = { backingKey, attributes };
        this.defineHiddenProperty(backingKey, value);
        this.externals.push(key);
    }

    defineHiddenProperty(key, value) {
        this.defineProperty(key, {
            value,
            writable: false,
            enumerable: false,
            configurable: false,
        });
    }

    defineProperty(key, attributes) {
        Object.defineProperty(this.properties, key, attributes);
        this.externals.push(key);
    }

    get(key) {
        if (this.isDeclarative(key)) {
            const { backingKey } = this.declaratives[key];
            return this.properties[backingKey];
        } else {
            return this.properties[key];
        }
    }

    has(key) {
        return this.isProperty(key) || this.isDeclarative(key);
    }

    hasDeclaratives() {
        return Object.keys(this.declaratives) !== 0;
    }

    isProperty(key) {
        return Reflect.has(this.properties, key);
    }

    isDeclarative(key) {
        return Reflect.has(this.declaratives, key);
    }

    isWritableProperty(key) {
        const attributes = Object.getOwnPropertyDescriptor(this.properties, key);
        return this.isProperty(key) && attributes.writable;
    }

    isRedefined(key) {
        const isExternal = this.externals.includes(key);
        return this.has(key) && isExternal;
    }
}

export { Realm, GLOBAL_THIS };
