import { Game } from '../../Game';
import { Targeter } from '../../targeter';
import { Card } from '../../card';
import { Unit, UnitType } from '../../unit';
import { GameEvent, EventType } from '../../gameEvent';
import { Trigger } from '../../trigger';
import { EvalContext } from '../../mechanic';

export class OnDeath extends Trigger {
    protected static id = 'OnDeath';

    public getName() {
        return 'Death';
    }

    public register(card: Card, game: Game) {
        let unit = card as Unit;
        unit.getEvents().addEvent(this, new GameEvent(EventType.Death, (params) => {
            this.mechanic.onTrigger(card, game);
            return params;
        }));
    }

    public unregister(card: Card, game: Game) {
        (card as Unit).getEvents().removeEvents(this);
    }

    public evaluate(host: Card, game: Game, context: EvalContext) {
        if (context === EvalContext.LethalRemoval)
            return 0.25;
        return 0.9;
    }
}

export class OnDeathAnyDeath extends Trigger {
    protected static id = 'OnDeathAnyDeath';

    public getName() {
        return 'Death';
    }

    public register(card: Card, game: Game) {
        let unit = card as Unit;
        unit.getEvents().addEvent(this, new GameEvent(EventType.Death, (params) => {
            this.mechanic.onTrigger(card, game);
            return params;
        }));
        game.gameEvents.addEvent(this, new GameEvent(EventType.UnitDies, (params) => {
            this.mechanic.onTrigger(card, game);
            return params;
        }));
    }

    public unregister(card: Card, game: Game) {
        (card as Unit).getEvents().removeEvents(this);
    }

    public evaluate(host: Card, game: Game, context: EvalContext) {
        return 2;
    }
}

