import { Connector, Provider, Actions, ProviderConnectInfo, ProviderRpcError, RequestArguments, WatchAssetParameters, AddEthereumChainParameter } from '@web3-react/types'
import Torus, { TorusInpageProvider, TorusParams, TorusLoginParams, TorusCtorArgs, NetworkInterface } from '@toruslabs/torus-embed';
import { chain } from 'lodash';

type ChainParams = NetworkInterface & {
  host: string,
  chainId: number
}

interface TorusOptions {
  chains: ChainParams[]
  initOptions: TorusParams,
  constructorOptions: TorusCtorArgs,
  logInOptions: TorusLoginParams
}

interface TorusWalletConstructorArgs {
  actions: Actions,
  options: TorusOptions,
  onError: () => void;
}


type TorusWalletProvider = TorusInpageProvider & {
  providers?: Omit<TorusInpageProvider, 'providers'>[];
  request<T>(args: RequestArguments): Promise<T>;
  isConnected: () => boolean;
  chainId: string;
  selectedAddress: string;
  on: (event: string, args: any) => any;
};



export class TorusWallet extends Connector {
  /** {@inheritdoc Connector.provider} */
  public provider?: TorusWalletProvider;
  public torus?: Torus;
  public readonly options: TorusOptions;

  constructor({ actions, options, onError }: TorusWalletConstructorArgs) {
    super(actions, onError)
    this.options = options;
    console.log("🚀 ~ file: index.ts:44 ~ TorusWallet ~ constructor ~ options:", options)

    if (this.options.chains?.length === 0) {
      throw new Error("chains is not provided")
    }

  }

  /**
   * No-op. May be called if it simplifies application code.
   */
  public async activate() {
    // void 0
    console.log("🚀 ~ file: index.ts:60 ~ TorusWallet ~ activate ~ !this.options.initOptions?.network:", !this.options.initOptions?.network)
    if (!this.torus) {
      this.torus = new Torus(this.options.constructorOptions)
      if (!this.options.initOptions?.network) {
        this.options.initOptions.network = this.options.chains[0]
      }     
      await this.torus.init(this.options.initOptions)
    }
    const accounts = await this.torus.login(this.options.logInOptions).then((accounts: string[]): string[] => accounts)
    this.provider = this.torus.provider as TorusWalletProvider
    this.actions.update({ accounts, chainId: Number(this.provider?.chainId) })
    this.isomorphicInitialize()
  }

  public async watchAsset({ address, symbol, decimals, image }: WatchAssetParameters): Promise<true> {
    if (!this.provider) throw new Error('No provider')

    return this.provider
      .request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Initially only supports ERC20, but eventually more!
          options: {
            address, // The address that the token is at.
            symbol, // A ticker symbol or shorthand, up to 5 chars.
            decimals, // The number of decimals in the token
            image, // A string url of the token logo
          },
        },
      })
      .then((success) => {
        if (!success) throw new Error('Rejected')
        return true
      })
  }

  public async switchOrAddChain(chainId: number) {
    try {
      const chain = this.options.chains?.find((x) => x.chainId === chainId);
      if(!chain) throw new Error("chain is not supported")
      if (!this.connected && this.torus?.isInitialized && this.torus.isLoggedIn) throw new Error("Please login first");
      await this.torus?.setProvider(chain as NetworkInterface)
    } catch (error) {
      console.error("switch network error:", error)
    }
  }

  public async connectEagerly(): Promise<void> {
    this.torus = new Torus(this.options.constructorOptions)
    await this.torus.init(this.options.initOptions)
    this.provider = this.torus.provider as TorusWalletProvider
    if (this.provider.selectedAddress) {
      await this.activate()
    } else {
      console.warn('Could not connect eagerly')
      this.actions.resetState()
    }
  }

  public async deactivate(): Promise<void> {
    await this.torus?.cleanUp()
    this.torus = undefined
    this.provider?.off("connect", this.connectListener)
    this.provider?.off("disconnect", this.disconnectListener)
    this.provider?.off("chainChanged", this.chainchangedListener)
    this.provider?.off("accountsChanged", this.accountchangedListener)
  }

  private detectProvider(): TorusWalletProvider | void {
    if (this.provider) {
      return this.provider
    } else {
      return this.torus?.provider as TorusWalletProvider
    }
  }

  private connectListener = ({ chainId }: ProviderConnectInfo): void => {
    this.actions.update({ chainId: this.parseChainId(chainId) })
  }

  private disconnectListener = (error: ProviderRpcError): void => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.provider?.request({ method: 'PUBLIC_disconnectSite' })

    this.actions.resetState()
    this.onError?.(error)
  }

  private chainchangedListener = (chainId: string): void => {
    const chain = this.options.chains?.find((x) => x.chainId === Number(chainId));
    if(!chain) throw new Error("chain is not supported")
    this.actions.update({ chainId: Number(chainId) })
  }

  private accountchangedListener = (accounts: string[]): void => {
    if (accounts.length === 0) {
      // handle this edge case by disconnecting
      this.actions.resetState()
    } else {
      this.actions.update({ accounts })
    }
  }

  private isomorphicInitialize(): void {
    const provider = this.detectProvider()

    if (provider) {
      provider.on('connect', this.connectListener)

      provider.on('disconnect', this.disconnectListener)

      provider.on('chainChanged', this.chainchangedListener)

      provider.on('accountsChanged', this.accountchangedListener)
    }
  }

  private parseChainId(chainId: string) {
    return Number.parseInt(chainId, 16)
  }

  private get connected() {
    return !!this.provider?.isConnected?.()
  }

}