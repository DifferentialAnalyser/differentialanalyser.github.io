import { CustomVariablesElement } from "./UI/CustomVariablesElement.ts";
import { DraggableComponentElement } from "./UI/DraggableElement.ts";
import { Config } from "./config";

/**
 * Find a shaft with a specific class name that matches the predicate
 */
function getShaft(className: string, predicate: (x: number, y: number, w: number, h: number) => boolean): number | null {
  const shafts = document.querySelectorAll(`.${className}`) as NodeListOf<DraggableComponentElement>;
  for (let i = 0; i < shafts.length; i++) {
    const vShaft = shafts[i] as DraggableComponentElement;

    if (predicate(vShaft.left, vShaft.top, vShaft.width, vShaft.height)) {
      return vShaft.componentID;
    }
  }

  return null;
}

/**
 * Get the vertical shaft ID that goes through x, y if it exists
 */
export function getVShaftID(x: number, y: number): number | null {
  return getShaft("vShaft", (sX, sY, _, sH) => {
    return (sX == x) && (sY <= y && sY + sH - 1 >= y);
  });
}

/**
 * Get the horizontal shaft ID that goes through x, y if it exists
 */
export function getHShaftID(x: number, y: number): number | null {
  return getShaft("hShaft", (sX, sY, sW) => {
    return (sY == y) && (sX <= x && sX + sW - 1 >= x);
  });
}


/**
 * Takes all placed-components in the dom and creates a JSON object representing the 
 * current machine
 */
export function toConfig(): [Config, number[]] {
  const elements = document.querySelectorAll(".placed-component:not(.dragged)") as NodeListOf<DraggableComponentElement>;
  const shaftElements = Array.from(elements).filter(element => element.componentType.endsWith("Shaft"));

  // Generate the configuration for all the shafts
  const config1 = Array.from(shaftElements).map((thisComponent) => {
    if ((thisComponent.componentType === "vShaft") || (thisComponent.componentType === "hShaft")) {
      const id = thisComponent.componentID;
      const start = [Number(thisComponent.left), Number(thisComponent.top)];

      const shaft: any = { id, start };

      if (thisComponent.componentType === "vShaft") {
        shaft.end = [Number(thisComponent.left), Number(thisComponent.top) + thisComponent.height - 1];
      } else if (thisComponent.componentType === "hShaft") {
        shaft.end = [Number(thisComponent.left) + thisComponent.width - 1, Number(thisComponent.top)];
      }
      return shaft;
    }
  });

  const componentElements = Array.from(elements).filter(element => !element.componentType.endsWith("Shaft"));

  // Generate the config for every placed component using the export fn defined within the components
  const config2 = Array.from(componentElements).map((thisComponent) => {
    const type = thisComponent.componentType;
    const compID = thisComponent.componentID;
    const position = [Number(thisComponent.left), Number(thisComponent.top)];

    let result = null;

    switch (thisComponent.componentType) {
      case 'crossConnect':
        {
          const { reversed } = thisComponent.export_fn(thisComponent).data;

          const vertical = getVShaftID(position[0], position[1]);
          const horizontal = getHShaftID(position[0], position[1]);

          if (vertical === null || horizontal == null) {
            break;
          }

          result = { type, compID, position, reversed, vertical, horizontal }
          break;
        }
      case 'integrator':
        {
          const { initialPosition } = thisComponent.export_fn(thisComponent).data;

          const outputShaft = getVShaftID(position[0] + 1, position[1] - 1);
          const variableOfIntegrationShaft = getVShaftID(position[0] + 2, position[1] - 1);
          const integrandShaft = getVShaftID(position[0] + 3, position[1] - 1);

          if (outputShaft === null || variableOfIntegrationShaft === null || integrandShaft === null) {
            break;
          }

          result = { type, compID, position, outputShaft, variableOfIntegrationShaft, integrandShaft, initialPosition };
          break;
        }
      case 'functionTable':
        {
          const { x_min, x_max, y_min, y_max, lookup, fn } = thisComponent.export_fn(thisComponent).data;

          const inputShaft = getVShaftID(position[0] + 2, position[1] + 4);
          const outputShaft = getVShaftID(position[0] + 3, position[1] + 4);

          if (inputShaft === null || outputShaft === null) {
            break;
          }

          result = { type, compID, position, x_min, x_max, y_min, y_max, inputShaft, outputShaft, lookup, fn }
          break;
        }
      case 'differential':
        {
          const diffShaft1 = getHShaftID(position[0], position[1]);
          const sumShaft = getHShaftID(position[0], position[1] + 1);
          const diffShaft2 = getHShaftID(position[0], position[1] + 2);

          if (diffShaft1 === null || sumShaft === null || diffShaft2 === null) {
            break;
          }

          result = { type, compID, position, diffShaft1, sumShaft, diffShaft2 }
          break;
        }
      case 'outputTable':
        {
          const { x_min, x_max, y_min, y_max, initialY1, initialY2 } = thisComponent.export_fn(thisComponent).data;

          const inputShaft = getVShaftID(position[0] + 1, position[1] + 4);
          const outputShaft1 = getVShaftID(position[0] + 2, position[1] + 4);
          const outputShaft2 = getVShaftID(position[0] + 3, position[1] + 4);

          if (inputShaft === null || (outputShaft1 === null && outputShaft2 === null)) {
            break;
          }

          result = { type, compID, position, x_min, x_max, y_min, y_max, inputShaft, outputShaft1, outputShaft2, initialY1, initialY2 };
          break;
        }
      case 'motor':
        {
          const { reversed } = thisComponent.export_fn(thisComponent).data;

          const outputShaft = getHShaftID(position[0] + 2, position[1]);

          if (outputShaft === null) {
            break;
          }

          result = { type, compID, position, reversed, outputShaft };
          break;
        }

      case 'multiplier':
        {
          const { factor } = thisComponent.export_fn(thisComponent).data;

          const inputShaft = getVShaftID(position[0] + 2, position[1] - 1);
          const outputShaft = getVShaftID(position[0] + 1, position[1] - 1);
          const multiplicandShaft = getVShaftID(position[0], position[1] - 1);

          if (inputShaft === null || outputShaft === null) {
            break;
          }

          result = { type, compID, position, factor, inputShaft, outputShaft, multiplicandShaft };
          break;
        }
      case "label":
        {
          const { width, height, align, _comment } = thisComponent.export_fn(thisComponent).data;

          const size = [Number(width), Number(height)];
          result = { type, compID, position, size, align, _comment };
          break;
        }
      case "gearPair":
        {
          const { inputRatio, outputRatio } = thisComponent.export_fn(thisComponent).data;

          const shaft1 = getHShaftID(position[0], position[1]);
          const shaft2 = getHShaftID(position[0], position[1] + 1);

          if (shaft1 === null || shaft2 === null) {
            break;
          }

          result = { type, compID, position, inputRatio, outputRatio, shaft1, shaft2 };
          break;
        }
      case "dial":
        {
          const shaft1 = getHShaftID(position[0], position[1]);
          const shaft2 = getVShaftID(position[0], position[1]);

          if (shaft1 === null && shaft2 === null) {
            break;
          }

          result = { type, compID, position, inputShaft: shaft1 ?? shaft2 };
          break;
        }
    }

    if (result === null) {
      result = { type: "unconnected", compID };
    }

    return result;
  });

  // Compose all the configs into one
  const shafts = config1;
  const components: any = config2;
  const constants = (document.querySelector("custom-variables")! as CustomVariablesElement).getText();
  const settings = {
    "custom_variables": constants,
  };

  const config: Config = { shafts, components: components.filter((x: { type: string }) => x.type !== "unconnected"), settings };
  return [config, components.filter((x: { type: string }) => x.type === "unconnected").map((x: { compID: number }) => x.compID)];
}
