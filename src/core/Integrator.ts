/**
 * @file Integrator.ts
 * @description This file contains the definition of the Integrator class, which implements the Device interface.
 * The Integrator class is responsible for integrating the input shafts and providing an output shaft.
 * @author Simon Solca, Hanzhang Shen
 */

import { Device } from "./Device";
import { Shaft } from "./Shaft";

/**
 * @class Integrator
 * @description The Integrator class is responsible for integrating the input shafts and providing an output shaft.
 * @implements Device
 */
export class Integrator implements Device {
    id: number;
    private output: Shaft | undefined;
    private integrand: Shaft | undefined;
    private diskPosition: number;
    private variableOfIntegration: Shaft | undefined;
    private readonly wheelRadius: number = 1;
    private reverse: boolean = false;

    /**
     * @constructor
     * @description The constructor of the Integrator class.
     * @param variableOfIntegration The shaft that represents the differential dx.
     * @param integrand The shaft that represents the integrand f(x).
     * @param output The output shaft that represents the angular speed of the wheel.
     */
    constructor(id: number, variableOfIntegration: Shaft | undefined, integrand: Shaft | undefined, output: Shaft | undefined,
        reverse: boolean,
        initialPosition: number) {
        this.id = id;
        this.output = output;
        this.integrand = integrand;
        this.variableOfIntegration = variableOfIntegration;
        this.reverse = reverse
        this.diskPosition = initialPosition;
    }

    shafts_defined(): boolean {
        return !(!this.output || !this.integrand || !this.variableOfIntegration);
    }

    /**
     * @method determineOutput
     * @description This method calculates the angular speed of the wheel by integrating the input shafts.
     * @returns The output shaft that represents the angular speed of the wheel.
    */
    determine_output(): Shaft | undefined {
        return this.output;
    }

    /**
     * @method update
     * @description This method calculates the angular speed of the wheel by integrating the input shafts.
    */
    update(dt: number = 1) {
        if (!this.shafts_defined()) return;

        // Linear speed of the wheel = f(x) * dx.
        this.diskPosition += this.integrand!.get_rotation_rate();
        let wheelLinearSpeed = this.variableOfIntegration!.get_rotation_rate() * this.diskPosition;
        let wheelAngularSpeed = wheelLinearSpeed / this.wheelRadius;
        if (this.reverse) {
            wheelAngularSpeed = -wheelAngularSpeed
        }
        this.output?.set_rotation_rate(wheelAngularSpeed);
    }

    getID(): number { return this.id; }

    getVariableIntegrandShaft(): Shaft | undefined {
        return this.variableOfIntegration;
    }

    getDiskPosition(): number {
        return this.diskPosition;
    }

}
