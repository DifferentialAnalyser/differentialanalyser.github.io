import { css, LitElement, svg, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import styles from "../../styles/SVGElement.css?inline";

@customElement("cross-connect-component")
export class CrossConnectComponentElement extends LitElement {
  static styles = css`${unsafeCSS(styles)}`;

  @property({ type: Boolean })
  inverted: boolean = false;

  render() {
    return svg`
      <svg
        xmlns="https://www.w3.org/2000/svg"
        width="50" height="50"
        viewBox="0 0 50 50"
        style="width:100%;height:100%;display:block"
      >
      <circle class="fill-fg stroke-fg" cx="25" cy="25" r="7" stroke="black"/>
      <rect class="fill-fg stroke-fg" x="13" width="24" y="22" height="6" stroke="black" rx="1"/>
      <rect class="fill-fg stroke-fg" x="22" width="6" y="13" height="24" stroke="black" rx="1"/>
        ${this.inverted ?
        svg`<circle class="stroke-fg" cx="25" cy="25" r="13" stroke-width="2" fill="none" />`
        : ""}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cross-connect-component": CrossConnectComponentElement;
  }
}
