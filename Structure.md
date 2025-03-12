<pre>
Project/
├── examples/                       (Set of example configurations)
├── icons/                          (Set of icons used in the website)
├── src/
│   ├── UI/
│   │   ├── Components.ts                   (Constructors for all components)
│   │   ├── Constants.ts                    (Used for globally instantiated constants)
│   │   ├── CrossConnectComponentElement.ts (Rendering for the cross connect component)
│   │   ├── CustomVariablesElement.ts       (Rendering for the constants section in the UI)
│   │   ├── DialComponentElement.ts         (Properties for rendering and animating dial components)
│   │   ├── DifferentialComponentElement.ts (Properties for rendering differentials)
│   │   ├── Drag.ts                         (Used for dragging and dropping of all placed components)
│   │   ├── DraggableElement.ts             (Wrapper for information required for draggable components)
│   │   ├── Drawable.ts                     (Interface for graphs)
│   │   ├── GearPairComponentElement.ts     (Properties for rendering gear pairs)
│   │   ├── Graph.ts                        (Used for rendering the gantries on function and output tables)
│   │   ├── GraphElement.ts                 (Stores information required to render points)
│   │   ├── Grid.ts                         (Used to ensure that no pieces overlap and to allow for screen dragging)
│   │   ├── IntegratorComponent.ts          (Properties for rendering and animation integrators)
│   │   ├── MotorComponent.ts               (Properties for rendering motors)
│   │   ├── MultiplierComponentElement.ts   (Properties for rendering and animation multipliers)
│   │   ├── Popups.ts                       (Used to setup and open all popups)
│   │   ├── SelectShaft.ts                  (Used to select a shaft and allow for resizing)
│   │   ├── ShaftElement.ts                 (Properties for rendering shafts)
│   │   └── Vector2.ts                      (A wrapper around two values)
│   ├── core/
│   │   ├── CrossConnect.ts
│   │   ├── Device.ts                       (Interface for all core components to inherit from)
│   │   ├── Dial.ts
│   │   ├── Differential.ts
│   │   ├── FunctionTable.ts
│   │   ├── GearPair.ts
│   │   ├── Integrator.ts
│   │   ├── Main.ts                         (Constructs the simulation from a config and strts execution)
│   │   ├── Motor.ts
│   │   ├── Multiplier.ts
│   │   ├── OutputTable.ts
│   │   └── Shaft.ts
│   ├── expr/
│   │   ├── Expression.ts                   (Parses an expression into simpler operations)
│   │   ├── ParsedExpression.ts             (Representation of simpler operations)
│   │   ├── Parser.ts                       (Parser for an expression)
│   │   └── builtins.ts                     (List of builtin functions)
│   ├── ConfigError.ts                  (Types of errors that could come from incorrect config)
│   ├── GenerateConfigFromUI.ts         (Generate a json config from components placed in UI)
│   ├── Lifecycle.ts                    (Main control flow of website controlled here)
│   ├── SimulatorHandler.ts             (Wrapper around core simulator)
│   ├── Undo.ts                         (Functionality to allow for undo operations)
│   ├── config.ts                       (Set of json object types for config)
│   ├── examples.ts                     (List of builtin examples)
│   └── index.ts                        (Entrypoint of website)
├── styles/
│   ├── CustomVariables.css             (Styling for custom variable component)
│   ├── DraggableElement.css            (Styling for misconfigured components)
│   ├── GraphElement.css                (Styling for graphs)
│   ├── IntegratorComponent.css         (Custom styling for integrator)
│   ├── SVGElement.css                  (Classes for SVG when misconfigured)
│   ├── components.css                  (Styling for components)
│   ├── fullscreen.css                  (Styling for fullscreen elements)
│   ├── grid.css                        (Styling for grid elements)
│   ├── popups.css                      (Styling for popups)
│   ├── style.css                       (Main style sheet)
│   └── tooltip.css                     (Styling for tooltips)
└── tests/                          (Set of tests for core engine)
</pre>
