import { Realm } from './realm.js';

const contexts = new WeakMap();
const cleanupRegistry = new FinalizationRegistry(({ document, id }) => {
    document.getElementById(id).remove();
});
let counter = 0;

const copyRoot = (object) => {
    const copy = {};
    Object.assign(copy, object);
    if (Object.isFrozen(object)) {
        Object.freeze(copy);
    }
    if (Object.isSealed(object)) {
        Object.seal(copy);
    }
    if (!Object.isExtensible(object)) {
        Object.preventExtensions(copy);
    }
    return copy;
};

const createIframe = (document, name) => {
    const element = document.createElement('iframe');
    element.style.display = 'none';
    element.id = `iframe-vm:${counter++}`;
    element.name = name ?? element.id;
    element.className = 'iframe-vm';
    document.body.appendChild(element);
    return element;
};

const createContextifiedObject = (context, realm) =>
    new Proxy(context, {
        get(target, key) {
            return Reflect.has(target, key) ? realm.get(key) : undefined;
        },
        set(target, key, value) {
            const defined = Reflect.set(target, key, value);
            if (defined) {
                const attributes = Reflect.getOwnPropertyDescriptor(target, key);
                realm.set(key, attributes);
            }
            return defined;
        },
        defineProperty(target, key, attributes) {
            const defined = Reflect.defineProperty(target, key, attributes);
            if (defined) {
                realm.set(key, attributes);
            }
            return defined;
        },
    });

const getRealm = (contextObject) => contexts.get(contextObject);

const isContext = (contextObject) => contexts.has(contextObject);

const createContext = (context, options = {}) => {
    const iframe = createIframe(document, options.name);
    const realm = new Realm(iframe.contentWindow, options);
    for (const key of Object.keys(context)) {
        const attributes = Reflect.getOwnPropertyDescriptor(context, key);
        realm.set(key, attributes);
    }
    const contextObject = createContextifiedObject(copyRoot(context), realm);
    contexts.set(contextObject, realm);
    cleanupRegistry.register(contextObject, { document, id: iframe.id });
    return contextObject;
};

export { createContext, getRealm, isContext };
