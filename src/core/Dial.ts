import { Device } from "./Device";
import { Shaft } from "./Shaft";

export class Dial implements Device {
    private id: number;

    constructor(id: number) {
        this.id = id;
    }

    /**
     * @method getOutput
     * @description This method calculates the nextRotation of output shaft
     * @returns The output shaft that represents the output of the Gear given the input
     */
    determine_output(): Shaft | undefined {
        return undefined;
    }

    update(_dt: number = 1): void { }

    getID(): number { return this.id; }
}
