import { css, LitElement, svg, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import styles from "../../styles/SVGElement.css?inline";

@customElement("multiplier-component")
export class MultiplierComponentElement extends LitElement {
  static styles = css`${unsafeCSS(styles)}`;

  @property({ type: Number })
  factor: number = 0;

  @property({ type: Number })
  value: number = 0;

  @property({ type: Number })
  max_value: number = 1;

  /**
   * Set the current position of the multiplier
   */
  set_value(value: number): void {
    this.max_value = Math.max(this.max_value, Math.abs(value));
    this.value = value;
  }

  /**
   * Renormalize the range of the position
   */
  renormalize(): void {
    if (Math.abs(this.value) <= 1) {
      this.max_value = 1;
    }
    else {
      this.max_value = Math.abs(2 * this.value);
    }
  }

  // Map a value from between one range to another
  map_range(number: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return (number - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }

  render() {
    const radius = 40;
    let angle = Math.atan(this.factor);
    let x_offset = Math.cos(angle) * radius;
    let y_offset = Math.sin(angle) * radius;

    let target_radius = this.map_range(this.value, -this.max_value, this.max_value, 10, -10);
    let arrow_x = -target_radius * Math.cos(angle) + 50;
    let arrow_y = target_radius * Math.sin(angle) + 50

    return svg`
      <svg
        xmlns="https://www.w3.org/2000/svg"
        width="150" height="150"
        viewBox="0 0 150 100"
        style="width:100%;height:100%"
      >
        <rect class="fill-bg stroke-fg" x="1" y="1" width="148" height="98" stroke-width="2" rx=5 />
        <circle class="stroke-fg" cx="50" cy="50" r="40" fill="none" stroke-width="2" />
        <line
          class="stroke-fg"
          x1="${50 - x_offset}"
          y1="${50 + y_offset}"
          x2="${50 + x_offset}"
          y2="${50 - y_offset}"
          stroke-width="2" linecap="round"
        />
        <line class="stroke-fg" x1="75" y1="0" x2="75" y2="75" stroke-width="2" linecap="round" />
        <line class="stroke-fg" x1="${arrow_x}" y1="${arrow_y}" x2="75" y2="${arrow_y}" troke-width="2" linecap="round" />
        <polygon class="stroke-fg fill-fg" stroke-width="2" stroke-linejoin="round" points="${arrow_x},${arrow_y} ${arrow_x + 10},${arrow_y - 5} ${arrow_x + 10},${arrow_y + 5}" />
        <line class="stroke-fg" x1="125" y1="0" x2="125" y2="50" stroke-width="2" linecap="round" />
        <polygon class="stroke-fg fill-fg" stroke-width="2" stroke-linejoin="round" points="120,50 125,60 130,50" />
        <line class="stroke-fg" fill="fill-fg" stroke-width="2" x1="25" y1="0" x2="25" y2="19"/>
      </svg>
    `;
  }
}
