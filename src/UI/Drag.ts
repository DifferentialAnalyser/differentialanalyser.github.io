import { ComponentType, createComponent, deleteComponent, stringToComponent } from "./Components.ts"
import Vector2 from "./Vector2.ts"
import { GRID_SIZE, allValid, setCells, highlightHoveredCells, screenToWorldPosition, worldToScreenPosition, validShaft } from "./Grid.ts";
import { DraggableComponentElement } from "./DraggableElement.ts";
import { UNDO_SINGLETON } from "@src/Undo.ts";
import { endSelect } from "./SelectShaft.ts";
import { machine } from "./Constants.ts";

// A set of data that is used to store information about the currently dragged item
type DragItem = {
  item: DraggableComponentElement | null,
  mouseX: number,
  mouseY: number,
};

// Information about the current dragged item and information about the current
// dragging state
let curDragItem: DragItem = { item: null, mouseX: 0, mouseY: 0 };
let canStartDragging: boolean = false;
export let startedDragging: boolean = false;
let startDraggingRadius: number = 5;

/**
 * Create a new component from a given string at the x and y coordinates, and set
 * it as the currently dragged item
 *
 * @param x The X coordinate at which the component should be created
 * @param y The Y coordinate at which the component should be created
 * @param typeString The string that should be used to create the correct component
 */
function createNewObject(x: number, y: number, typeString: string): void {
  const componentType: ComponentType | null = stringToComponent(typeString);

  if (componentType == null)
    return;

  // Setup a new UNDO state
  UNDO_SINGLETON.push();
  // Create the component
  const item = createComponent(componentType);

  curDragItem.item = item;

  // Calculate an offset so that the mouse is centered in a cell
  const cellSize = item.getSize();
  item.offsetX = -(Math.floor((cellSize.x + 1) / 2)) * GRID_SIZE + (GRID_SIZE / 2);
  item.offsetY = -(Math.floor((cellSize.y + 1) / 2)) * GRID_SIZE + (GRID_SIZE / 2);

  const posX: number = x + item.offsetX;
  const posY: number = y + item.offsetY;

  item.classList.add("dragged");

  item.renderLeft = posX;
  item.renderTop = posY;

  canStartDragging = true;
  startedDragging = true;

  machine.appendChild(item);
}

/**
 * Setup the event that are needed for component dragging
 */
export function setupDragHooks(): void {
  // Add to all components in the UI an event
  const list = document.querySelectorAll('.component');
  list.forEach(element => {
    (element as HTMLElement).addEventListener("mousedown", creation, true);
  });

  document.addEventListener("mousemove", move, true);
  document.addEventListener("mouseup", drop, true);
}

/**
 * Create an object at the mouse position depending on some string
 *
 * @param event Given from the event handler
 */
function creation(event: MouseEvent): void {
  if (event.button != 0) return;

  const target = event.currentTarget as HTMLDivElement;
  const type: string = target.dataset.type as string;
  createNewObject(event.clientX, event.clientY, type);
}

/**
 * Calculate the top left cell of the dragged component based on the current mouse position
 *
 * @param mousePos The Current mouse position
 * @returns The grid cells that represent the top left cell of the dragged item if it exists
 */
function calculateTopLeftCell(mousePos: Vector2): Vector2 | null {
  if (curDragItem.item == null) {
    return null;
  }

  // Convert the mouse pos from screen to world position
  mousePos = screenToWorldPosition(mousePos);

  // Calculate the col and row for the mouse position
  let currentMouseCol = Math.floor(mousePos.x / GRID_SIZE);
  let currentMouseRow = Math.floor(mousePos.y / GRID_SIZE);

  // Calculate the col and row offset based on the mouse offset for the dragged item
  const offX = Math.floor(-curDragItem.item.offsetX / GRID_SIZE);
  const offY = Math.floor(-curDragItem.item.offsetY / GRID_SIZE);

  const placementCol = currentMouseCol - offX;
  const placementRow = currentMouseRow - offY;

  return new Vector2(placementCol, placementRow);
}

/**
 * Called when a mouse button is pressed down on a component
 *
 * @param event Given from the event handler
 */
export function pickup(event: MouseEvent): void {
  // Ensure that the left mouse button was pressed
  if (event.button != 0) { return }

  // Stop any higher elements being given the same event
  event.stopImmediatePropagation();

  const currentTarget = event.currentTarget as DraggableComponentElement;
  canStartDragging = true;

  UNDO_SINGLETON.push();

  // Set the clicked on item as the currently dragged item
  curDragItem.item = currentTarget;

  const pos = currentTarget.getScreenPosition();
  const diffX = pos.x - event.clientX;
  const diffY = pos.y - event.clientY;

  // Setup the mouse offset from the top left cell of the component
  currentTarget.offsetX = diffX;
  currentTarget.offsetY = diffY;

  curDragItem.mouseX = event.clientX;
  curDragItem.mouseY = event.clientY;
}

/**
 * Setup the currently dragged items previous position and free the locked cells below it
 */
function startDragging(): void {
  if (!curDragItem.item) return;

  // Refree the cells below the item that has just started to be dragged
  const size = curDragItem.item.getSize();

  let topLeft = new Vector2(0, 0);
  topLeft.x = Number(curDragItem.item.left);
  topLeft.y = Number(curDragItem.item.top);

  if (curDragItem.item.shouldLockCells) setCells(topLeft, size, false);

  highlightHoveredCells(topLeft, size, true);

  curDragItem.item.previousLeft = topLeft.x;
  curDragItem.item.previousTop = topLeft.y;
}

/**
 * Called when the mouse is moved in the document
 *
 * @param event Given from the event handler
 */
function move(event: MouseEvent): void {
  // If no item is being dragged, or we are unable to start dragging then return
  if (curDragItem.item == null || !canStartDragging) {
    return;
  }

  // Stop the event being passed to any parents in the DOM tree
  event.stopImmediatePropagation();

  // End the selection of any shafts
  endSelect(event);

  // If we have not started dragging see if the mouse has moved sufficiently far
  // enough from its initial position before starting the dragging
  if (!startedDragging) {
    curDragItem.item.classList.add("dragged");
    let diffX = event.clientX - curDragItem.mouseX;
    let diffY = event.clientY - curDragItem.mouseY;
    if (diffX * diffX + diffY * diffY < startDraggingRadius * startDraggingRadius) {
      return;
    }
    startedDragging = true;

    let e = new CustomEvent("placecomponent");
    document.dispatchEvent(e);

    startDragging();
  }

  // Calculate the topleft cell of the item
  const previousPos = calculateTopLeftCell(new Vector2(curDragItem.mouseX, curDragItem.mouseY));
  const size = curDragItem.item.getSize()

  if (previousPos == null || size == null) return;

  // Disable the highlighting below the current position of the dragged component
  highlightHoveredCells(previousPos, size, false);

  // Update the position of the dragged component
  curDragItem.item.renderLeft = event.clientX + curDragItem.item.offsetX;
  curDragItem.item.renderTop = event.clientY + curDragItem.item.offsetY;
  curDragItem.mouseX = event.clientX;
  curDragItem.mouseY = event.clientY;

  // Highlight the cells below the new position of the component
  const newPos = calculateTopLeftCell(new Vector2(event.clientX, event.clientY));
  if (newPos == null) return;

  highlightHoveredCells(newPos, size, true);
}

/**
 * Called when the mouse button is unpressed
 *
 * @param event Given from the event handler
 */
function drop(event: MouseEvent): void {
  // If it is not the left mouse button that has been released then return
  if (event.button != 0) { return }

  // Reset the cursor
  (document.querySelector("#machine") as HTMLDivElement)!.style.cursor = "auto";

  // If no item is being dragged then return
  if (curDragItem.item == null || !startedDragging) {
    canStartDragging = false;
    return
  }

  // Prevent the event from being passed higher up the DOM tree
  event.stopImmediatePropagation();

  // Reset all the flags used for dragging
  canStartDragging = false;
  startedDragging = false;

  const item = curDragItem.item;
  item.classList.remove("dragged");

  // Calculate the new top left position for the component
  let topLeft = calculateTopLeftCell(new Vector2(event.clientX, event.clientY));
  const size = item.getSize();

  if (topLeft == null || size == null) return;

  // Remove the highlighting below the component
  highlightHoveredCells(topLeft, size, false);

  // Delete element because it is out of bounds
  {
    const grid = document.getElementById("grid") as HTMLDivElement;

    let worldTopLeft = worldToScreenPosition(new Vector2(topLeft.x * GRID_SIZE, topLeft.y * GRID_SIZE));

    if (worldTopLeft.x > grid.clientWidth) {
      deleteComponent(item);
      item.remove();
      curDragItem.item = null;
      if (item.shouldLockCells) {
        setCells(topLeft, size, false);
      }
      return;
    }
  }

  // Check whether or not the item being dragged can be placed
  {
    if ((item.shouldLockCells && !allValid(topLeft, size)) || (!item.shouldLockCells && !validShaft(topLeft, item))) {
      if (!item.hasBeenPlaced) {
        item.remove();
        curDragItem.item = null;
        return;
      }

      topLeft.x = Number(item.previousLeft);
      topLeft.y = Number(item.previousTop);
    }



    if (item.shouldLockCells) {
      setCells(topLeft, size, true);
    }
  }

  // Set the new fields for the component
  item.hasBeenPlaced = true;
  item.left = topLeft.x;
  item.top = topLeft.y;
  let converted = worldToScreenPosition(new Vector2(topLeft.x * GRID_SIZE, topLeft.y * GRID_SIZE));
  item.renderLeft = converted.x;
  item.renderTop = converted.y;

  curDragItem.item = null;

  let e = new CustomEvent("placecomponent");
  document.dispatchEvent(e);
}
