// Main IIFE (Immediately Invoked Function Expression)
(function (global, factory) {
    if (typeof exports === "object" && typeof module === "object") {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        exports.IframeFfi = factory();
    } else {
        global.IframeFfi = factory();
    }
})(this, () => {
    "use strict";

    /******************************************************************
     * Module: Serializer
     ******************************************************************/
    class Serializer {
        constructor() {
            console.log("[Serializer] Initializing serializer");
            this.localFunctionMap = new Map();
            this.remoteFunctionMap = new Map();
        }

        static TYPE_KEY = "__serializedType__";
        static VALUE_KEY = "__serializedValue__";

        static wrap(type, value) {
            return { [Serializer.TYPE_KEY]: type, [Serializer.VALUE_KEY]: value };
        }

        serialize(origin, obj) {
            console.log(`[Serializer] Serializing for origin: ${origin}`);
            const transferrables = [];

            const serializedObject = JSON.stringify(obj, (key, value) => {
                // BigInt → string
                if (typeof value === "bigint") {
                    return Serializer.wrap("bigint", value.toString());
                }

                // Function → unique ID + MessagePort
                if (typeof value === "function") {
                    const fnList = this.localFunctionMap.get(origin) ?? [];
                    const found = fnList.find(([, fn]) => fn === value);
                    if (found) {
                        return Serializer.wrap("functionId", found[0]);
                    }

                    const { port1, port2 } = new MessageChannel();
                    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
                    const fnId = btoa(String.fromCharCode(...randomBytes));

                    fnList.push([fnId, value]);
                    this.localFunctionMap.set(origin, fnList);

                    port1.onmessage = (event) => {
                        const args = this.deserialize(origin, event.data);
                        value(...args);
                    };

                    return Serializer.wrap("function", [fnId, port2]);
                }

                // MessagePort
                if (value instanceof MessagePort) {
                    transferrables.push(value);
                    return Serializer.wrap("transferrable", transferrables.length - 1);
                }

                return value;
            });

            return { serializedObject, transferrableObjects: transferrables };
        }

        deserialize(origin, { serializedObject, transferrableObjects }) {
            console.log(`[Serializer] Deserializing for origin: ${origin}`);

            return JSON.parse(serializedObject, (key, value) => {
                if (value && typeof value === "object" && typeof value[Serializer.TYPE_KEY] === "string") {
                    const fnList = this.remoteFunctionMap.get(origin) ?? [];

                    switch (value[Serializer.TYPE_KEY]) {
                        case "bigint":
                            return BigInt(value[Serializer.VALUE_KEY]);

                        case "transferrable":
                            return transferrableObjects[value[Serializer.VALUE_KEY]];

                        case "function":
                            const remoteFn = (...args) => {
                                const data = this.serialize(origin, args);
                                value[Serializer.VALUE_KEY][1].postMessage(data, data.transferrableObjects);
                            };
                            fnList.push([value[Serializer.VALUE_KEY][0], remoteFn]);
                            this.remoteFunctionMap.set(origin, fnList);
                            return remoteFn;

                        case "functionId":
                            const found = fnList.find(([id]) => id === value[Serializer.VALUE_KEY]);
                            return found ? found[1] : undefined;
                    }
                }
                return value;
            });
        }
    }

    /******************************************************************
     * Helper: Promise resolution wrapper
     ******************************************************************/
    async function wrapWithPromiseResolution(value, promise) {
        console.log(`[wrapWithPromiseResolution] Wrapping promise for ${value}`);
        return new Promise((resolve) => {
            promise.catch(() => { }).finally(() => {
                console.log(`[wrapWithPromiseResolution] Resolving with ${value}`);
                resolve(value);
            });
        });
    }

    /******************************************************************
     * Module: Client
     ******************************************************************/
    class Client {
        constructor(localHostObject, parentWindow, parentOrigin) {
            console.log("[Client] Initializing client");
            this.localHostObject = localHostObject;
            this.parent = parentWindow;
            this.parentOrigin = parentOrigin;
            this.serializer = new Serializer();
            this.origin =
                window.location.origin ??
                `${window.location.protocol}//${window.location.host}`;

            // Proxy handler for dynamic method forwarding
            return new Proxy(this, {
                get: (target, prop) => {
                    if (typeof prop !== "string" || ["then"].includes(prop)) {
                        return target[prop];
                    }
                    if (target[prop]) return target[prop];
                    if (target.localHostObject[prop]) return target.localHostObject[prop];
                    return (...args) => {
                        console.log(`[Proxy] Forwarding '${prop}' with args:`, args);
                        return target.invokeRemoteMethod(prop, ...args);
                    };
                },
            });
        }

        invokeRemoteMethod(method, ...args) {
            console.log(`[invokeRemoteMethod] Calling '${method}' with args:`, args);

            return new Promise((resolve, reject) => {
                const { port1, port2 } = new MessageChannel();

                port1.onmessage = (event) => {
                    console.log(`[invokeRemoteMethod] Received response for '${method}'`);
                    const { result, error } = this.serializer.deserialize(this.origin, event.data);
                    if (error) reject(new Error(error));
                    else resolve(result);
                    port1.close();
                };

                const payload = this.serializer.serialize(this.origin, {
                    method,
                    args,
                });

                console.log(`[invokeRemoteMethod] Posting message to parent for '${method}'`);
                this.parent.postMessage(payload, this.parentOrigin, [port2, ...payload.transferrableObjects]);
            });
        }

        async waitForIframeConnection(baseDelay = 10, attempts = 10, backoff = 2) {
            console.log(`[waitForIframeConnection] Start (${attempts} attempts)`);

            for (let i = 0; i < attempts; i++) {
                const timeout = Math.ceil(baseDelay * Math.pow(backoff, i));
                console.log(`[waitForIframeConnection] Attempt ${i + 1}, timeout ${timeout}ms`);

                const result = await Promise.race([
                    wrapWithPromiseResolution(1, new Promise((res) => setTimeout(res, timeout))),
                    wrapWithPromiseResolution(2, this.ensureServerConnectionNoop?.()),
                ]);

                if (result === 2) {
                    console.log(`[waitForIframeConnection] Connection verified at attempt ${i + 1}`);
                    return;
                }
            }

            throw new Error("Could not connect to target iframe");
        }
    }

    /******************************************************************
     * Module: BlastEthereumProvider
     ******************************************************************/
    class BlastEthereumProvider {
        get isBlastApp() {
            console.log("[BlastEthereumProvider] isBlastApp accessed");
            return true;
        }

        static injectProvider(provider) {
            console.log("[BlastEthereumProvider] Injecting provider");
            setTimeout(() => {
                if (!window.ethereum) {
                    window.ethereum = provider;

                    window.addEventListener("eip6963:announceProvider", (event) => {
                        if (window.ethereum && window.ethereum.isBlastApp) {
                            console.log("[BlastEthereumProvider] Replacing with announced provider");
                            window.ethereum = event.detail.provider;
                        }
                    });

                    console.log("[BlastEthereumProvider] Dispatching requestProvider event");
                    window.dispatchEvent(new Event("eip6963:requestProvider"));
                }
            }, 0);
        }
    }

    /******************************************************************
     * Bootstrap
     ******************************************************************/
    window.addEventListener("load", () => {
        console.log("[window.load] Initializing provider");
        const provider = new BlastEthereumProvider();
        const client = new Client(provider, window.parent, "*");
        BlastEthereumProvider.injectProvider(client);
    });

    return { Client, Serializer, BlastEthereumProvider };
});


