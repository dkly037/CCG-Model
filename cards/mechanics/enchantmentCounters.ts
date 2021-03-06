import { Mechanic, TriggeredMechanic } from '../../mechanic';
import { Game } from '../../game';
import { Targeter } from '../../targeter';
import { Card, CardType } from '../../card';
import { Enchantment } from '../../enchantment';
import { GameEvent, EventType } from '../../gameEvent';
import { ParameterType } from '../parameters';

export class Recharge extends Mechanic {
    protected static id = 'Recharge';
    protected static validCardTypes = new Set([CardType.Enchantment]);
    protected static ParameterTypes = [
        { name: 'Amount Per Turn', type: ParameterType.NaturalNumber }
    ];

    constructor(protected amountPerTurn: number = 1) {
        super();
    }

    public enter(card: Card, game: Game) {
        let enchantment = card as Enchantment;
        game.gameEvents.addEvent(this, new GameEvent(EventType.StartOfTurn, (params) => {
            let player = params.get('player') as number;
            if (player === enchantment.getOwner())
                enchantment.changePower(this.amountPerTurn);
            return params;
        }));
    }

    public remove(card: Card, game: Game) {
        game.gameEvents.removeEvents(this);
    }

    public getText(card: Card) {
        return `Recharge (${this.amountPerTurn}).`;
    }

    public evaluate() {
        return this.amountPerTurn * 1;
    }
}

export class Discharge extends Recharge {
    protected static id = 'Discharge';
    protected static validCardTypes = new Set([CardType.Enchantment]);


    public enter(card: Card, game: Game) {
        let enchantment = card as Enchantment;
        game.gameEvents.addEvent(this, new GameEvent(EventType.StartOfTurn, (params) => {
            let player = params.get('player') as number;
            if (player === enchantment.getOwner())
                enchantment.changePower(-this.amountPerTurn);
            return params;
        }));
    }

    public remove(card: Card, game: Game) {
        game.gameEvents.removeEvents(this);
    }

    public getText(card: Card) {
        return `Discharge (${this.amountPerTurn}).`;
    }

    public evaluate() {
        return this.amountPerTurn * -1;
    }
}

export class ChangePower extends TriggeredMechanic {
    protected static id = 'ChangePower';
    protected static validCardTypes = new Set([CardType.Enchantment]);
    protected static ParameterTypes = [
        { name: 'Difference', type: ParameterType.Integer }
    ];

    private desc: string;
    constructor(private diff: number = 1) {
        super();
        this.desc = diff > 0 ? 'Gain' : 'Lose';
        this.desc += ' ' + Math.abs(diff) + ' power.';
    }

    public onTrigger(card: Card, game: Game) {
        let enchantment = card as Enchantment;
        enchantment.changePower(this.diff);
    }

    public remove(card: Card, game: Game) {
        game.gameEvents.removeEvents(this);
    }

    public getText(card: Card) {
        return this.desc;
    }

    public evaluateEffect() {
        return this.diff;
    }
}

export class CannotBeEmpowered extends Mechanic {
    protected static validCardTypes = new Set([CardType.Enchantment]);
    protected static id = 'CannotBeEmpowered';

    public enter(card: Card, game: Game) {
        (card as Enchantment).setEmpowerable(false);
    }

    public remove(card: Card, game: Game) {
        (card as Enchantment).setEmpowerable(true);
    }

    public getText(card: Card) {
        return `Cannot be empowered.`;
    }

    public evaluate() {
        return -5;
    }
}


export class CannotBeDiminished extends Mechanic {
    protected static id = 'CannotBeDiminished';
    protected static validCardTypes = new Set([CardType.Enchantment]);

    public enter(card: Card, game: Game) {
        (card as Enchantment).setDiminishable(false);
    }

    public remove(card: Card, game: Game) {
        (card as Enchantment).setDiminishable(true);
    }

    public getText(card: Card) {
        return `Cannot be diminished.`;
    }

    public evaluate() {
        return 5;
    }
}

