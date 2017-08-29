import { Mechanic, TargetedMechanic } from '../../mechanic';
import { Game } from '../../Game';
import { Targeter } from '../../targeter';
import { Card } from '../../card';
import { Unit, UnitType } from '../../unit';
import { GameEvent, EventType } from '../../gameEvent';
import { CannotAttack, CannotBlock } from './cantAttack';

import { remove } from 'lodash';

export class ImprisonTarget extends TargetedMechanic {
    public run(card: Card, game: Game) {
        this.targeter.getTargets(card, game).forEach(target => {
            target.addMechanic(new CannotAttack());
            target.addMechanic(new CannotBlock());
        });
    }

    public getText(card: Card) {
        return `Cause ${this.targeter.getText()} to become unable to attack or block.`;
    }

    public evaluateTarget(owner: number, unit: Unit) {
        return unit.evaluate() * 1.25 * (unit.getOwner() == owner ? -1 : 1);
    }
}