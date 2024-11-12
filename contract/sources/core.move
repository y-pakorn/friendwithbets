module contract::core {
    use 0x1::string::{Self,String};
    use 0x2::ed25519::ed25519_verify;
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        object::new,
        clock::Clock,
        event::emit,
    };

    const ADMIN_ADDRESS: address = @admin;

    const E_NOT_RESOLVE_TIME: u64 = 1;
    const E_ALREADY_RESOLVED: u64 = 2;
    const E_NOT_ADMIN: u64 = 3;
    const E_INVALID_OUTCOME: u64 = 4;
    const E_INVALID_MARKET_SIGNATURE: u64 = 5;

    // Events
    public struct MarketCreated has copy, drop {
        market_id: ID,
        creator: address,
    }

    public struct MarketResolved has copy, drop {
        market_id: ID,
        resolved_outcome: u64,
    }

    public struct BetPlaced has copy, drop {
        market_id: ID,
        bet_id: ID,
        by: address,
        outcome: u64,
        amount: u64,
    }

    // Structs
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
        public_key: Option<vector<u8>>,
        // ---
        start_at: u64,
        creator: address,
        bets_agg: vector<u64>,
        bets_total: u64,
        bets_coin: Coin<SUI>,
        // ---
        resolved_at: u64,
        resolved_outcome: Option<u64>,
        resolved_proof: Option<String>,
    }

    public fun new_market(
        title: vector<u8>,
        description: vector<u8>,
        rules: vector<u8>,
        relevant_information: vector<u8>,
        bet_end_at: u64,
        resolve_at: u64,
        resolve_query: vector<u8>,
        resolve_source: vector<vector<u8>>,
        outcome_titles: vector<vector<u8>>,
        outcome_descriptions: vector<vector<u8>>,
        public_key: Option<vector<u8>>,

        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(outcome_titles.length() > 1, E_INVALID_OUTCOME);
        assert!(outcome_titles.length() == outcome_descriptions.length(), E_INVALID_OUTCOME);

        let mut outcomes = vector::empty();
        let mut bets_agg = vector::empty();

        vector::zip_do!(outcome_titles, outcome_descriptions, |title, description| {
            outcomes.push_back(Outcome {
                title: string::utf8(title),
                description: string::utf8(description),
            });
            bets_agg.push_back(0);
        });

        let market = MarketAgreement {
            id: new(ctx),
            title: string::utf8(title),
            description: string::utf8(description),
            rules: string::utf8(rules),
            relevant_information: string::utf8(relevant_information),
            bet_end_at,
            resolve_at,
            resolve_query: string::utf8(resolve_query),
            resolve_source: vector::map_ref!(&resolve_source, |s| string::utf8(*s)),
            outcomes,
            start_at: clock.timestamp_ms(),
            creator: ctx.sender(),
            public_key,
            bets_agg,
            bets_total: 0,
            bets_coin: coin::zero(ctx),
            resolved_at: 0,
            resolved_outcome: option::none(),
            resolved_proof: option::none(),
        };

        // Emit the market created event
        emit(MarketCreated {
            market_id: *market.id.as_inner(),
            creator: ctx.sender(),
        });

        transfer::share_object(market);
    }

    public fun bet(
        market: &mut MarketAgreement,
        signature: vector<u8>,
        outcome: u64,
        coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Bet {
        let bet_amount = coin.value();
        let bet = Bet {
            id: new(ctx),
            market_id: *market.id.as_inner(),
            outcome,
            amount: bet_amount,
            bet_at: clock.timestamp_ms(),
            claimed_at: 0,
        };

        if (market.public_key.is_some()) {
            let public_key = market.public_key.borrow();
            let mut base_msg = string::utf8(b"Verifying Market Access ");
            string::append(&mut base_msg, ctx.sender().to_string());
            let verified = ed25519_verify(&signature, public_key, &base_msg.into_bytes());
            assert!(verified, E_INVALID_MARKET_SIGNATURE);
        };

        // Transfer the bet amount to the market
        coin::join(&mut market.bets_coin, coin);

        // Update the aggregate bet amount for the outcome
        let agg = market.bets_agg.borrow_mut(outcome);
        *agg = *agg + bet_amount;
        market.bets_total = market.bets_total + bet_amount;

        // Emit the bet event
        emit(BetPlaced {
            market_id: *market.id.as_inner(),
            bet_id: *bet.id.as_inner(),
            by: ctx.sender(),
            outcome,
            amount: bet_amount,
        });

        // Transfer the bet object to the user
        return bet
    }

    public fun resolve(
        market: &mut MarketAgreement,
        outcome: u64,
        proof: vector<u8>,
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
        market.resolved_proof = option::some(string::utf8(proof));

        // Emit the market resolved event
        emit(MarketResolved {
            market_id: *market.id.as_inner(),
            resolved_outcome: outcome,
        });
    }

    public fun claim(
        market: &mut MarketAgreement,
        bet: &mut Bet,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        // Check if the bet is already claimed
        assert!(bet.claimed_at == 0, E_ALREADY_RESOLVED);

        // Check if the market is resolved
        assert!(market.resolved_outcome.is_some(), E_NOT_RESOLVE_TIME);

        // Check if the bet is on the resolved outcome
        let resolved_outcome = market.resolved_outcome.borrow();
        assert!(*resolved_outcome == bet.outcome, E_INVALID_OUTCOME);

        // Calculate the payout = (bet_amount * total_bets) / agg_bets
        let payout = (bet.amount * market.bets_total) / market.bets_agg[bet.outcome];

        // Mark the bet as claimed
        bet.claimed_at = clock.timestamp_ms();

        // Emit the bet event
        emit(BetPlaced {
            market_id: *market.id.as_inner(),
            bet_id: *bet.id.as_inner(),
            by: ctx.sender(),
            outcome: bet.outcome,
            amount: payout,
        });

        // Transfer the payout to the user
        let payout_coin = coin::split(&mut market.bets_coin, payout, ctx);
        return payout_coin
    }

    public fun destroy_bet(
        bet: Bet,
    ) {
        let Bet { id, .. } = bet;
        object::delete(id);
    }
}
