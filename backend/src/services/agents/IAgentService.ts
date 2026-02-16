
export interface IAgentService {
    /**
     * Initialize or get the agent configuration
     */
    readonly agentCode: string;

    /**
     * Register a new user on the agent's platform
     * @param userId Internal User ID
     * @param phone User's phone number as seed
     */
    register(userId: number, phone: string): Promise<{ username: string; password?: string } | null>;

    /**
     * Get balance for a specific user on this agent
     * @param externalUsername The username on the agent platform
     */
    getBalance(externalUsername: string): Promise<number>;

    /**
     * Deposit credits to a user on the agent platform
     * @param externalUsername The username on the agent platform
     * @param amount Amount to deposit
     * @param refId Unique reference ID for transaction
     */
    deposit(externalUsername: string, amount: number, refId?: string): Promise<boolean>;

    /**
     * Withdraw credits from a user on the agent platform
     * @param externalUsername The username on the agent platform
     * @param amount Amount to withdraw (or 'ALL' for full withdrawal if supported)
     * @param refId Unique reference ID for transaction
     */
    withdraw(externalUsername: string, amount: number | 'ALL', refId?: string): Promise<boolean | number>;

    /**
     * Launch a game
     * @param externalUsername User on agent platform
     * @param gameCode Game identifier
     * @param providerCode Provider identifier (e.g. PG, JOKER)
     * @param lang Language code
     */
    launchGame(
        externalUsername: string,
        gameCode: string,
        providerCode: string,
        lang?: string
    ): Promise<string | null>;

    /**
     * Check if the agent API is online
     */
    checkStatus(): Promise<boolean>;

    /**
     * Check Main Agent Balance (The credit we hold with them)
     */
    getAgentBalance(): Promise<number>;

    /**
     * Get List of Game Providers
     */
    getGameProviders(): Promise<any[]>;

    /**
     * Get List of Games for specific provider
     */
    getGames(providerCode: string): Promise<any[]>;
}
