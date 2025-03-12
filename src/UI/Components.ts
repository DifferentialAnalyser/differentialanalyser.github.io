import { html, render } from "lit";
import { DraggableComponentElement } from "./DraggableElement.ts";
import { GraphElement } from "./GraphElement.ts";
import { generator } from "../index.ts";
import { openIntegratorPopup, openMultiplierPopup, openGearPairPopup, openFunctionTablePopup, openOutputTablePopup, openCrossConnectPopup, openLabelPopup } from "./Popups.ts"
import { selectShaft } from "./SelectShaft.ts";

import Vector2 from "./Vector2.ts";
import { GRID_SIZE } from "./Grid.ts";
import { GearPairComponentElement } from "./GearPairComponentElement.ts";
import { CrossConnectComponentElement } from "./CrossConnectComponentElement.ts";
import Expression from "@src/expr/Expression.ts";
import { machine } from "./Constants.ts";
import { get_global_ctx, isRunning } from "@src/Lifecycle.ts";
import { DialComponentElement } from "./DialComponentElement.ts";
import { IntegratorComponentElement } from "./IntegratorComponent.ts";
import { MultiplierComponentElement } from "./MultiplierComponentElement.ts";

// An enum representing all placeable components
export enum ComponentType {
    VShaft,
    HShaft,
    CrossConnect,
    Integrator,
    FunctionTable,
    Differential,
    OutputTable,
    Motor,
    Multiplier,
    Label,
    GearPair,
    Dial,
};

// The current maximum ID in the program and a list of free_ids that can
// be selected form
let max_id = 0;
let free_ids: number[] = [];

/**
 * Convert from a string to an enum
 *
 * @param componentName The string that should be converted to an enum
 * @returns The enum representation of the string
 */
export function stringToComponent(componentName: string): ComponentType | null {
    return ComponentType[componentName as keyof typeof ComponentType];
}

/**
 * From an component enum, create a new DraggableComponentElement for that component
 *
 * @param component The enum that is used to create the DraggableComponentElement
 * @returns A DraggableComponentElement representing the new component
 */
export function createComponent(component: ComponentType): DraggableComponentElement {
    const comp = document.createElement("draggable-component") as DraggableComponentElement;

    comp.classList.add("placed-component")

    // Event Listeners used for
    comp.style.position = "absolute";
    comp.addEventListener("mouseover", mouseOver);
    comp.addEventListener("mouseleave", mouseLeave);

    // Create a new ID for the component
    setID(comp);

    // Call the relevant constructor for the component
    switch (component) {
        case ComponentType.VShaft:
            createVShaft(comp);
            break;
        case ComponentType.CrossConnect:
            createCrossConnect(comp);
            break;
        case ComponentType.HShaft:
            createHShaft(comp);
            break;
        case ComponentType.Integrator:
            createIntegrator(comp);
            break;
        case ComponentType.FunctionTable:
            createFunctionTable(comp);
            break;
        case ComponentType.Differential:
            createDifferential(comp);
            break;
        case ComponentType.OutputTable:
            createOutputTable(comp);
            break;
        case ComponentType.Motor:
            createMotor(comp);
            break;
        case ComponentType.Multiplier:
            createMultiplier(comp);
            break;
        case ComponentType.Label:
            createLabel(comp);
            break;
        case ComponentType.GearPair:
            createGearPair(comp);
            break;
        case ComponentType.Dial:
            createDial(comp);
            break;
        default:
            console.error("No function defined for component: ", component);
    }

    // Add classes to get the tooltips displaying correctly
    comp.classList.add("tooltip");
    comp.classList.add("top");

    return comp;
}

/**
 * Reset the stored ID tracking
 */
export function resetIDs(): void {
    free_ids = [];
    max_id = 0;
}

/**
 * For every placed component, create a new ID for each one to ensure that each
 * has a new unique ID
 */
export function regenerateIDs(): void {
    resetIDs();
    console.log("Clear IDs");

    (document.querySelectorAll(".placed-component") as NodeListOf<DraggableComponentElement>).forEach((x: DraggableComponentElement) => {
        setID(x);
    })
}

/**
 * Adds the ID of component to the list of free IDs
 *
 * @param component The component that should will have its ID freed
 */
export function deleteComponent(component: DraggableComponentElement): void {
    free_ids.push(component.componentID);
}

/**
 * Create a new unique ID
 * If free_ids is empty then use max_id and increment it
 * Otherwise use an ID from free_ids
 *
 * @returns A unique ID
 */
export function createUniqueID(): number {
    if (free_ids.length == 0) {
        let id = max_id;
        max_id += 1;
        return id;
    } else {
        let value = free_ids.pop()!;
        return value;
    }
}

/**
 * Set the internal ID and html ID of a DraggableComponent
 *
 * @param div The div that should have its ID changed
 */
function setID(div: DraggableComponentElement): void {
    const v = createUniqueID();
    div.componentID = v
    div.id = "component-" + v;
}

/**
 * Construct a Vertical shaft
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a Vertical Shaft
 */
function createVShaft(div: DraggableComponentElement): void {
    // The default size of the component when rendered
    div.width = 1;
    div.height = 2;
    // The class of the component used for rendering
    div.componentType = "vShaft";
    div.shouldLockCells = false;;
    div.classList.add("vShaft");

    div.addEventListener("click", selectShaft);

    render(html`<shaft-component style="width:100%;height:100%"></shaft-component>`, div);

    // The repesentation of the vertical shaft in the config
    type ExportedData = {
        top: number,
        left: number,
        height: number,
    };

    // Define the function that is used when exporting a vertical shaft
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.VShaft,
            data: {
                top: _this.top,
                left: _this.left,
                height: _this.height,
            }
        };
    };

    // Define the function that is used when importing data for a vertical shaft
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top,
            _this.left = data.left,
            _this.height = data.height;
    }
}

/**
 * Construct a Cross connect
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a cross connect
 */
function createCrossConnect(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 1;
    div.height = 1;
    // The class of the component for rendering
    div.componentType = "crossConnect";
    div.shouldLockCells = true;
    div.classList.add("crossConnect");

    // Open the cross connect popup on mouseup
    div.addEventListener("mouseup", openCrossConnectPopup);

    render(html`<cross-connect-component teeth="6" style="width:100%;height:100%"></cross-connect-component>`, div);

    // Representation of the cross connect in the config
    type ExportedData = {
        top: number,
        left: number,
        reversed: boolean;
    };

    // Define the function that is used when exporting a cross connect
    div.export_fn = (_this) => {
        const connect = _this.querySelector("cross-connect-component") as CrossConnectComponentElement;
        return {
            _type: ComponentType.CrossConnect,
            data: {
                top: _this.top,
                left: _this.left,
                reversed: connect.inverted,
            },
        };
    };

    // Define the function that is used when importing data for a cross connect
    div.import_fn = (_this, data: ExportedData) => {
        const connect = _this.querySelector("cross-connect-component") as CrossConnectComponentElement;
        _this.top = data.top;
        _this.left = data.left;

        connect.inverted = data.reversed;
    };
}

/**
 * Construct a Horizontal shaft
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a Horizontal Shaft
 */
function createHShaft(div: DraggableComponentElement): void {
    // The default size of the component when rendered
    div.width = 2;
    div.height = 1;
    // The class of the component used for rendering
    div.componentType = "hShaft";
    div.shouldLockCells = false;;
    div.classList.add("hShaft");

    div.addEventListener("click", selectShaft);

    render(html`<shaft-component style="width: 100%;height:100%" horizontal></shaft-component>`, div);

    // The repesentation of the horizontal shaft in the config
    type ExportedData = {
        top: number,
        left: number,
        width: number,
    };

    // Define the function that is used when exporting a horizontal shaft
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.HShaft,
            data: {
                top: _this.top,
                left: _this.left,
                width: _this.width,
            }
        };
    };

    // Define the function that is used when importing data for a horizontal shaft
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top,
            _this.left = data.left,
            _this.width = data.width;
    }
}

/**
 * Construct an integrator
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * an integrator
 */
function createIntegrator(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 4;
    div.height = 2;
    // The class of the component used for rendering
    div.componentType = "integrator";
    div.shouldLockCells = true;
    div.classList.add("integrator");
    // Default disk position offset
    div.inputRatio = 0;

    render(html`<integrator-component style="width:100%;height:100%"></integrator-component>`, div);

    // Open the integrator popup on mouseup
    div.addEventListener("mouseup", openIntegratorPopup);

    // Representation of the integrator in the config
    type ExportedData = {
        top: number,
        left: number,
        initialPosition: string,
    };

    // Define the function that is used when exporting an integrator
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.Integrator,
            data: {
                top: _this.top,
                left: _this.left,
                initialPosition: _this.dataset.initialValue ?? "0",
            },
        };
    };

    // Define the function that is used when importing data for an integrator
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top;
        _this.left = data.left;
        _this.dataset.initialValue = data.initialPosition;

        // Evaluate the stored string for the integrator disk position
        const comp = _this.querySelector("integrator-component")! as IntegratorComponentElement;
        comp.set_value(Expression.eval(_this.dataset.initialValue, get_global_ctx()));
    };
}

/**
 * Construct a function table
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a function table
 */
function createFunctionTable(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 4;
    div.height = 4;
    // The class of the component used for rendering
    div.componentType = "functionTable";
    div.shouldLockCells = true;
    div.classList.add("functionTable");

    // Open the function table popup on mouseup
    div.addEventListener("mouseup", openFunctionTablePopup);

    // Create the underlying graph element
    let graph = document.createElement("graph-table") as GraphElement;
    graph.setAttribute("style", "width:100%;height:100%");
    graph.setAttribute("x-min", "0.0");
    graph.setAttribute("x-max", "10.0");
    graph.setAttribute("y-min", "-1.5");
    graph.setAttribute("y-max", "1.5");
    graph.setAttribute("gantry-x", "0.0");
    graph.setAttribute("padding", "5");
    graph.isAnOutput = false;

    // Set the initial dataset to be nothing
    graph.set_data_set("d1", []);

    // Add an event listener for when the global constants have changed
    div.addEventListener("constantschanged", _ => {
        if (!isRunning) {
            // If the simulation is not running then re-evaluate all the stored expressions
            graph.x_min = Expression.eval(div.dataset.x_min ?? `${graph.x_min}`, get_global_ctx());
            graph.x_max = Expression.eval(div.dataset.x_max ?? `${graph.x_max}`, get_global_ctx());
            graph.y_min = Expression.eval(div.dataset.y_min ?? `${graph.y_min}`, get_global_ctx());
            graph.y_max = Expression.eval(div.dataset.y_max ?? `${graph.y_max}`, get_global_ctx());

            let compiled_expr = Expression.compile(graph.data_sets["d1"].fn ?? "0", get_global_ctx());
            let generator_exp = generator(500, graph.x_min, graph.x_max, x => compiled_expr({ x }));
            graph.mutate_data_set("d1", points => {
                points.splice(0, points.length, ...Array.from(generator_exp));
            }, true);
        }
    });

    div.appendChild(graph);

    // Representation of the function table in the config
    type ExportedData = {
        top: number,
        left: number,
        x_min: string,
        x_max: string,
        y_min: string,
        y_max: string,
        gantry_x?: number,
        lookup: boolean,
        fn: string,
    };

    // Define the function that is used when exporting a function table
    div.export_fn = (_this) => {
        let graph_element = _this.querySelector("graph-table") as GraphElement;

        // Ensure that if the data has not been set then use a default value
        return {
            _type: ComponentType.FunctionTable,
            data: {
                top: _this.top,
                left: _this.left,
                x_min: _this.dataset.x_min ?? String(graph_element.x_min),
                x_max: _this.dataset.x_max ?? String(graph_element.x_max),
                y_min: _this.dataset.y_min ?? String(graph_element.y_min),
                y_max: _this.dataset.y_max ?? String(graph_element.y_max),
                gantry_x: graph_element.gantry_x,
                lookup: (!_this.dataset.lookup) ? false : (_this.dataset.lookup == "1"),
                fn: graph_element.data_sets["d1"]?.fn ?? "",
            }
        };
    };

    // Define the function that is used when importing data for a function table
    div.import_fn = (_this, data: ExportedData) => {
        let graph_element = _this.querySelector("graph-table") as GraphElement;

        _this.top = data.top;
        _this.left = data.left;

        _this.dataset.x_min = data.x_min;
        _this.dataset.x_max = data.x_max;
        _this.dataset.y_min = data.y_min;
        _this.dataset.y_max = data.y_max;
        _this.dataset.lookup = (!data.lookup) ? "0" : (data.lookup ? "1" : "0");

        // Evaluate the stored expressions for the function table
        graph_element.x_min = Expression.eval(_this.dataset.x_min, get_global_ctx());
        graph_element.x_max = Expression.eval(_this.dataset.x_max, get_global_ctx());
        graph_element.y_min = Expression.eval(_this.dataset.y_min, get_global_ctx());
        graph_element.y_max = Expression.eval(_this.dataset.y_max, get_global_ctx());
        graph_element.gantry_x = data.gantry_x;

        if (data.fn !== undefined && data.fn != "") {
            let compiled_expr = Expression.compile(data.fn, get_global_ctx());
            let generator_exp = generator(500, graph.x_min, graph.x_max, x => compiled_expr({ x }));
            graph_element.set_data_set("d1", Array.from([...generator_exp]));
            graph_element.data_sets["d1"].fn = data.fn;
        }
    }
}

/**
 * Construct a differential
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a differential
 */
function createDifferential(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 1;
    div.height = 3;
    // The class of the component used for rendering
    div.componentType = "differential";
    div.shouldLockCells = true;
    div.classList.add("differential");

    render(html`<differential-component style="width:100%;height:100%"></differential-component>`, div);

    // Representation of the integrator in the config
    type ExportedData = {
        top: number,
        left: number,
    };

    // Define the function that is used when exporting a differential
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.Differential,
            data: {
                top: _this.top,
                left: _this.left,
            },
        };
    };

    // Define the function that is used when importing data for a differential
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top;
        _this.left = data.left;
    };
}

/**
 * Construct an output table
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * an output table
 */
function createOutputTable(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 4;
    div.height = 4;
    // The class of the component used for rendering
    div.componentType = "outputTable";
    div.shouldLockCells = true;
    div.classList.add("outputTable");

    // Open the output table popup on mouseup
    div.addEventListener("mouseup", openOutputTablePopup);

    render(html`
    <graph-table
      style="width:100%;height:100%"
      x-min="0.0"
      x-max="10.0"
      y-min="-1.5"
      y-max="1.5"
      gantry-x="0.0"
      padding="5"
    >
    </graph-table>
  `, div)

    // Create the underlying graph element
    let graph = div.querySelector("graph-table") as GraphElement;

    // Set the initial data sets
    graph.set_data_set("d1", [{ x: 0, y: 0 }], "blue");
    graph.set_data_set("d2", [{ x: 0, y: 0 }], "red", true);
    graph.isAnOutput = true;

    // Add an event listener for when the global constants have changed
    div.addEventListener("constantschanged", _ => {
        if (!isRunning) {
            // If the simulation is not running then re-evaluate all the stored expressions
            graph.x_min = Expression.eval(div.dataset.x_min ?? `${graph.x_min}`, get_global_ctx());
            graph.x_max = Expression.eval(div.dataset.x_max ?? `${graph.x_max}`, get_global_ctx());
            graph.y_min = Expression.eval(div.dataset.y_min ?? `${graph.y_min}`, get_global_ctx());
            graph.y_max = Expression.eval(div.dataset.y_max ?? `${graph.y_max}`, get_global_ctx());

            let compiled_expr = Expression.compile(graph.data_sets["d1"].fn ?? "0", get_global_ctx());
            let generator_exp = generator(500, graph.x_min, graph.x_max, x => compiled_expr({ x }));
            graph.mutate_data_set("d1", points => {
                points.splice(0, points.length, ...Array.from(generator_exp));
            }, true);
        }
    });

    // Representation of the output table in the config
    type ExportedData = {
        top: number,
        left: number,
        x_min: string,
        x_max: string,
        y_min: string,
        y_max: string,
        initialY1: string,
        initialY2: string,
        gantry_x?: number,
        data_sets: {
            [key: string]: {
                points: Vector2[],
                style: string,
                invert_head: boolean,
            },
        },
    };

    // Define the function that is used when exporting an output table
    div.export_fn = (_this) => {
        let graph_element = _this.querySelector("graph-table") as GraphElement;

        // Ensure that if the data has not been set then use a default value
        return {
            _type: ComponentType.OutputTable,
            data: {
                top: _this.top,
                left: _this.left,
                x_min: _this.dataset.x_min ?? String(graph_element.x_min),
                x_max: _this.dataset.x_max ?? String(graph_element.x_max),
                y_min: _this.dataset.y_min ?? String(graph_element.y_min),
                y_max: _this.dataset.y_max ?? String(graph_element.y_max),
                gantry_x: graph_element.gantry_x,
                initialY1: _this.dataset.initial_1 ?? String(_this.inputRatio),
                initialY2: _this.dataset.initial_2 ?? String(_this.outputRatio),
            }
        };
    };

    // Define the function that is used when importing data for an output table
    div.import_fn = (_this, data: ExportedData) => {
        let graph_element = _this.querySelector("graph-table") as GraphElement;

        _this.top = data.top;
        _this.left = data.left;

        _this.dataset.x_min = data.x_min;
        _this.dataset.x_max = data.x_max;
        _this.dataset.y_min = data.y_min;
        _this.dataset.y_max = data.y_max;
        _this.dataset.initial_1 = (data.initialY1) ?? "0";
        _this.dataset.initial_2 = data.initialY2 ?? "0";

        // Evaluate the stored expressions for the output table
        graph_element.x_min = Expression.eval(_this.dataset.x_min, get_global_ctx());
        graph_element.x_max = Expression.eval(_this.dataset.x_max, get_global_ctx());
        graph_element.y_min = Expression.eval(_this.dataset.y_min, get_global_ctx());
        graph_element.y_max = Expression.eval(_this.dataset.y_max, get_global_ctx());
        graph_element.gantry_x = data.gantry_x;
        _this.inputRatio = Expression.eval(_this.dataset.initial_1, get_global_ctx());
        _this.outputRatio = Expression.eval(_this.dataset.initial_2, get_global_ctx());
    }
}

/**
 * Construct a motor
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a motor
 */
function createMotor(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 2;
    div.height = 1;
    // The class of the component used for rendering
    div.componentType = "motor";
    div.shouldLockCells = true;
    div.classList.add("motor");

    render(html`<motor-component style="width:100%;height:100%"></motor-component>`, div);

    // Representation of the motor in the config
    type ExportedData = {
        top: number,
        left: number
    };

    // Define the function that is used when exporting a motor
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.Motor,
            data: {
                top: _this.top,
                left: _this.left,
            },
        };
    };

    // Define the function that is used when importing data for a motor
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top;
        _this.left = data.left;
    };
}

/**
 * Construct a multiplier
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a multiplier
 */
function createMultiplier(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 3;
    div.height = 2;
    // The class of the component used for rendering
    div.componentType = "multiplier";
    div.shouldLockCells = true;
    div.classList.add("multiplier");

    // Open the multiplier popup on mouseup
    div.addEventListener("mouseup", openMultiplierPopup);

    render(html`<multiplier-component style="width:100%;height:100%"></multiplier-component>`, div);

    // Representation of the multiplier in the config
    type ExportedData = {
        top: number,
        left: number,
        factor: string,
    };

    // Define the function that is used when exporting a multiplier
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.Multiplier,
            data: {
                top: _this.top,
                left: _this.left,
                factor: _this.dataset.factor ?? "1"
            },
        };
    };

    // Define the function that is used when importing data for a multiplier
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top;
        _this.left = data.left;
        _this.dataset.factor = data.factor ?? "1";

        const comp = _this.querySelector("multiplier-component")! as MultiplierComponentElement;

        // Evaluate stored expressions
        comp.factor = Expression.eval(_this.dataset.factor, get_global_ctx());

    };
}

/**
 * Construct a label
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a label
 */
function createLabel(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 3;
    div.height = 1;
    // The class of the component used for rendering
    div.componentType = "label";
    div.shouldLockCells = false;

    div.classList.add("label");

    // Open the label popup on mouseup
    div.addEventListener("mouseup", openLabelPopup);

    // Called to re-render the text of the label
    let render_p = () => {
        const para = div.querySelector("p") as HTMLParagraphElement;
        let align = "center";
        if (para != null) {
            align = para.style.textAlign;
        }

        render(html`<p style="color:black;text-align: center;font-size:${GRID_SIZE / 2}px;width:100%;padding:2px;margin:0;">This is a label</p>`, div);

        if (para != null) {
            para.style.textAlign = align;
        }
    }

    // Re-render the text on scroll and zoom
    machine.addEventListener("wheel", render_p);
    machine.addEventListener("touchmove", e => { if (e.touches.length == 2) render_p(); });
    render_p();

    // Representation of the label in the config
    type ExportedData = {
        top: number,
        left: number,
        width: number,
        height: number,
        align: string,
        _comment: string,
    };

    // Define the function that is used when exporting a label
    div.export_fn = (_this) => {
        let p = _this.querySelector("p")!;
        return {
            _type: ComponentType.Label,
            data: {
                top: _this.top,
                left: _this.left,
                height: _this.height,
                width: _this.width,
                align: p.style.textAlign,
                _comment: p.textContent,
            }
        };
    };

    // Define the function that is used when importing data for a label
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top;
        _this.left = data.left;
        _this.height = data.height;
        _this.width = data.width;

        let p = _this.querySelector("p")!;
        p.style.textAlign = data.align;
        p.textContent = data._comment;
    };
}

/**
 * Construct a gear pair
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * an gear pair
 */
function createGearPair(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 1;
    div.height = 2;
    // The class of the component used for rendering
    div.componentType = "gearPair";
    div.shouldLockCells = true;
    div.classList.add("gearPair");

    // Open the gear pair popup on mouseup
    div.addEventListener("mouseup", openGearPairPopup);

    render(html`<gear-pair-component style="width:100%;height:100%"></gear-pair-component>`, div);

    // Representation of the gear pair in the config
    type ExportedData = {
        top: number,
        left: number,
        inputRatio: number;
        outputRatio: number;
    };

    // Define the function that is used when exporting a gear pair
    div.export_fn = (_this) => {
        const gear_pair = _this.querySelector("gear-pair-component") as GearPairComponentElement;
        return {
            _type: ComponentType.GearPair,
            data: {
                top: _this.top,
                left: _this.left,
                inputRatio: gear_pair.ratio_top,
                outputRatio: gear_pair.ratio_bottom,
            },
        };
    };

    // Define the function that is used when importing data for a gear pair
    div.import_fn = (_this, data: ExportedData) => {
        const gear_pair = _this.querySelector("gear-pair-component") as GearPairComponentElement;
        _this.top = data.top;
        _this.left = data.left;
        gear_pair.ratio_top = data.inputRatio ?? 1;
        gear_pair.ratio_bottom = data.outputRatio ?? 1;
    };
}

/**
 * Construct a dial
 *
 * @param div The DraggableComponentElement that will be instantiated to represent
 * a dial
 */
function createDial(div: DraggableComponentElement): void {
    // The size of the component when rendered
    div.width = 1;
    div.height = 1;
    // The class of the component used for rendering
    div.componentType = "dial";
    div.shouldLockCells = true;
    div.classList.add("dial");

    render(html`<dial-component style="width:100%;height:100%"></dial-component>`, div);

    // Representation of the dial in the config
    type ExportedData = {
        top: number,
        left: number,
    };

    // Define the function that is used when exporting a label
    div.export_fn = (_this) => {
        return {
            _type: ComponentType.Dial,
            data: {
                top: _this.top,
                left: _this.left,
            },
        };
    };

    // Define the function that is used when importing data for a label
    div.import_fn = (_this, data: ExportedData) => {
        _this.top = data.top;
        _this.left = data.left;
    };
}

/**
 * Find the tooltip used for every component
 * If it doesnt exist then create and return it
 * Otherwise return the found div
 *
 * @returns A div used for tooltips
 */
function createTooltipElement(): HTMLDivElement {
    let div = document.querySelector("#component-tooltip") as HTMLDivElement;
    if (div != undefined) return div;

    let span = document.createElement("span") as HTMLSpanElement;
    span.classList.add("tooltiptext");

    div = document.createElement("div") as HTMLDivElement;
    div.id = "component-tooltip";
    div.appendChild(span);
    div.classList.add("tooltip");
    div.classList.add("top");

    return div;
}


/**
 * Called when the mouse is hovering over a component
 * If the component is illconfigured then display a relevant message
 * If the component is a dial then configure the dials tooltip to correctly shows its full value
 *
 * @param e The mouse event passed from the event handler
 */
function mouseOver(e: MouseEvent): void {
    const component = e.currentTarget as DraggableComponentElement;
    let componentTooltip = createTooltipElement()

    // The text of the tooltip
    let span = componentTooltip.querySelector("span")!;

    let end = true;

    // Check if the component is illconfigured and set the span text to be a
    // relevant message
    if (component.classList.contains("warning")) {
        end = false;
        span.textContent = "Component is missing required connections";
    } else if (component.classList.contains("unconnected")) {
        end = false;
        span.textContent = "Component has no powered input";
    } else if (component.classList.contains("error")) {
        end = false;
        span.textContent = "A Shaft is being driven by two inputs";
    }

    // Check the component type
    switch (component.componentType) {
        case "dial":
            // If the dial is correctly configured then set the dials tooltip so the
            // tooltip text is correctly set
            if (end) {
                const dial = component.querySelector("dial-component")! as (DialComponentElement);
                dial.tooltip = span;
                dial.updateTooltip();
                end = false;
            }
            break;

        default:
            break;
    }

    if (end) { componentTooltip.remove(); return };

    span.style.visibility = "visible";
    span.style.opacity = "1";

    let pos = component.getScreenPosition();
    let size = component.getScreenSize();
    componentTooltip.style.left = `${pos.x + size.x / 2}px`;
    componentTooltip.style.top = `${pos.y}px`;
    componentTooltip.style.position = "absolute";
    componentTooltip.style.transform = "translate(-50%, -100%)";
    componentTooltip.style.zIndex = "100";

    document.querySelector("#machine")!.appendChild(componentTooltip);
}

/**
 * Called when the mouse stops hovering over a component
 * If that component had a tooltip then remove it
 * If the component was a dial then clearup the dials tooltip
 *
 * @param e The mouse event passed from the event handler
 */
function mouseLeave(e: MouseEvent): void {
    const component = e.currentTarget as DraggableComponentElement;
    // Find the tooltip in the document
    let componentTooltip = document.querySelector("#component-tooltip") as HTMLDivElement | undefined;

    // If it doesn't exist then no cleanup is needed
    if (!componentTooltip) { return; }

    switch (component.componentType) {
        case "dial":
            // Remove the tooltip from the dial
            const dial = component.querySelector("dial-component")! as (DialComponentElement);
            dial.tooltip = undefined;
            break;
    }

    // Delete the tooltip from the document
    document.querySelector("#machine")?.removeChild(componentTooltip);
}
