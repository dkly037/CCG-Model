import { TargetedMechanic, EvalContext } from '../../mechanic';
import { Game } from '../../game';
import { Targeter } from '../../targeter';
import { Card } from '../../card';
import { Unit, UnitType } from '../../unit';
import { GameEvent, EventType } from '../../gameEvent';

export class Annihilate extends TargetedMechanic {
    protected static id = 'Annihilate';
    public onTrigger(card: Card, game: Game) {
        this.targeter.getTargets(card, game).forEach(target => {
            target.annihilate();
        });
    }

    public getText(card: Card) {
        return `Annihilate ${this.targeter.getTextOrPronoun()}.`;
    }

    public evaluateTarget(source: Card, target: Unit, game: Game) {
        return target.evaluate(game, EvalContext.NonlethalRemoval) * 1.25 * (target.getOwner() === source.getOwner() ? -1 : 1);
    }
}

export class KillTarget extends TargetedMechanic {
    protected static id = 'KillTarget';
    public onTrigger(card: Card, game: Game) {
        this.targeter.getTargets(card, game).forEach(target => {
            target.kill(true);
        });
    }

    public getText(card: Card) {
        return `Kill ${this.targeter.getTextOrPronoun()}.`;
    }

    public evaluateTarget(source: Card, target: Unit, game: Game) {
        return target.evaluate(game, EvalContext.LethalRemoval) * 1.0 * (target.getOwner() === source.getOwner() ? -1 : 1);
    }
}

