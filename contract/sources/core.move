module contract::core {
    use 0x1::{string::String};
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        object::new,
        clock::Clock,
    };

    const ADMIN_ADDRESS: address = @admin;

    const E_NOT_RESOLVE_TIME: u64 = 1;
    const E_ALREADY_RESOLVED: u64 = 2;
    const E_NOT_ADMIN: u64 = 3;
    const E_INVALID_OUTCOME: u64 = 4;

    #[allow(unused_field)]
    public struct Outcome has store {
        title: String,
        description: String,
    }

    #[allow(unused_field)]
    public struct Bet has key, store {
        id: UID,
        market_id: ID,
        outcome: u64,
        amount: u64,
        bet_at: u64,
        claimed_at: u64,
    }

    #[allow(lint(coin_field))]
    public struct MarketAgreement has key, store {
        id: UID,
        title: String,
        description: String,
        rules: String,
        relevant_information: String,
        bet_end_at: u64,
        resolve_at: u64,
        resolve_query: String,
        resolve_source: vector<String>,
        outcomes: vector<Outcome>,
        // ---
        start_at: u64,
        creator: address,
        bets_agg: vector<u64>,
        bets_total: u64,
        bets_coin: Coin<SUI>,
        // ---
        resolved_at: u64,
        resolved_outcome: Option<u64>,
    }

    public fun new_market(
        title: String,
        description: String,
        rules: String,
        relevant_information: String,
        bet_end_at: u64,
        resolve_at: u64,
        resolve_query: String,
        resolve_source: vector<String>,
        outcomes: vector<Outcome>,

        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let bets_agg = vector::map_ref!<Outcome, u64>(&outcomes, |_| 0);
        let market = MarketAgreement {
            id: new(ctx),
            title,
            description,
            rules,
            relevant_information,
            bet_end_at,
            resolve_at,
            resolve_query,
            resolve_source,
            outcomes,
            start_at: clock.timestamp_ms(),
            creator: ctx.sender(),
            bets_agg,
            bets_total: 0,
            bets_coin: coin::zero(ctx),
            resolved_at: 0,
            resolved_outcome: option::none(),
        };

        transfer::public_share_object(market);
    }

    public entry fun bet(
        market: &mut MarketAgreement,
        outcome: u64,
        coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let bet_amount = coin.value();
        let bet = Bet {
            id: new(ctx),
            market_id: *market.id.as_inner(),
            outcome,
            amount: bet_amount,
            bet_at: clock.timestamp_ms(),
            claimed_at: 0,
        };

        // Transfer the bet amount to the market
        coin::join(&mut market.bets_coin, coin);

        // Transfer the bet object to the user
        transfer::public_transfer(bet, ctx.sender());

        // Update the aggregate bet amount for the outcome
        let agg = market.bets_agg.borrow_mut(outcome);
        *agg = *agg + bet_amount;
        market.bets_total = market.bets_total + bet_amount;
    }

    public entry fun resolve(
        market: &mut MarketAgreement,
        outcome: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        // Check if the market is resolved
        assert!(clock.timestamp_ms() >= market.resolve_at, E_NOT_RESOLVE_TIME);

        // Check if the market is already resolved
        assert!(market.resolved_outcome.is_none(), E_ALREADY_RESOLVED);

        // Check if the tx sender is admin
        assert!(ctx.sender() == ADMIN_ADDRESS, E_NOT_ADMIN);

        // Set the resolved outcome
        market.resolved_outcome = option::some(outcome);
        market.resolved_at = ctx.epoch_timestamp_ms();
    }

    public entry fun claim(
        market: &mut MarketAgreement,
        bet: &mut Bet,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        // Check if the bet is already claimed
        assert!(bet.claimed_at == 0, E_ALREADY_RESOLVED);

        // Check if the market is resolved
        assert!(market.resolved_outcome.is_some(), E_NOT_RESOLVE_TIME);

        // Check if the bet is on the resolved outcome
        let resolved_outcome = market.resolved_outcome.borrow();
        assert!(*resolved_outcome == bet.outcome, E_INVALID_OUTCOME);

        // Calculate the payout = (bet_amount * total_bets) / agg_bets
        let payout = (bet.amount * market.bets_total) / market.bets_agg[bet.outcome];

        // Transfer the payout to the user
        let payout_coin = coin::split(&mut market.bets_coin, payout, ctx);
        transfer::public_transfer(payout_coin, ctx.sender());

        // Mark the bet as claimed
        bet.claimed_at = clock.timestamp_ms();
    }
}
