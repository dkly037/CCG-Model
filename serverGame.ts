import { Game, GamePhase, GameActionType, SyncEventType, GameAction, GameSyncEvent } from './game';
import { GameFormat, standardFormat } from './gameFormat';

import { Enchantment } from './enchantment';
import { CardType } from './card';
import { Item } from './item';
import { Unit } from './unit';
import { DeckList } from './deckList';
import { EventType } from './gameEvent';
import { isArray } from 'util';


type ActionCb = (act: GameAction) => boolean;
export class ServerGame extends Game {
    // A table of handlers used to respond to actions taken by players
    protected actionHandelers: Map<GameActionType, ActionCb>;

    constructor(name: string, format: GameFormat = standardFormat, decks: [DeckList, DeckList]) {
        super(name, format, false, decks);
        this.actionHandelers = new Map<GameActionType, ActionCb>();
        this.addActionHandelers();
    }

    public startGame() {
        this.turn = 0;
        for (let i = 0; i < this.players.length; i++) {
            this.players[i].drawCards(this.format.initialDraw[i]);
        }
        this.players[this.turn].startTurn();
        this.getCurrentPlayerUnits().forEach(unit => unit.refresh());
        this.phase = GamePhase.Play1;

        this.mulligan();

        this.addGameEvent(new GameSyncEvent(SyncEventType.TurnStart, { turn: this.turn, turnNum: this.turnNum }));
        return this.events;
    }


    // Serverside phase logic
    protected endPhaseOne() {
        if (this.isAttacking()) {
            this.gameEvents.trigger(EventType.PlayerAttacked,
                new Map([['target', this.getOtherPlayerNumber(this.getActivePlayer())]]));
            if (this.blockersExist()) {
                this.changePhase(GamePhase.Block);
            } else {
                this.resolveCombat();
            }
        } else {
            this.startEndPhase();
        }
    }

    protected endBlockPhase() {
        let damageDistribution = this.generateDamageDistribution();
        let reorderables = this.getModableDamageDistributions();
        if (reorderables.size > 0) {
            this.changePhase(GamePhase.DamageDistribution);
        } else {
            this.resolveCombat();
        }
    }

    protected nextPhase() {
        switch (this.phase) {
            case GamePhase.Play1:
                this.endPhaseOne();
                break;
            case GamePhase.Play2:
                this.startEndPhase();
                break;
            case GamePhase.Block:
                this.endBlockPhase();
                break;
            case GamePhase.DamageDistribution:
                this.resolveCombat();
                break;
        }
    }


    // Player Actions -----------------------------------------------------

    /**
   * Handles a players action and returns a list of events that
   * resulted from that aciton.
   *
   * @param {GameAction} action
   * @returns {GameSyncEvent[]}
   * @memberof Game
   */
    public handleAction(action: GameAction): GameSyncEvent[] | null {
        let mark = this.events.length;
        let handeler = this.actionHandelers.get(action.type);
        if (!handeler)
            return [];
        if (action.type !== GameActionType.CardChoice &&
            (this.currentChoices[0] !== null ||
                this.currentChoices[1] !== null)) {
            console.error('Cant take action, waiting for', this.currentChoices);
            return null;
        }
        let sig = handeler(action);
        if (sig !== true)
            return null;
        return this.events.slice(mark);
    }

    protected addActionHandeler(type: GameActionType, cb: ActionCb) {
        this.actionHandelers.set(type, cb.bind(this));
    }

    protected addActionHandelers() {
        this.addActionHandeler(GameActionType.Pass, this.passAction);
        this.addActionHandeler(GameActionType.PlayResource, this.playResourceAction);
        this.addActionHandeler(GameActionType.PlayCard, this.playCardAction);
        this.addActionHandeler(GameActionType.ToggleAttack, this.toggleAttackAction);
        this.addActionHandeler(GameActionType.DeclareBlocker, this.declareBlockerAction);
        this.addActionHandeler(GameActionType.CardChoice, this.cardChoiceAction);
        this.addActionHandeler(GameActionType.ModifyEnchantment, this.modifyEnchantmentAction);
        this.addActionHandeler(GameActionType.DistributeDamage, this.distributeDamageAction);
        this.addActionHandeler(GameActionType.Quit, this.quit);
    }

    protected distributeDamageAction(act: GameAction): boolean {
        if (!this.isPlayerTurn(act.player) || this.phase !== GamePhase.DamageDistribution)
            return false;
        if (!isArray(act.params.order))
            return false;
        if (!this.attackDamageOrder.has(act.params.attackerID))
            return false;
        let defenders = new Set(this.attackDamageOrder.get(act.params.attackerID).map(u => u.getId()));
        let order = act.params.order as string[];
        if (defenders.size !== order.length)
            return false;
        for (let defender of order) {
            if (!defenders.has(defender))
                return false;
        }
        this.attackDamageOrder.set(act.params.attackerID, order.map(id => this.getUnitById(id)));
        this.addGameEvent(new GameSyncEvent(SyncEventType.DamageDistributed, act.params));
        return true;
    }

    protected modifyEnchantmentAction(act: GameAction): boolean {
        if (!this.isPlayerTurn(act.player))
            return false;
        let enchantment = this.getCardById(act.params.enchantmentId) as Enchantment;
        if (!enchantment || enchantment.getCardType() !== CardType.Enchantment ||
            !enchantment.canChangePower(this.getCurrentPlayer(), this))
            return false;
        enchantment.empowerOrDiminish(this.getCurrentPlayer(), this);
        this.addGameEvent(new GameSyncEvent(SyncEventType.EnchantmentModified, act.params));
        return true;
    }

    protected cardChoiceAction(act: GameAction): boolean {
        if (this.currentChoices[act.player] === null) {
            console.error('Reject choice from', act.player);
            return false;
        }
        let cardIds = act.params.choice as string[];
        let cards = cardIds.map(id => this.getCardById(id));
        let min = Math.min(this.currentChoices[act.player].validCards.size, this.currentChoices[act.player].min);
        let max = this.currentChoices[act.player].max;
        if (cards.length > max || cards.length < min) {
            console.error(`Reject choice. Out of range cards but only got ${cards.length}.`);
            return false;
        }
        if (!cards.every(card => this.currentChoices[act.player].validCards.has(card))) {
            console.error(`Reject choice. Included invalid options.`, cards, this.currentChoices[act.player].validCards);
            return false;
        }
        this.makeDeferedChoice(act.player, cards);
        this.addGameEvent(new GameSyncEvent(SyncEventType.ChoiceMade, {
            player: act.player,
            choice: act.params.choice
        }));
        return true;
    }

    /* Preconditions
        - Its the owners turn
        - Owner has has card in hand,
        - Owner can can afford to play card
        - The target given for the card is valid
    */
    protected playCardAction(act: GameAction): boolean {
        let player = this.players[act.player];
        if (!this.isPlayerTurn(act.player))
            return false;
        let card = this.getPlayerCardById(player, act.params.id);
        if (!card || !card.isPlayable(this))
            return false;

        // Standard Targets
        let targets: Unit[] = act.params.targetIds.map((id: string) => this.getUnitById(id));
        card.getTargeter().setTargets(targets);
        if (!card.getTargeter().targetsAreValid(card, this))
            return false;

        // Item Host
        if (card.getCardType() === CardType.Item) {
            let item = card as Item;
            item.getHostTargeter().setTargets([this.getUnitById(act.params.hostId)]);
            if (!item.getHostTargeter().targetsAreValid(card, this))
                return false;
        }

        this.playCard(player, card);
        this.addGameEvent(new GameSyncEvent(SyncEventType.PlayCard, {
            playerNo: act.player,
            played: card.getPrototype(),
            targetIds: act.params.targetIds,
            hostId: act.params.hostId
        }));
        return true;
    }

    /* Preconditions
        - It is the first phase of the acitng players turn
        - Unit is on the battlfield,
        - Unit can attack
    */
    protected toggleAttackAction(act: GameAction): boolean {
        let player = this.players[act.player];
        let unit = this.getPlayerUnitById(act.player, act.params.unitId);
        if (!this.isPlayerTurn(act.player) || this.phase !== GamePhase.Play1 || !unit || !unit.canAttack())
            return false;
        unit.toggleAttacking();
        this.addGameEvent(new GameSyncEvent(SyncEventType.AttackToggled, { player: act.player, unitId: act.params.unitId }));
        return true;
    }

    /* Preconditions
       - It is the block phase of the opposing players turn
       - Unit is on the battlfield,
       - Unit can attack
    */
    protected declareBlockerAction(act: GameAction) {
        let player = this.players[act.player];
        let isCanceling = act.params.blockedId === null;
        let blocker = this.getUnitById(act.params.blockerId);
        let blocked = isCanceling ? null : this.getPlayerUnitById(this.turn, act.params.blockedId);
        if (this.isPlayerTurn(act.player) ||
            this.phase !== GamePhase.Block ||
            !blocker)
            return false;
        if (!isCanceling && (!blocked ||
            !blocker.canBlockTarget(blocked)))
            return false;
        blocker.setBlocking(isCanceling ? null : blocked.getId());
        this.addGameEvent(new GameSyncEvent(SyncEventType.Block, {
            player: act.player,
            blockerId: act.params.blockerId,
            blockedId: act.params.blockedId
        }));
        return true;
    }

    /* Preconditions
       - It is the acting player's turn
       - Player has not already played a resource
       - Requested resource type is valid
    */
    protected playResourceAction(act: GameAction): boolean {
        let player = this.players[act.player];
        if (!(this.isPlayerTurn(act.player) && player.canPlayResource()))
            return false;
        let res = this.format.basicResources.get(act.params.type);
        if (!res)
            return false;
        player.playResource(res);
        this.addGameEvent(new GameSyncEvent(SyncEventType.PlayResource, { playerNo: act.player, resource: res }));
        return true;
    }

    protected passAction(act: GameAction): boolean {
        if (!this.isActivePlayer(act.player)) {
            console.error('Cant pass, not active player player', this.getActivePlayer(), GamePhase[this.phase], this.turn);
            return false;
        }
        this.nextPhase();
        return true;
    }
}
