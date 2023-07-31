import { Connector, Provider, Actions, ProviderConnectInfo, ProviderRpcError, RequestArguments } from '@web3-react/types'
import Torus, { TorusInpageProvider, TorusParams, TorusLoginParams, TorusCtorArgs } from '@toruslabs/torus-embed';

interface TorusOptions {
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
  }

  /**
   * No-op. May be called if it simplifies application code.
   */
  public async activate() {
    // void 0
    if(!this.torus){
      this.torus = new Torus(this.options.constructorOptions)
      await this.torus.init(this.options.initOptions)
    }
    const accounts = await this.torus.login(this.options.logInOptions).then((accounts: string[]): string[] => accounts)
    this.provider = this.torus.provider as TorusWalletProvider

    this.actions.update({ accounts, chainId: Number(this.provider?.chainId) })
    // return { provider: this.torus.provider, account }
  }

  private detectProvider(): TorusWalletProvider | void {
    if (this.provider) {
      return this.provider
    } else{
      return this.torus?.provider as TorusWalletProvider
    }
  }

  private isomorphicInitialize(): void {
    const provider = this.detectProvider()

    if (provider) {
      provider.on('connect', ({ chainId }: ProviderConnectInfo): void => {
        this.actions.update({ chainId: this.parseChainId(chainId) })
      })

      provider.on('disconnect', (error: ProviderRpcError): void => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.provider?.request({method: 'PUBLIC_disconnectSite'})

        this.actions.resetState()
        this.onError?.(error)
      })

      provider.on('chainChanged', (chainId: string): void => {

        this.actions.update({ chainId: Number(chainId) })
      })

      provider.on('accountsChanged', (accounts: string[]): void => {
        if (accounts.length === 0) {
          // handle this edge case by disconnecting
          this.actions.resetState()
        } else {
          this.actions.update({ accounts })
        }
      })
    }
  }

  private parseChainId(chainId: string) {
    return Number.parseInt(chainId, 16)
  }
}