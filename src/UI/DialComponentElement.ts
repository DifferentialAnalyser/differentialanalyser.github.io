import { LitElement, svg } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("dial-component")
export class DialComponentElement extends LitElement {
  @property({ type: Number })
  count: number = 0;

  tooltip: HTMLSpanElement | undefined;

  @property({ type: Number })
  rotation = 0;

  /**
   * Encode the current rotation to be a fixed number of digits
   * If the encoding includes an e, reduce the precision to ensure it still fits
   *
   * @returns The string representation of the current rotation
   */
  getValue(): string {
    let value = this.count.toPrecision(5);
    if (value.includes("e")) {
      value = this.count.toPrecision(2);
    }

    return value;
  }

  /**
   * Update the tooltip text if it exists
   */
  updateTooltip(): void {
    if (!this.tooltip) return;

    this.tooltip.textContent = `${this.count.toPrecision(6)}`;
  }

  render() {
    this.updateTooltip();

    // Calculate how much the dial should be rotated and calculate the x and y coordinates for this
    let angle = 2 * Math.PI * (this.rotation % 1) - Math.PI / 2;

    const radius = 10;
    let x = radius * Math.cos(angle) + 25;
    let y = radius * Math.sin(angle) + 25;

    return svg`
      <svg
        xmlns="https://www.w3.org/2000/svg"
        width="100" height="50"
        viewBox="0 0 50 50"
        style="width:100%;height:100%"
      >
        <rect x="5" y="10" width="40" height="30" fill="white" stroke="black" stroke-width="2" rx=5 />
        <circle cx="${x}" cy="${y}" class="stroke-fg" r="2" stroke-width="2" opacity="0.4"/>
        <circle cx="25" cy="25" stroke="black" r="${radius}" stroke-width="4" opacity="0.2" fill="none"/>
        
        <text text-anchor="middle" dominant-baseline="middle" y="50%" x="50%" fill="black" font-size="8">${this.getValue().substring(0, 7)}</text>
      </svg>
        `
  }
}
