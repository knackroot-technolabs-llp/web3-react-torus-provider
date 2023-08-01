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
    async activate(desiredChainIdOrChainParameters) {
        // void 0
        if (this.connected && desiredChainIdOrChainParameters && this.torus?.isInitialized) {
            console.log("🚀 ~ file: index.ts:44 ~ TorusWallet ~ activate ~ desiredChainIdOrChainParameters:", desiredChainIdOrChainParameters);
            await this.switchOrAddChain(desiredChainIdOrChainParameters);
        }
        //else {
        if (!this.torus) {
            this.torus = new torus_embed_1.default(this.options.constructorOptions);
            await this.torus.init(this.options.initOptions);
        }
        const accounts = await this.torus.login(this.options.logInOptions).then((accounts) => accounts);
        // const desiredChainId = typeof desiredChainIdOrChainParameters === "number" ? desiredChainIdOrChainParameters : desiredChainIdOrChainParameters?.chainId
        // const desiredChainIdHex = desiredChainId?.toString(16)
        // if(desiredChainIdHex !== this.provider?.chainId){
        //   await this.switchOrAddChain(desiredChainIdOrChainParameters)
        // }
        this.provider = this.torus.provider;
        this.actions.update({ accounts, chainId: Number(this.provider?.chainId) });
        this.isomorphicInitialize();
    }
    // }
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
    async switchOrAddChain(desiredChainIdOrChainParameters) {
        // const desiredChainId = typeof desiredChainIdOrChainParameters === "number" ? desiredChainIdOrChainParameters : desiredChainIdOrChainParameters?.chainId
        // console.log("🚀 ~ file: index.ts:88 ~ TorusWallet ~ switchOrAddChain ~ desiredChainId:", desiredChainId)
        // const desiredChainIdHex = desiredChainId?.toString(16)
        // console.log("🚀 ~ file: index.ts:89 ~ TorusWallet ~ switchOrAddChain ~ desiredChainIdHex:", desiredChainIdHex)
        // const chainId = `0x${desiredChainIdHex}`
        // console.log("🚀 ~ file: index.ts:93 ~ TorusWallet ~ switchOrAddChain ~ chainId:", chainId)
        // return this.provider?.request({
        //   method: "wallet_switchEthereumChain",
        //   params: { chainId: chainId },
        // })
        // .catch((error: ProviderRpcError) => {
        //   const errorCode = (error.data as any)?.originalError?.code || error.code
        //   if (errorCode === 4902 && typeof desiredChainIdOrChainParameters !== 'number') {
        //     if (!this.provider) throw new Error('No provider')
        //     return this.provider.request({
        //       method: 'wallet_addEthereumChain',
        //       params: [{ ...desiredChainIdOrChainParameters, chainId: desiredChainIdHex }],
        //     }).catch(error => {
        //       throw error
        //     })
        //   } else {
        //     throw error
        //   }
        // }).then(async() => await this.activate(desiredChainId));
        // return await this.provider?.send("wallet_switchEthereumChain", { chainId: chainId})
        await this.torus?.setProvider({
            host: "https://rpc-mumbai.maticvigil.com",
            chainId: 80001,
            networkName: "matic"
        });
    }
    async connectEagerly() {
        // this.torus = new Torus()
        console.log("connect Eagerly Called");
        this.torus = new torus_embed_1.default(this.options.constructorOptions);
        await this.torus.init(this.options.initOptions);
        this.provider = this.torus.provider;
        if (this.provider.selectedAddress) {
            await this.activate();
        }
        else {
            console.debug('Could not connect eagerly');
            this.actions.resetState();
        }
    }
    async deactivate() {
        await this.torus?.cleanUp();
        this.torus = undefined;
        this.provider?.off("connect", this.connectListener);
        this.provider?.off("disconnect", this.disconnectListener);
        this.provider?.off("chainChanged", this.chainchangedListener);
        this.provider?.off("accountsChanged", this.accountchangedListener);
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
