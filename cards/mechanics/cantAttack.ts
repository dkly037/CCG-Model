import { Mechanic, TargetedMechanic, EvalContext } from '../../mechanic';
import { Game, GamePhase } from '../../game';
import { Targeter } from '../../targeter';
import { Card, CardType } from '../../card';
import { Unit } from '../../unit';
import { GameEvent, EventType } from '../../gameEvent';

export class CannotAttack extends Mechanic {
    protected static id = 'CannotAttack';
    protected static validCardTypes = new Set([CardType.Unit, CardType.Item]);
    public enter(card: Card, game: Game) {
        (card as Unit).setAttackDisabled(true);
    }

    public remove(card: Card, game: Game) {
        (card as Unit).setAttackDisabled(false);
    }

    public getText(card: Card) {
        return `Cannot attack.`;
    }

    evaluate() {
        return -5;
    }
}

export class CannotBlock extends Mechanic {
    protected static id = 'CannotBlock';
    protected static validCardTypes = new Set([CardType.Unit, CardType.Item]);
    public enter(card: Card, game: Game) {
        (card as Unit).setBlockDisabled(true);
    }

    public remove(card: Card, game: Game) {
        (card as Unit).setBlockDisabled(false);
    }

    public getText(card: Card) {
        return `Cannot block.`;
    }

    evaluate() {
        return -3;
    }
}

export class ImprisonTarget extends TargetedMechanic {
    protected static id = 'ImprisonTarget';
    public onTrigger(card: Card, game: Game) {
        this.targeter.getTargets(card, game).forEach(target => {
            target.addMechanic(new CannotAttack(), game);
            target.addMechanic(new CannotBlock(), game);
        });
    }

    public getText(card: Card) {
        return `Cause ${this.targeter.getTextOrPronoun()} to become unable to attack or block.`;
    }

    public evaluateTarget(source: Card, unit: Unit, game: Game) {
        return unit.evaluate(game, EvalContext.NonlethalRemoval) * 0.9 * (unit.getOwner() === source.getOwner() ? -1 : 1);
    }
}
