/**
 * @file Main.ts
 * @description This file contains functions to simulate the differential analyzer
 * @author Aaron Danton, Joseph Hunt, Simon Solca, Andy Zhu, Hanzhang Shen, 
 */

import { Config, ShaftID } from "../config";
import { CrossConnect } from "./CrossConnect";
import { Device } from "./Device";
import { Differential } from "./Differential";
import { FunctionTable } from "./FunctionTable";
import { GearPair } from "./GearPair";
import { Integrator } from "./Integrator";
import { Motor } from "./Motor";
import { Multiplier } from "./Multiplier";
import { OutputTable } from "./OutputTable";
import { Shaft } from "./Shaft";
import { ConfigError } from "../ConfigError.ts";

import Expression from "../expr/Expression.ts";
import { get_global_ctx } from "@src/Lifecycle.ts";

/** Simulates the differential analyser. */
export class Simulator {
  /** Shafts for the differential analyser. Can be horizontal or vertical. */
  public shafts: Shaft[] = [];
  /** Motor that drives the differential analyser. There should be only one motor. */
  public motor: Motor | undefined;
  /** Output tables that draws the function values from input shafts. */
  public outputTables: OutputTable[] = [];
  /** Components of the differential analyser, such as integrator, differential, etc. */
  public components: Device[] = [];
  /** Components ordered based on the dependency graph. */
  public ordered_components: Device[] = [];
  /** Rotation speed of the motor. */
  private rotation: number;
  /** Initial x position of the function table. */
  private initial_x_position;
  /** Function table input.  */
  private inputFunction: (n: number) => number = Math.sin;
  private mini_steps_n: number = 100;
  private mini_steps_dt: number = 1 / this.mini_steps_n;

  /**
   * 
   * @param config Configuration object parsed from the configuration JSON file.
   * @param rotation Rotation speed of the motor.
   * @param initial_x_position Initial x position of the function table.
   * @param inputFunction Function table input.
   * @return void
   */
  constructor(
    config?: Config,
    rotation: number = 1,
    initial_x_position: number = 0,
    inputFunction?: (n: number) => number
  ) {
    this.rotation = rotation;
    this.initial_x_position = initial_x_position;
    if (inputFunction !== undefined) this.inputFunction = inputFunction;
    if (config !== undefined) {
      this.parse_config(config);
      this.setup();
    }
  }

  /**
   * @function setup
   * @description Simulates one cycle of the differential analyzer using topological sort.
   * @return void
   * @author Andy Zhu
   */
  setup(): void {
    if (this.motor === undefined) {
      throw new Error("The configuration must have at least one motor");
    }
    let ordered_devices: Device[] = [this.motor];
    let stack: Shaft[] = [this.motor.determine_output()];
    let visited: Set<number> = new Set<number>();
    let visited_devices: Set<Device> = new Set<Device>();
    visited.add(stack[0].id);
    while (stack.length > 0) {
      let shaft = stack.pop()!;
      shaft.ready_flag = true;
      for (let device of shaft.outputs) {
        let output = device.determine_output();
        if (output === undefined) continue;
        if (!visited_devices.has(device)) {
          ordered_devices.push(device);
          visited_devices.add(device);
        }
        if (!visited.has(output.id)) {
          stack.push(output);
          visited.add(output.id);
        }
      }
    }

    this.ordered_components = ordered_devices;
  }

  step() {
    // update the components
    for (let i = 0; i < this.mini_steps_n; i++) {
      for (const device of this.ordered_components) {
        device.update(this.mini_steps_dt);
      }
    }

    for (const table of this.outputTables) {
      table.update(1);
    }
  }

  check_config(): Map<number, ConfigError> {
    let result = new Map<number, ConfigError>();
    if (this.motor == undefined) {
      throw new Error("The configuration must have at least one motor");
    }
    let ordered_devices: Device[] = [this.motor];
    let stack: Shaft[] = [this.motor.determine_output()];
    let visited: Set<number> = new Set<number>();
    let visited_devices: Set<Device> = new Set<Device>();
    visited_devices.add(this.motor);
    visited.add(stack[0].id);
    while (stack.length > 0) {
      let shaft = stack.pop()!;
      // if shaft is already ready, a problem occur
      shaft.ready_flag = true;
      for (let device of shaft.outputs) {
        let output = device.determine_output();
        if (!visited_devices.has(device)) {
          ordered_devices.push(device);
          visited_devices.add(device);
          result.set(device.getID(), ConfigError.NO_ERROR);
        } else {
          continue;
        }
        if (output === undefined) continue;
        if (!visited.has(output.id)) {
          stack.push(output);
          visited.add(output.id);
          result.set(shaft.id, ConfigError.NO_ERROR);
        } else {
          result.set(shaft.id, ConfigError.FATAL_ERROR);
        }
      }
    }

    // add uniterated devices as invalid devices
    for (let device of this.components) {
      if (!visited_devices.has(device)) {
        result.set(device.getID(), ConfigError.NOT_SET_UP);
      }
    }

    // add uniterated shafts as invalid shafts
    for (let shaft of this.shafts) {
      if (!visited.has(shaft.id)) {
        result.set(shaft.id, ConfigError.NOT_SET_UP);
      }
    }

    return result;
  }

  valid_shafts(allShafts: Map<number, Shaft>, checkShafts: ShaftID[]): Boolean {
    checkShafts.forEach(e => { if (!allShafts.has(e)) { return false; } })
    return true;
  }

  /**
   * @function parse_config
   * @description Parse the config and create the corresponding shafts and devices.
   * @param config Configuration object parsed from the configuration JSON file.
   * @return void
   * @author Hanzhang Shen
   */
  parse_config(config: Config): void {
    let shafts = new Map<number, Shaft>();
    let components = [];
    let outputTables = [];
    let motor = undefined;

    // create the shafts
    for (const shaft of config.shafts) {
      shafts.set(shaft.id, new Shaft(shaft.id, []));
    }

    // create the components
    for (const component of config.components) {
      let new_component: Device;
      switch (component.type) {
        case "differential":
          if (this.valid_shafts(shafts, [component.diffShaft1, component.diffShaft2, component.sumShaft])) {
            new_component = new Differential(
              component.compID,
              shafts.get(component.diffShaft1)!,
              shafts.get(component.diffShaft2)!,
              shafts.get(component.sumShaft)!
            );
            shafts.get(component.diffShaft1)!.outputs.push(new_component);
            shafts.get(component.diffShaft2)!.outputs.push(new_component);
            shafts.get(component.sumShaft)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        case "integrator":
          if (this.valid_shafts(shafts, [component.variableOfIntegrationShaft, component.integrandShaft, component.outputShaft])) {
            new_component = new Integrator(
              component.compID,
              shafts.get(component.variableOfIntegrationShaft)!,
              shafts.get(component.integrandShaft)!,
              shafts.get(component.outputShaft)!,
              false,
              Expression.eval(String(component.initialPosition), get_global_ctx()) // Accounts for direct numbers in config
            );
            shafts
              .get(component.variableOfIntegrationShaft)!
              .outputs.push(new_component);
            shafts.get(component.integrandShaft)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        case "multiplier":
          if (this.valid_shafts(shafts, [component.inputShaft, component.outputShaft])) {
            new_component = new Multiplier(
              component.compID,
              shafts.get(component.inputShaft)!,
              shafts.get(component.outputShaft)!,
              Expression.eval(String(component.factor), get_global_ctx()), // Accounts for numbers instead of a string in config
              !component.multiplicandShaft
                ? undefined
                : shafts.get(component.multiplicandShaft)!
            );

            shafts.get(component.inputShaft)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        case "crossConnect":
          if (this.valid_shafts(shafts, [component.horizontal, component.vertical])) {
            new_component = new CrossConnect(
              component.compID,
              shafts.get(component.horizontal)!,
              shafts.get(component.vertical)!,
              component.reversed
            );
            shafts.get(component.horizontal)!.outputs.push(new_component);
            shafts.get(component.vertical)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        case "gearPair":
          if (this.valid_shafts(shafts, [component.shaft1, component.shaft2])) {
            new_component = new GearPair(
              component.compID,
              shafts.get(component.shaft1)!,
              shafts.get(component.shaft2)!,
              component.outputRatio / component.inputRatio
            );
            shafts.get(component.shaft1)!.outputs.push(new_component);
            shafts.get(component.shaft2)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        case "functionTable":
          if (this.valid_shafts(shafts, [component.inputShaft, component.outputShaft])) {
            new_component = new FunctionTable(
              component.compID,
              shafts.get(component.inputShaft)!,
              shafts.get(component.outputShaft)!,
              this.initial_x_position,
              this.inputFunction // TODO: hardcoded for now to test the engine
            );
            (new_component as FunctionTable).id = component.compID;
            shafts.get(component.inputShaft)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        case "motor":
          if (this.valid_shafts(shafts, [component.outputShaft])) {
            if (this.motor) throw new Error("Only one motor is allowed.");
            motor = new Motor(
              component.compID,
              this.rotation,
              shafts.get(component.outputShaft)!
            );
            components.push(motor);
          }
          break;

        case "outputTable":
          if (this.valid_shafts(shafts, [component.inputShaft, component.outputShaft1]) || this.valid_shafts(shafts, [component.inputShaft, component.outputShaft2])) {
            let outputTable: OutputTable;
            let outputShaft1 = component.outputShaft1;
            let outputShaft2 = component.outputShaft2;
            let swap = false;
            if (!outputShaft1) {
              outputShaft1 = component.outputShaft2;
              outputShaft2 = component.outputShaft1;
              swap = true;
            }
            if (outputShaft2) {
              outputTable = new OutputTable(
                component.compID,
                shafts.get(component.inputShaft)!,
                shafts.get(outputShaft1)!,
                Expression.eval(String(component.initialY1), get_global_ctx()), // Accounts for numbers instead of a string being passed into input
                shafts.get(outputShaft2)!,
                Expression.eval(String(component.initialY2), get_global_ctx())
              );
              shafts.get(outputShaft2)!.outputs.push(outputTable);
            } else {
              outputTable = new OutputTable(
                component.compID,
                shafts.get(component.inputShaft)!,
                shafts.get(outputShaft1)!,
                Expression.eval(String(component.initialY1), get_global_ctx())
              );
            }
            outputTable.swap = swap;
            outputTable.id = component.compID;

            shafts.get(component.inputShaft)!.outputs.push(outputTable);
            shafts.get(outputShaft1)!.outputs.push(outputTable);
            outputTables.push(outputTable);
          }
          break;

        // only from frontend
        case "label":
          break;

        case "dial":
          new_component = new (class Dial implements Device {
            private id: number;

            constructor(id: number) {
              this.id = id;
            }
            determine_output(): Shaft | undefined {
              return undefined;
            }
            update(_dt: number): void { }
            getID(): number {
              return this.id;
            }
          })(component.compID);

          if (this.valid_shafts(shafts, [component.inputShaft])) {
            shafts.get(component.inputShaft)!.outputs.push(new_component);
            components.push(new_component);
          }
          break;

        default:
          throw new Error(`Invalid component type`);
      }
    }

    this.motor = motor;
    this.shafts = Array.from(shafts.values());
    this.outputTables = outputTables;
    this.ordered_components = components;
    this.components = components;
  }
}
