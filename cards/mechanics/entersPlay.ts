import { Mechanic } from '../../mechanic';
import { Game } from '../../Game';
import { Targeter } from '../../targeter';
import { Card } from '../../card';
import { Unit, UnitType } from '../../unit';
import { GameEvent, EventType } from '../../gameEvent';

export class UnitEntersPlay extends Mechanic {
    constructor(private text: string, private effect: (source: Unit, entering:Unit, game: Game) => void) {
        super();
    }

    private triggered: boolean = false;

    public run(card: Card, game: Game) {
        let source = card as Unit;
        game.gameEvents.addEvent(this, new GameEvent(EventType.UnitEntersPlay, (params) => {
            let enteringUnit = params.get('enteringUnit') as Unit;
            this.effect(source, enteringUnit, game);
            return params;
        }));
    }

    public remove(card: Card, game: Game) {
        game.gameEvents.removeEvents(this);
    }

    public getText(card: Card) {
        return this.text;
    }
}
