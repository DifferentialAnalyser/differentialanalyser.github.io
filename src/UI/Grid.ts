import { DraggableComponentElement } from "./DraggableElement";
import { updateArrows } from "./SelectShaft";
import { machine } from "./Constants.ts"
import Vector2 from "./Vector2";
import { startedDragging } from "./Drag.ts";
import { closeAllPopups } from "./Popups.ts";

export let GRID_SIZE: number = 50;

const HIGHLIGHT_CELL: string = "highlighted-cell";

// String is json version of Vector2
// Representation of the current locked cells and highlighted cells
let lockedCells: Set<string> = new Set<string>;
let currentCells: Map<string, HTMLDivElement> = new Map<string, HTMLDivElement>;

let canStartScreenDragging: boolean = false;
export let screenDragging: boolean = false;

let screenOffset: Vector2;
let initialDragLocation: Vector2;
let previousX: number;
let previousY: number;
let mouseButton: number;

let touches: { [key: number]: Touch } = {};

const draggingStartLimit: number = 10.;
const sensitivity: number = 1.0;
const scroll_sensitivity: number = 0.02;

/**
 * Create a cell at a given row and column in the world
 *
 * @param col The column in which the div should be created
 * @param row The row in which the div should be created
 */
function createCell(col: number, row: number): HTMLDivElement {
  const comp = document.createElement("div");

  comp.classList.add("grid-cell");
  comp.id = new Vector2(col, row).toString();

  let top_left = worldToScreenPosition(new Vector2(col * GRID_SIZE, row * GRID_SIZE));
  comp.style.left = top_left.x + "px";
  comp.style.top = top_left.y + "px";

  comp.style.width = GRID_SIZE + "px";
  comp.style.aspectRatio = "1";

  comp.dataset.col = "" + col;
  comp.dataset.row = "" + row;
  comp.dataset.filled = "0";

  return comp;
}

/**
 * Setup the event callbacks that are needed for screen dragging
 */
export function setupScreenHooks(): void {
  // Disable screen wide context menu
  document.addEventListener("contextmenu", e => {
    e.preventDefault();
  })

  // If we are able to start dragging then set flags
  machine.addEventListener("mousedown", e => {
    if (!canStartScreenDragging && !startedDragging) {
      initialDragLocation = new Vector2(e.clientX, e.clientY);
      canStartScreenDragging = true;
      mouseButton = e.button;

      (document.querySelector("#machine") as HTMLDivElement)!.style.cursor = "grabbing";
    }
  })

  // If we are currently dragging then stop
  document.addEventListener("mouseup", e => {
    if (e.button == mouseButton) {
      canStartScreenDragging = false;
      screenDragging = false;

      (document.querySelector("#machine") as HTMLDivElement)!.style.cursor = "grab";
    }
  })

  screenOffset = new Vector2(0, 0);

  document.addEventListener("mousemove", e => {
    dragScreen(e.clientX, e.clientY);
  });

  // The mouse has been scrolled so resize all the components
  machine.addEventListener("wheel", e => {
    let offset_x = e.clientX - screenOffset.x;
    let offset_y = e.clientY - screenOffset.y;
    let start_grid_size = GRID_SIZE;

    GRID_SIZE -= e.deltaY * scroll_sensitivity;
    GRID_SIZE = Math.min(Math.max(GRID_SIZE, 15), 150);

    let scale = GRID_SIZE / start_grid_size;
    offset_x *= scale;
    offset_y *= scale;

    updateArrows();

    setScreenOffset(new Vector2(e.clientX - offset_x, e.clientY - offset_y));
  })

  // Touches on the touchscreen
  machine.addEventListener("touchstart", e => {
    switch (e.touches.length) {
      case 1:
        // Only a single point so start screen dragging
        initialDragLocation = new Vector2(e.touches[0].clientX, e.touches[0].clientY);
        canStartScreenDragging = true;
        break;
      case 2:
        // Two touch points so setup the initial positions
        touches[e.touches[0].identifier] = e.touches[0];
        touches[e.touches[1].identifier] = e.touches[1];
        break;
    }
  })

  // The touchscreen points have moved
  machine.addEventListener("touchmove", e => {
    switch (e.touches.length) {
      case 1:
        // Touchpoint has moved so drag the screen
        dragScreen(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
        break;
      case 2:
        // Touchpoints have moved so calculate the difference and scale accordingly
        const prevTouch0 = touches[e.touches[0].identifier];
        const prevTouch1 = touches[e.touches[1].identifier];
        const touch0 = e.touches[0];
        const touch1 = e.touches[1];
        const centerX = (prevTouch0.clientX + touch0.clientX) / 2;
        const centerY = (prevTouch1.clientY + touch1.clientY) / 2;

        const dx0 = touch0.clientX - centerX;
        const pdx0 = prevTouch0.clientX - centerX;
        const dy0 = touch0.clientY - centerY;
        const pdy0 = prevTouch0.clientY - centerY;

        const dx1 = touch1.clientX - centerX;
        const pdx1 = prevTouch1.clientX - centerX;
        const dy1 = touch1.clientY - centerY;
        const pdy1 = prevTouch1.clientY - centerY;

        const mag0 = (dx0 * dx0) + (dy0 * dy0);
        const prevmag0 = (pdx0 * pdx0) + (pdy0 * pdy0);

        const mag1 = (dx1 * dx1) + (dy1 * dy1);
        const prevmag1 = (pdx1 * pdx1) + (pdy1 * pdy1);

        const delta = ((mag0 - prevmag0) + (mag1 - prevmag1)) * -scroll_sensitivity;

        let offset_x = centerX - screenOffset.x;
        let offset_y = centerY - screenOffset.y;
        let start_grid_size = GRID_SIZE;

        GRID_SIZE -= delta * scroll_sensitivity;
        GRID_SIZE = Math.min(Math.max(GRID_SIZE, 15), 150);

        let scale = GRID_SIZE / start_grid_size;
        offset_x *= scale;
        offset_y *= scale;

        setScreenOffset(new Vector2(centerX - offset_x, centerY - offset_y));

        touches[e.touches[0].identifier] = e.touches[0];
        touches[e.touches[1].identifier] = e.touches[1];

        e.preventDefault();
        break;
    }
  }, { passive: false });

  // Touchpoints ended so stop dragging
  machine.addEventListener("touchend", e => {
    switch (e.touches.length) {
      case 0:
        canStartScreenDragging = false;
        screenDragging = false;
        break;
    }
  })
}

/**
 * @returns The current screen offset
 */
export function getScreenOffset(): Vector2 {
  return screenOffset;
}

/**
 * Reset the screen offset and update all components
 */
export function resetScreenOffset(): void {
  screenOffset = new Vector2(0, 0);
  updateComponentPositions();
}

/**
 * Set the screen offset and update all components
 *
 * @param v The new screen offset
 */
export function setScreenOffset(v: Vector2): void {
  screenOffset = v;
  updateComponentPositions();
}

/**
 * Convert from a screen position to the world position
 *
 * @param pos The screen position that needs to be converted
 * @returns The world position
 */
export function screenToWorldPosition(pos: Vector2): Vector2 {
  let ret = new Vector2(0, 0);
  ret.x = pos.x - screenOffset.x;
  ret.y = pos.y - screenOffset.y;

  return ret;
}

// Convert from world coordinates (0,0 in the grid) to the screen coordinates.
/**
 * Convert from world coordinates to screen coordinates
 *
 * @param pos The world position that should be converted into screen position
 * @returns The screen position
 */
export function worldToScreenPosition(pos: Vector2): Vector2 {
  let ret = new Vector2(0, 0);
  ret.x = pos.x + screenOffset.x;
  ret.y = pos.y + screenOffset.y;

  return ret;
}

/**
 * If permitted, change the screen offset to show dragging of the screen
 *
 * @param x The current mouse X
 * @param y The current mouse Y
 */
function dragScreen(x: number, y: number): void {
  // If we cannot start dragging then return
  if (!canStartScreenDragging) return;

  // Close any popups that are open and update the position of shaft arrows
  updateArrows();
  closeAllPopups();

  // If we are not currently dragging then check if we have moved sufficiently 
  // far from the initial position to then start dragging
  if (!screenDragging) {
    let dragDistance = Math.pow(x - initialDragLocation.x, 2.) + Math.pow(y - initialDragLocation.y, 2.);
    if (dragDistance < Math.pow(draggingStartLimit, 2.)) return;

    screenDragging = true;

    previousX = x;
    previousY = y;
  }

  // Calculate the difference between the current position and previous position
  // and update the offset 
  let diffX = (x - previousX) * sensitivity;
  let diffY = (y - previousY) * sensitivity;

  screenOffset.x += diffX
  screenOffset.y += diffY;

  // Update all component positions
  updateComponentPositions();

  previousX = x;
  previousY = y;
}

/**
 * Update the position of all placed components
 */
function updateComponentPositions(): void {
  let components = document.getElementsByClassName("placed-component");
  for (let i = 0; i < components.length; i++) {
    const component = components[i] as DraggableComponentElement;
    let componentPos = component.getPosition();
    component.renderLeft = componentPos.x * GRID_SIZE + screenOffset.x;
    component.renderTop = componentPos.y * GRID_SIZE + screenOffset.y;
  }
}

/**
 * @returns If we are currently dragging the screen
 */
export function currentlyDragging() { return screenDragging; }

/**
 * Apply a function to all cells located between topLeft and topLeft + size
 *
 * @param topLeft The top left cell of the range that should be checked
 * @param size The size of the rectangle over all cells
 * @param func The function that should be applied to each function
 */
// Perform a function all all cells between (topleft.x, topleft.y) -> (topleft.x + size.x, topleft.y + size.y)
function mapCells(topLeft: Vector2, size: Vector2, func: (e: Vector2) => void): void {
  for (let y = 0; y < size.y; y++) {
    for (let x = 0; x < size.x; x++) {
      const pos = new Vector2(topLeft.x + x, topLeft.y + y);

      func(pos);
    }
  }
}

/**
 * Check if none of the cells located between topLeft and topLeft + size have been locked
 * @param topLeft The top left cell of the range that should be checked
 * @param size The size of the rectangle over the range of cells
 *
 * @returns Whether all the cells in the region are unlocked or not
 */
export function allValid(topLeft: Vector2, size: Vector2): boolean {
  let valid: boolean = true;
  const func = (pos: Vector2) => {
    if (lockedCells.has(JSON.stringify(pos))) {
      valid = false;
    }
  }

  mapCells(topLeft, size, func);

  return valid;
}

/**
 * Check if any shaft of the same type (horizontal or vertical) is in the given range
 *
 * @param topLeft The top left cell of the region
 * @param shaft The shaft that should be used to check against
 * @returns If another shaft of the same type overlaps the provided shaft
 */
export function validShaft(topLeft: Vector2, shaft: DraggableComponentElement): boolean {
  const size = shaft.getSize();
  if (shaft.componentType == "vShaft") {
    return !rangeContainsVShaft(topLeft, size, shaft);
  } else if (shaft.componentType == "hShaft") {
    return !rangeContainsHShaft(topLeft, size, shaft);
  } else { // Label
    return true;
  }
}

/**
 * Set all the cells in a region to either be locked or unlocked
 *
 * @param topLeft The top left cell of the region
 * @param size The size of the region
 * @param fill Whether or not the cells should be locked or unlocked
 */
export function setCells(topLeft: Vector2, size: Vector2, fill: boolean): void {
  const func = (pos: Vector2) => {
    const posStr = JSON.stringify(pos);
    if (fill) {
      if (!lockedCells.has(posStr)) {
        lockedCells.add(posStr);
      }
    } else {
      if (lockedCells.has(posStr)) {
        lockedCells.delete(posStr);
      }
    }
  }

  mapCells(topLeft, size, func);
}

// Create/delete cells in a given range
/**
 * Create or delete highlight cells in a provided range
 *
 * @param topLeft The top left cell of the region
 * @param size The size of the region
 * @param highlight Whether or not the cells in the region should be created or deleted
 */
export function highlightHoveredCells(topLeft: Vector2, size: Vector2, highlight: boolean): void {
  mapCells(topLeft, size, (pos: Vector2) => {
    const posStr = JSON.stringify(pos);
    if (highlight) {
      const cell = createCell(pos.x, pos.y);
      cell.classList.add(HIGHLIGHT_CELL);
      document.getElementById("grid")!.appendChild(cell);
      currentCells.set(posStr, cell);
    } else {
      if (currentCells.has(posStr)) {
        currentCells.get(posStr)?.remove();
        currentCells.delete(posStr);
      }
    }
  });
}

/**
 * Check if any cells located below shafts match a predicate
 *
 * @param shaftClass The type of the shaft (Horizontal or vertical)
 * @param checkingShaft The shaft that is being used to see if it overlaps
 * @param predicate The predicate used to check the overlap
 */
function rangeContainsShaft(shaftClass: string, checkingShaft: DraggableComponentElement, predicate: (pos: Vector2, size: Vector2) => boolean): boolean {
  const shafts = document.querySelectorAll(`.${shaftClass}`);

  for (let i = 0; i < shafts.length; i++) {
    const shaft = shafts[i] as DraggableComponentElement;
    if (checkingShaft != shaft && predicate(shaft.getPosition(), shaft.getSize())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a given range contains any cells below a different horizontal shaft
 * 
 * @param pos The top left cell of the region
 * @param size The size of the region
 * @param shaft The shaft that is being checked against overlap
 */
export function rangeContainsHShaft(pos: Vector2, size: Vector2, shaft: DraggableComponentElement): boolean {
  return rangeContainsShaft("hShaft", shaft, (sP, sS) => {
    return (sP.y == pos.y) && (
      (pos.x <= sP.x + sS.x - 1 && pos.x + size.x - 1 >= sP.x)
    );
  });
}

/**
 * Check if a given range contains any cells below a different vertical shaft
 * 
 * @param pos The top left cell of the region
 * @param size The size of the region
 * @param shaft The shaft that is being checked against overlap
 */
export function rangeContainsVShaft(pos: Vector2, size: Vector2, shaft: DraggableComponentElement): boolean {
  return rangeContainsShaft("vShaft", shaft, (sP, sS) => {
    return (sP.x == pos.x) && (
      (pos.y <= sP.y + sS.y - 1 && pos.y + size.y - 1 >= sP.y)
    );
  });
}
