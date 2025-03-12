import { css, LitElement, svg, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";

import styles from "../../styles/IntegratorComponent.css?inline";
import svgstyles from "../../styles/SVGElement.css?inline";

@customElement("integrator-component")
export class IntegratorComponentElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
    ${unsafeCSS(svgstyles)}
  `;

  centre_x = 75; // centre x of turntable = 75
  centre_y = 50; // centre y of turntable = 50

  @property({ type: Number })
  radius = 25; // 25
  @property({ type: Number })
  theta = 0;

  @property({ type: Number })
  value: number = 0;
  @property({ type: Number })
  current_value: number = 0;

  /**
   * Set the current offset of the output wheel
   */
  set_value(value: number): void {
    this.value = value;
  }

  /**
   * Map from in_min<->in_max to out_min<->out_max
   */
  map_range(number: number, in_min: number, in_max: number, out_min: number, out_max: number): number {
    return (number - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  }

  render() {
    let x = this.centre_x + this.radius * Math.cos(this.theta);
    let y = this.centre_y + this.radius * Math.sin(this.theta);

    let value = 1 / (1 + Math.exp(-this.value / 5.));
    let shaftY = this.map_range(value, 0, 1, 82, 18);

    return svg`
      <svg
        xmlns="https://www.w3.org/2000/svg"
        width="105" height="60"
        viewBox="26 0 172 100"
      >
        <rect x="24" y="1" width="175" height="98" class="stroke-fg fill-bg" stroke-width="2" rx="5" />
        <rect x="115" y="30" width="20" height="40" fill="none" class="stroke-fg" stroke-width="2" rx="2" />
        <circle cx="75" cy="50" r="38" fill="none" class="stroke-fg" stroke-width="2" />
        <circle cx="${x}" cy="${y}" class="stroke-fg" r="2" stroke-width="2" />

        <line x1="60" y1="${shaftY}" x2="90" y2="${shaftY}" class="stroke-fg" stroke-width="2" stroke-linecap="round" />
        <line x1="75" y1="${shaftY}" x2="75" y2="0" class="stroke-fg" stroke="black" stroke-width="2" stroke-linecap="round" />
        <line x1="125" y1="30" x2="125" y2="0" class="stroke-fg" stroke="black" stroke-width="2" stroke-linecap="round" />
        <line x1="175" y1="30" x2="175" y2="0" class="stroke-fg" stroke="black" stroke-width="2" stroke-linecap="round"/>

        <polygon class="fill-fg stroke-fg" stroke-width="2" stroke-linejoin="round" points="170,20 175,30 180,20" />

        ${[-2, -1, 0, 1, 2].map(i => svg`
          <line
            class="stroke-fg"
            x1="115"
            y1="${52 + i * 7}"
            x2="135"
            y2="${48 + i * 7}"
            stroke-width="2"
            stroke-linecap="round"
          />
        `)}
      </svg>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "integrator-component": IntegratorComponentElement;
  }
}
