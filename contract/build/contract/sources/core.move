module contract::core {
    use 0x1::{string::String};
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        object::new,
    };

    const ADMIN_ADDRESS: address = @admin;

    const E_NOT_RESOLVE_TIME: u64 = 1;
    const E_ALREADY_RESOLVED: u64 = 2;

    #[allow(unused_field)]
    public struct Outcome has store {
        title: String,
        description: String,
    }

    #[allow(unused_field)]
    public struct Bet has key, store {
        id: UID,
        market_id: ID,
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
        start_at: u64,
        bet_end_at: u64,
        resolve_at: u64,
        resolve_query: String,
        resolve_source: vector<String>,
        outcomes: vector<Outcome>,
        // ---
        creator: address,
        bets_agg: vector<u64>,
        total_bets: Coin<SUI>,
        // ---
        resolved_at: u64,
        resolved_outcome: Option<u64>,
    }

    public fun new_market(
        title: String,
        description: String,
        rules: String,
        relevant_information: String,
        start_at: u64,
        bet_end_at: u64,
        resolve_at: u64,
        resolve_query: String,
        resolve_source: vector<String>,
        outcomes: vector<Outcome>,
        creator: address,

        ctx: &mut TxContext,
    ) {
        let bets_agg = vector::map_ref!<Outcome, u64>(&outcomes, |_| 0);
        let market = MarketAgreement {
            id: new(ctx),
            title,
            description,
            rules,
            relevant_information,
            start_at,
            bet_end_at,
            resolve_at,
            resolve_query,
            resolve_source,
            outcomes,
            creator,
            bets_agg,
            total_bets: coin::zero(ctx),
            resolved_at: 0,
            resolved_outcome: option::none(),
        };

        transfer::public_share_object(market);
    }

    public entry fun bet(
        market: &mut MarketAgreement,
        outcome: u64,
        coin: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        let bet_amount = coin.value();
        let bet = Bet {
            id: new(ctx),
            market_id: *market.id.as_inner(),
            amount: bet_amount,
            bet_at: ctx.epoch_timestamp_ms(),
            claimed_at: 0,
        };

        // Transfer the bet amount to the market
        coin::join(&mut market.total_bets, coin);

        // Transfer the bet object to the user
        transfer::transfer(bet, ctx.sender());

        // Update the aggregate bet amount for the outcome
        let agg = market.bets_agg.borrow_mut(outcome);
        *agg = *agg + bet_amount;
    }

    public entry fun mark_as_resolve(
        market: &mut MarketAgreement,
        outcome: u64,
        ctx: &mut TxContext,
    ) {
        // Check if the market is resolved
        assert!(ctx.epoch_timestamp_ms() >= market.resolve_at, E_NOT_RESOLVE_TIME);

        // Check if the market is already resolved
        assert!(market.resolved_outcome.is_none(), E_ALREADY_RESOLVED);

        // Set the resolved outcome
        market.resolved_outcome = option::some(outcome);
        market.resolved_at = ctx.epoch_timestamp_ms();
    }
}
