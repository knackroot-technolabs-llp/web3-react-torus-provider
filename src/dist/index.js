"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@web3-react/types");
const torus_embed_1 = __importDefault(require("@toruslabs/torus-embed"));
class TorusWallet extends types_1.Connector {
    constructor({ actions, options, onError }) {
        super(actions, onError);
        this.connectListener = ({ chainId }) => {
            this.actions.update({ chainId: this.parseChainId(chainId) });
        };
        this.disconnectListener = (error) => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.onError?.(error);
            this.deactivate();
        };
        this.chainchangedListener = (chainId) => {
            const chain = this.options.chains?.find((x) => x.chainId === Number(chainId));
            if (!chain)
                throw new Error("chain is not supported");
            this.actions.update({ chainId: Number(chainId) });
        };
        this.accountchangedListener = (accounts) => {
            if (accounts.length === 0) {
                // handle this edge case by disconnecting
                this.actions.resetState();
            }
            else {
                this.actions.update({ accounts });
            }
        };
        this.options = options;
        if (this.options.chains?.length === 0) {
            throw new Error("chains is not provided");
        }
        if (typeof this.options.initOptions.network === "undefined" || typeof this.options.initOptions.network !== 'object') {
            this.options.initOptions.network = this.options.chains[0];
        }
    }
    /**
     * No-op. May be called if it simplifies application code.
     */
    async activate() {
        try {
            // void 0
            if (typeof this.torus === 'undefined' || !this.torus.isInitialized) {
                this.torus = new torus_embed_1.default(this.options.constructorOptions);
                await this.torus.init(this.options.initOptions);
            }
            const accounts = await this.torus.login(this.options.logInOptions).then((accounts) => accounts);
            this.provider = this.torus.provider;
            this.actions.update({ accounts, chainId: Number(this.provider?.chainId) });
            this.isomorphicInitialize();
        }
        catch (error) {
            console.error("error occured during activating wallet:", error);
        }
    }
    async watchAsset({ address, symbol, decimals, image }) {
        if (!this.provider)
            throw new Error('No provider');
        return this.provider
            .request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: {
                    address,
                    symbol,
                    decimals,
                    image,
                },
            },
        })
            .then((success) => {
            if (!success)
                throw new Error('Rejected');
            return true;
        });
    }
    async switchOrAddChain(chainId) {
        try {
            const chain = this.options.chains?.find((x) => x.chainId === chainId);
            if (!chain)
                throw new Error("chain is not supported");
            if (!this.connected && this.torus?.isInitialized && this.torus.isLoggedIn)
                throw new Error("Please login first");
            await this.torus?.setProvider(chain);
        }
        catch (error) {
            console.error("switch network error:", error);
        }
    }
    async connectEagerly() {
        try {
            this.torus = new torus_embed_1.default(this.options.constructorOptions);
            await this.torus.init(this.options.initOptions);
            this.provider = this.torus.provider;
            if (this.provider.selectedAddress) {
                await this.activate();
            }
            else {
                console.warn('Could not connect eagerly');
                this.torus.clearInit();
                this.actions.resetState();
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    async deactivate() {
        try {
            this.provider?.off("connect", this.connectListener);
            this.provider?.off("disconnect", this.disconnectListener);
            this.provider?.off("chainChanged", this.chainchangedListener);
            this.provider?.off("accountsChanged", this.accountchangedListener);
            await this.torus?.cleanUp();
            this.torus = undefined;
            this.actions.resetState();
        }
        catch (error) {
            console.error(error);
        }
    }
    detectProvider() {
        if (this.provider) {
            return this.provider;
        }
        else {
            return this.torus?.provider;
        }
    }
    isomorphicInitialize() {
        const provider = this.detectProvider();
        if (provider) {
            provider.on('connect', this.connectListener);
            provider.on('disconnect', this.disconnectListener);
            provider.on('chainChanged', this.chainchangedListener);
            provider.on('accountsChanged', this.accountchangedListener);
        }
    }
    parseChainId(chainId) {
        return Number.parseInt(chainId, 16);
    }
    get connected() {
        return !!this.provider?.isConnected?.();
    }
}
exports.TorusWallet = TorusWallet;
