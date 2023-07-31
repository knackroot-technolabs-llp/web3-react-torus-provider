"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TorusWallet = void 0;
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
            this.provider?.request({ method: 'PUBLIC_disconnectSite' });
            this.actions.resetState();
            this.onError?.(error);
        };
        this.chainchangedListener = (chainId) => {
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
    }
    /**
     * No-op. May be called if it simplifies application code.
     */
    async activate() {
        // void 0
        if (!this.torus) {
            this.torus = new torus_embed_1.default(this.options.constructorOptions);
            await this.torus.init(this.options.initOptions);
        }
        const accounts = await this.torus.login(this.options.logInOptions).then((accounts) => accounts);
        this.provider = this.torus.provider;
        this.actions.update({ accounts, chainId: Number(this.provider?.chainId) });
        this.isomorphicInitialize();
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
                    image, // A string url of the token logo
                },
            },
        })
            .then((success) => {
            if (!success)
                throw new Error('Rejected');
            return true;
        });
    }
    async connectEagerly() {
        this.isomorphicInitialize();
        await this.activate();
    }
    async deactivate() {
        await this.torus?.cleanUp();
        this.torus = undefined;
        this.provider?.off("connect", this.connectListener);
        this.provider?.off("disconnect", this.disconnectListener);
        this.provider?.off("chainChanged", this.chainchangedListener);
        this.provider?.off("accountsChanged", this.accountchangedListener);
    }
}
exports.TorusWallet = TorusWallet;
