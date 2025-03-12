import { DraggableComponentElement } from "./DraggableElement.ts";
import { startedDragging } from "./Drag.ts";
import Vector2 from "./Vector2.ts";
import { GRID_SIZE } from "./Grid.ts"
import { updateShaftLength } from "./Popups.ts";
import { machine } from "./Constants.ts";

const SELECTED_SHAFT = "selected";
const ARROW_PADDING = 0.05;

let selectedItem: DraggableComponentElement | null = null;
let currentArrow: HTMLImageElement | null = null;

let dragging = false;
let startPos: Vector2;

let negativeArrow: HTMLImageElement;
let positiveArrow: HTMLImageElement;

/**
 * Setup event handlers that are needed for shaft selection
 */
export function setupSelectHooks() {
  machine.addEventListener("click", endSelect);

  // Find and store the arrows used for positive and negative size changes
  negativeArrow = document.querySelector("#negativeArrow")! as HTMLImageElement;
  positiveArrow = document.querySelector("#positiveArrow")! as HTMLImageElement;

  // Setup the events on these two arrows
  negativeArrow.addEventListener("mousedown", startDrag);
  positiveArrow.addEventListener("mousedown", startDrag);
  negativeArrow.addEventListener("mouseup", endDrag);
  positiveArrow.addEventListener("mouseup", endDrag);

  negativeArrow.addEventListener("dragstart", e => e.preventDefault());
  positiveArrow.addEventListener("dragstart", e => e.preventDefault());

  // Setup events on the document
  machine.addEventListener("mousemove", moveDrag, true);
  machine.addEventListener("mouseup", endDrag);
}

/**
 * Mouse has been pressed down on an arrow so start dragging, aslong as a shaft is selected
 *
 * @param e Event provided from the event Handler
 */
function startDrag(e: MouseEvent): void {
  if (e.button != 0) return;
  if (!selectedItem) return;
  currentArrow = e.currentTarget as HTMLImageElement;
  dragging = true;

  startPos = new Vector2(e.clientX, e.clientY);
  (document.querySelector("#machine") as HTMLDivElement)!.style.cursor = "move";
  currentArrow.style.cursor = "move";
}

/**
 * The mouse has moved in the document so check to see if any of the arrows should 
 * be resized
 *
 * @param e Event provided from the event Handler
 */
function moveDrag(e: MouseEvent): void {
  // If we have not started then ignore the event
  if (!dragging) return;

  let negativeDistance = 0;
  let positiveDistance = 0;
  // Check if the mouse has moved sufficiently far enough to either adjust the positive
  // or negative drag distance for a vertical or horizontal shaft. ENsure that the current
  // amount of dragging is used if the mouse moved quickly
  if (selectedItem!.componentType == "hShaft") {
    if (Math.abs(e.clientX - startPos.x) >= GRID_SIZE * 0.6) {
      negativeDistance = (currentArrow!.id == "negativeArrow") ? (startPos.x - e.clientX) : 0
      positiveDistance = (currentArrow!.id == "positiveArrow") ? (e.clientX - startPos.x) : 0
      if (!(selectedItem!.width == 1 && (negativeDistance < 0 || positiveDistance < 0))) {
        const dist = Math.round(Math.max(Math.abs(positiveDistance), Math.abs(negativeDistance)) / GRID_SIZE);
        if (positiveDistance < 0 || negativeDistance > 0) {
          startPos.x -= (GRID_SIZE * dist);
        } else {
          startPos.x += (GRID_SIZE * dist);
        }
      }
    }
  } else {
    if (Math.abs(e.clientY - startPos.y) >= GRID_SIZE * 0.6) {
      negativeDistance = (currentArrow!.id == "negativeArrow") ? (startPos.y - e.clientY) : 0
      positiveDistance = (currentArrow!.id == "positiveArrow") ? (e.clientY - startPos.y) : 0
      if (!(selectedItem!.height == 1 && (negativeDistance < 0 || positiveDistance < 0))) {
        const dist = Math.round(Math.max(Math.abs(positiveDistance), Math.abs(negativeDistance)) / GRID_SIZE);
        if (positiveDistance < 0 || negativeDistance > 0) {
          startPos.y -= (GRID_SIZE * dist);
        } else {
          startPos.y += (GRID_SIZE * dist);
        }
      }
    }
  }

  // Update the shaft length and update the position of the arrows
  if (negativeDistance != 0 || positiveDistance != 0) {
    updateShaftLength(selectedItem!, Math.round(negativeDistance / GRID_SIZE), Math.round(positiveDistance / GRID_SIZE))
    updateArrows();
  }
}

/**
 * Mouse has been lifted so stop dragging on the arrow
 */
function endDrag(_e: MouseEvent): void {
  if (!dragging) return;

  dragging = false;

  (document.querySelector("#machine") as HTMLDivElement)!.style.cursor = "auto";
  currentArrow!.style.cursor = "pointer";

  currentArrow = null;
}

/**
 * Update the position of the dragging arrows depending on the current
 * shaft that is being dragged
 */
export function updateArrows(): void {
  if (!selectedItem) return;

  const pos = selectedItem.getScreenPosition();
  const size = selectedItem.getScreenSize();

  if (selectedItem.componentType == "hShaft") {
    negativeArrow.style.rotate = "-90deg";
    positiveArrow.style.rotate = "90deg";

    negativeArrow.style.left = `${pos.x - negativeArrow.clientWidth - ARROW_PADDING * GRID_SIZE}px`;
    negativeArrow.style.top = `${pos.y + size.y / 2 - negativeArrow.clientHeight / 2}px`;
    positiveArrow.style.left = `${pos.x + size.x + ARROW_PADDING * GRID_SIZE}px`;
    positiveArrow.style.top = `${pos.y + size.y / 2 - positiveArrow.clientHeight / 2}px`;
  } else {
    negativeArrow.style.rotate = "0deg";
    positiveArrow.style.rotate = "180deg";

    negativeArrow.style.left = `${pos.x + size.x / 2 - negativeArrow.clientWidth / 2}px`;
    negativeArrow.style.top = `${pos.y - negativeArrow.clientHeight - ARROW_PADDING * GRID_SIZE}px`;
    positiveArrow.style.left = `${pos.x + size.x / 2 - positiveArrow.clientWidth / 2}px`;
    positiveArrow.style.top = `${pos.y + size.y + ARROW_PADDING * GRID_SIZE}px`;
  }

  negativeArrow.style.width = `${GRID_SIZE / 2}px`;
  negativeArrow.style.height = `${GRID_SIZE / 2}px`;
  positiveArrow.style.width = `${GRID_SIZE / 2}px`;
  positiveArrow.style.height = `${GRID_SIZE / 2}px`;
}

/**
 * A shaft was clicked on so select it, provided we are not currently dragging
 *
 * @param event Provided from the event handler
 */
export function selectShaft(event: MouseEvent): void {
  // Check if the left mouse button was pressed, if not return
  if (event.button != 0) { return }
  // Check if we are not dragging
  if (startedDragging) return;

  // Clear the currently selected arrow
  clearSelect();

  // Set the clicked shaft as the selected shaft
  const currentTarget = event.currentTarget as DraggableComponentElement;
  selectedItem = currentTarget;

  selectedItem.classList.add(SELECTED_SHAFT);

  // Update the arrow positions
  updateArrows();

  // Set the arrows to be visible
  negativeArrow.style.visibility = "visible";
  positiveArrow.style.visibility = "visible";

  // Prevent the event being passed up the DOM
  event.stopPropagation();
}

/**
 * Clear the currently selected shaft and hide the arrows
 */
export function clearSelect(): void {
  if (!selectedItem) return;

  selectedItem.classList.remove(SELECTED_SHAFT);

  selectedItem = null;

  negativeArrow.style.visibility = "hidden";
  positiveArrow.style.visibility = "hidden";
}

/**
 * Check if the left mouse has been pressed and if so clear the current seleted
 * shaft
 */
export function endSelect(event: MouseEvent): void {
  if (event.button != 0) return;
  clearSelect();
}
